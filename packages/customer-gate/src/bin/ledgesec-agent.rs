//! Follow the nginx log and post observation batches. The request is not changed.

#![forbid(unsafe_code)]

use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::process::ExitCode;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use ledgesec_gate::{
    admit, batch_body, event_json, ingest_url, mac_hex, parse_line, product_version, LOG_PATH,
};

const RING_MAX: usize = 2000;

fn main() -> ExitCode {
    if std::env::args().any(|arg| arg == "--version" || arg == "-V") {
        println!("{}", product_version());
        return ExitCode::SUCCESS;
    }
    let env = read_env();
    let site_id = env_get(&env, "LEDGESEC_SITE_ID");
    let secret = env_get(&env, "LEDGESEC_INGEST_SECRET");
    if site_id.is_empty() || secret.is_empty() {
        eprintln!("ledgesec-agent: LEDGESEC_SITE_ID and LEDGESEC_INGEST_SECRET are required");
        return ExitCode::from(1);
    }
    let edge_id = {
        let value = env_get(&env, "LEDGESEC_EDGE_ID");
        if !value.is_empty() {
            value
        } else {
            let name = hostname();
            if name.is_empty() { "module".to_string() } else { name }
        }
    };
    let url = ingest_url(&env_get(&env, "LEDGESEC_INGEST_URL"));
    let percent = env_get(&env, "LEDGESEC_SAMPLE_RATE")
        .parse::<u8>()
        .unwrap_or(1)
        .min(100);
    let path = {
        let value = env_get(&env, "LEDGESEC_LOG");
        if value.is_empty() {
            PathBuf::from(LOG_PATH)
        } else {
            PathBuf::from(value)
        }
    };
    eprintln!(
        "ledgesec-agent {}: reading {} and posting {url}",
        product_version(),
        path.display()
    );
    let mut follower = Follower::new(path);
    let mut queue: Vec<String> = Vec::new();
    let mut last_flush = Instant::now();
    loop {
        match follower.next_line() {
            Some(line) => {
                if let Some(hit) = parse_line(&line) {
                    let roll = roll();
                    if let Some(sampled) = admit(hit.status, percent, roll) {
                        queue.push(event_json(&hit, sampled));
                        if queue.len() > RING_MAX {
                            let drop = queue.len() - RING_MAX;
                            queue.drain(..drop);
                        }
                        if !sampled || queue.len() >= 1000 {
                            flush(&url, &secret, &site_id, &edge_id, &mut queue);
                            last_flush = Instant::now();
                        }
                    }
                }
            }
            None => {
                if !queue.is_empty() && last_flush.elapsed() >= Duration::from_secs(5) {
                    flush(&url, &secret, &site_id, &edge_id, &mut queue);
                    last_flush = Instant::now();
                }
                thread::sleep(Duration::from_millis(200));
            }
        }
    }
}

fn flush(url: &str, secret: &str, site_id: &str, edge_id: &str, queue: &mut Vec<String>) {
    if queue.is_empty() {
        return;
    }
    let count = queue.len().min(1000);
    let body = batch_body(site_id, edge_id, &queue[..count]);
    if post(url, secret, &body) {
        queue.drain(..count);
    }
}

fn post(url: &str, secret: &str, body: &str) -> bool {
    let mac = mac_hex(secret, body.as_bytes());
    match ureq::post(url)
        .set("Content-Type", "application/json")
        .set("X-Ledgesec-Mac", &mac)
        .send_string(body)
    {
        Ok(response) => (200..300).contains(&response.status()),
        Err(ureq::Error::Status(code, _)) => (200..300).contains(&code),
        Err(err) => {
            eprintln!("ledgesec-agent: {err}");
            false
        }
    }
}

fn roll() -> u8 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    (nanos % 100) as u8 + 1
}

fn hostname() -> String {
    std::fs::read_to_string("/etc/hostname")
        .unwrap_or_default()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        .take(64)
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

fn read_env() -> Vec<(String, String)> {
    let mut pairs = Vec::new();
    for (key, value) in std::env::vars() {
        if key.starts_with("LEDGESEC_") {
            pairs.push((key, value));
        }
    }
    if pairs.iter().any(|(key, _)| key == "LEDGESEC_INGEST_SECRET") {
        return pairs;
    }
    let text = std::fs::read_to_string("/etc/ledgesec/agent.env").unwrap_or_default();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.starts_with("LEDGESEC_") && !pairs.iter().any(|(name, _)| name == key) {
            pairs.push((key.to_string(), value.trim().trim_matches('"').to_string()));
        }
    }
    pairs
}

fn env_get(pairs: &[(String, String)], key: &str) -> String {
    pairs
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, value)| value.clone())
        .unwrap_or_default()
}

struct Follower {
    path: PathBuf,
    reader: Option<BufReader<File>>,
    inode: u64,
}

impl Follower {
    fn new(path: PathBuf) -> Self {
        Self {
            path,
            reader: None,
            inode: 0,
        }
    }

    fn next_line(&mut self) -> Option<String> {
        self.reopen_if_replaced();
        let reader = self.reader.as_mut()?;
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => None,
            Ok(_) => Some(line),
            Err(_) => None,
        }
    }

    fn reopen_if_replaced(&mut self) {
        let meta = match std::fs::metadata(&self.path) {
            Ok(meta) => meta,
            Err(_) => {
                self.reader = None;
                return;
            }
        };
        let inode = std::os::unix::fs::MetadataExt::ino(&meta);
        let replaced = self.reader.is_none() || inode != self.inode;
        let shrunk = self
            .reader
            .as_mut()
            .and_then(|reader| reader.stream_position().ok())
            .is_some_and(|pos| meta.len() < pos);
        if !replaced && !shrunk {
            return;
        }
        let Ok(mut file) = File::open(&self.path) else {
            return;
        };
        if !shrunk {
            let _ = file.seek(SeekFrom::End(0));
        }
        self.inode = inode;
        self.reader = Some(BufReader::new(file));
    }
}
