//! Demo contour. Bind stays on localhost: the preview switch is not a public control.

use std::collections::BTreeSet;
use std::env;
use std::process::ExitCode;

use ledgesec_gate::{serve, Config, HANDOFF_TTL, PASS_TTL};

fn main() -> ExitCode {
    let port: u16 = env::var("LEDGESEC_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(44721);
    let secret = env::var("LEDGESEC_SECRET").ok();
    let demo = secret.is_none() || env::var("LEDGESEC_DEMO").ok().as_deref() == Some("1");
    let secret = secret.unwrap_or_else(|| "dev-only-not-a-real-site-secret".to_string());
    let mut suspect_ips = BTreeSet::new();
    if let Ok(list) = env::var("LEDGESEC_SUSPECT_IPS") {
        suspect_ips.extend(
            list.split(',')
                .map(|item| item.trim().to_string())
                .filter(|item| !item.is_empty()),
        );
    }
    if demo {
        suspect_ips.insert("203.0.113.10".to_string());
    }
    let cfg = Config {
        site_id: env::var("LEDGESEC_SITE_ID").unwrap_or_else(|_| "demo".to_string()),
        secret,
        scheme: "http".to_string(),
        hosts: vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")],
        contour: format!("http://127.0.0.1:{port}"),
        suspect_ips,
        pass_ttl: PASS_TTL,
        handoff_ttl: HANDOFF_TTL,
        demo,
    };
    let addr = format!("127.0.0.1:{port}");
    eprintln!("Ledgesec gate demo at http://{addr}/");
    if demo {
        eprintln!("Demo secret is local only. A real site sets LEDGESEC_SECRET and leaves LEDGESEC_DEMO unset.");
    }
    if let Err(err) = serve(&addr, cfg) {
        eprintln!("gate stopped: {err}");
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}
