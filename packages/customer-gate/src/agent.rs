//! The Linux daemon reads one nginx log and posts the same batch as the Lua module.
//! The line is `$msec $remote_addr $host "$request" $status`. Query, body, and Cookie are dropped.

use crate::hash::hmac_sha256;

pub const LOG_PATH: &str = "/var/log/nginx/ledgesec.log";
pub const DEFAULT_BASE: &str = "https://dash.ledgesec.com";

pub fn product_version() -> &'static str {
    include_str!("../../../VERSION").trim()
}

const PATH_MAX: usize = 160;
const HOST_MAX: usize = 253;

#[derive(Debug, PartialEq, Eq)]
pub struct Hit {
    pub ts_ms: u64,
    pub ip: String,
    pub host: String,
    pub method: String,
    pub path: String,
    pub status: u16,
}

pub fn parse_line(line: &str) -> Option<Hit> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }
    let mut parts = line.splitn(4, ' ');
    let ts_ms = parse_msec(parts.next()?)?;
    let ip = clean_ip(parts.next()?);
    let host = clean_host(parts.next()?)?;
    let (method, path, status) = split_request(parts.next()?)?;
    let path = clean_path(&path)?;
    if path.starts_with("/.well-known/acme-challenge/") {
        return None;
    }
    Some(Hit {
        ts_ms,
        ip,
        host,
        method,
        path,
        status,
    })
}

pub fn admit(status: u16, percent: u8, roll: u8) -> Option<bool> {
    if status >= 400 {
        return Some(false);
    }
    let percent = percent.min(100);
    if roll >= 1 && roll <= percent {
        return Some(true);
    }
    None
}

pub fn event_json(hit: &Hit, sampled: bool) -> String {
    format!(
        "{{\"ts\":{},\"method\":\"{}\",\"path\":\"{}\",\"route_group\":\"{}\",\"status\":{},\"ip\":\"{}\",\"host\":\"{}\",\"sampled\":{}}}",
        hit.ts_ms,
        esc(&hit.method),
        esc(&hit.path),
        route_group(&hit.path),
        hit.status,
        esc(&hit.ip),
        esc(&hit.host),
        if sampled { "true" } else { "false" },
    )
}

pub fn batch_body(site_id: &str, edge_id: &str, events: &[String]) -> String {
    format!(
        "{{\"site_id\":\"{}\",\"edge_id\":\"{}\",\"agent\":\"{}\",\"events\":[{}]}}",
        site_id,
        edge_id,
        product_version(),
        events.join(",")
    )
}

pub fn mac_hex(secret: &str, body: &[u8]) -> String {
    hex(&hmac_sha256(secret.as_bytes(), body))
}

pub fn ingest_url(value: &str) -> String {
    let value = if value.is_empty() { DEFAULT_BASE } else { value };
    if value.contains("/v1/observations") {
        return value.to_string();
    }
    let value = value.trim_end_matches('/');
    format!("{value}/api/v1/observations")
}

fn parse_msec(text: &str) -> Option<u64> {
    let (sec, frac) = text.split_once('.').unwrap_or((text, "0"));
    let sec: u64 = sec.parse().ok()?;
    let digits: String = frac.chars().take(3).collect();
    let millis: u64 = format!("{digits:0<3}").parse().ok()?;
    Some(sec.saturating_mul(1000).saturating_add(millis))
}

fn clean_ip(value: &str) -> String {
    if value.chars().any(|c| c.is_control() || c == '"' || c == '?') {
        return String::new();
    }
    value.to_string()
}

fn clean_host(value: &str) -> Option<String> {
    let mut text = value.trim().trim_end_matches('.').to_ascii_lowercase();
    if let Some((name, _)) = text.split_once(':') {
        text = name.to_string();
    }
    if text.is_empty() || text.len() > HOST_MAX || text.chars().any(|c| c.is_control()) {
        return None;
    }
    Some(text)
}

fn clean_path(value: &str) -> Option<String> {
    let mut path = value.split('?').next().unwrap_or("/");
    path = path.split('#').next().unwrap_or(path);
    let path: String = path.chars().filter(|c| !c.is_control()).collect();
    if path.is_empty() {
        return Some("/".to_string());
    }
    if path.len() > PATH_MAX {
        return Some(path[..PATH_MAX].to_string());
    }
    Some(path)
}

fn split_request(rest: &str) -> Option<(String, String, u16)> {
    let rest = rest.trim();
    let start = rest.find('"')?;
    let end = rest.rfind('"')?;
    if end <= start {
        return None;
    }
    let request = &rest[start + 1..end];
    let status: u16 = rest[end + 1..].trim().parse().ok()?;
    let mut parts = request.split_whitespace();
    let method = method_name(parts.next()?);
    let target = parts.next()?.to_string();
    Some((method, target, status))
}

fn method_name(value: &str) -> String {
    let value = value.to_ascii_uppercase();
    if value.len() <= 16 && value.chars().all(|c| c.is_ascii_uppercase()) {
        value
    } else {
        "GET".to_string()
    }
}

fn route_group(path: &str) -> &'static str {
    if path == "/api" || path.starts_with("/api/") {
        return "api";
    }
    let ext = path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    const ASSETS: &[&str] = &[
        "css", "js", "png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "woff", "woff2", "map",
    ];
    if path.contains('.') && ASSETS.contains(&ext.as_str()) {
        "asset"
    } else {
        "document"
    }
}

fn esc(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn hex(data: &[u8]) -> String {
    const H: &[u8] = b"0123456789abcdef";
    let mut out = String::with_capacity(data.len() * 2);
    for byte in data {
        out.push(H[(byte >> 4) as usize] as char);
        out.push(H[(byte & 0xf) as usize] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_log_line_keeps_the_path_and_drops_the_query() {
        let hit = parse_line(
            r#"1761141841.123 203.0.113.10 Vipkeys.net "GET /pricing?q=1 HTTP/1.1" 200"#,
        )
        .unwrap();
        assert_eq!(hit.ts_ms, 1_761_141_841_123);
        assert_eq!(hit.ip, "203.0.113.10");
        assert_eq!(hit.host, "vipkeys.net");
        assert_eq!(hit.method, "GET");
        assert_eq!(hit.path, "/pricing");
        assert_eq!(hit.status, 200);
    }

    #[test]
    fn a_blocked_status_is_kept_and_an_ordinary_page_is_sampled() {
        assert_eq!(admit(444, 1, 50), Some(false));
        assert_eq!(admit(404, 1, 100), Some(false));
        assert_eq!(admit(200, 1, 50), None);
        assert_eq!(admit(200, 1, 1), Some(true));
    }

    #[test]
    fn the_certificate_path_and_a_broken_line_are_skipped() {
        assert!(parse_line(
            r#"1761141841.000 203.0.113.10 vipkeys.net "GET /.well-known/acme-challenge/token HTTP/1.1" 200"#
        )
        .is_none());
        assert!(parse_line("not a log line").is_none());
    }

    #[test]
    fn the_batch_mac_matches_the_ingest_header() {
        let body = batch_body("536a35a4", "killbot", &["{}".to_string()]);
        assert_eq!(
            body,
            format!(
                r#"{{"site_id":"536a35a4","edge_id":"killbot","agent":"{}","events":[{{}}]}}"#,
                product_version()
            )
        );
        assert!(product_version().split('.').count() == 3);
        assert_eq!(
            mac_hex("k", b"x"),
            "c38edc8815c8489f64738978f44008f8596345545f0baa68ef6fcf5c53e57189"
        );
        assert_eq!(
            ingest_url(""),
            "https://dash.ledgesec.com/api/v1/observations"
        );
    }
}
