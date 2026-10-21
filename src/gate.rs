//! Customer gate and contour decision.
//!
//! The module on the customer's server does not choose allow or deny.
//! A request with no fresh pass is sent to the contour. The contour decides
//! whether that request continues to the origin.

use std::collections::BTreeSet;

use crate::hash::{b64url, b64url_decode, ct_eq, hmac_sha256};

pub const PATH_MAX: usize = 160;
pub const QUERY_MAX: usize = 512;
pub const PASS_TTL: u64 = 12 * 60 * 60;
pub const HANDOFF_TTL: u64 = 60;
const SKEW: u64 = 30;

const ASSET_EXT: &[&str] = &[
    "css", "js", "png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "woff", "woff2", "map",
];

#[derive(Clone, Debug)]
pub struct Config {
    pub site_id: String,
    pub secret: String,
    pub scheme: String,
    pub hosts: Vec<String>,
    pub contour: String,
    pub suspect_ips: BTreeSet<String>,
    pub pass_ttl: u64,
    pub handoff_ttl: u64,
    pub demo: bool,
}

impl Config {
    pub fn demo(port: u16) -> Self {
        let mut suspect_ips = BTreeSet::new();
        suspect_ips.insert("203.0.113.10".to_string());
        Self {
            site_id: "demo".to_string(),
            secret: "dev-only-not-a-real-site-secret".to_string(),
            scheme: "http".to_string(),
            hosts: vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")],
            contour: format!("http://127.0.0.1:{port}"),
            suspect_ips,
            pass_ttl: PASS_TTL,
            handoff_ttl: HANDOFF_TTL,
            demo: true,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Class {
    Continue,
    Handoff,
    Hold(&'static str),
}

impl Class {
    pub fn name(&self) -> String {
        match self {
            Class::Continue => "continue".to_string(),
            Class::Handoff => "handoff".to_string(),
            Class::Hold(reason) => format!("hold:{reason}"),
        }
    }
}

pub struct Incoming<'a> {
    pub method: &'a str,
    pub path: &'a str,
    pub query: &'a str,
    pub pass_cookie: Option<&'a str>,
    pub demo_ip: Option<&'a str>,
    pub peer_ip: &'a str,
    pub host: &'a str,
    pub now: u64,
}

pub struct Reply {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: String,
}

pub enum Step {
    Continue,
    Response(Reply),
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct Handoff {
    pub site: String,
    pub host: String,
    pub path: String,
    pub query: String,
    pub ip: String,
    pub exp: u64,
}

pub fn classify(method: &str, path: &str, query: &str, has_pass: bool) -> Class {
    let method = method.to_ascii_uppercase();
    let get_like = method == "GET" || method == "HEAD";
    if path.is_empty() || !path.starts_with('/') || path.len() > PATH_MAX || query.len() > QUERY_MAX
    {
        return Class::Hold("waf");
    }
    if suspicious(path, query) {
        return if get_like {
            Class::Handoff
        } else {
            Class::Hold("waf")
        };
    }
    if method == "OPTIONS" || (get_like && (is_asset(path) || is_acme(path))) {
        return Class::Continue;
    }
    if has_pass {
        return Class::Continue;
    }
    if get_like {
        Class::Handoff
    } else {
        Class::Hold("needs_decision")
    }
}

pub fn customer_step(cfg: &Config, req: &Incoming<'_>) -> Step {
    if !cfg.hosts.iter().any(|host| host == req.host) {
        return Step::Response(text(
            421,
            &[("X-Ledgesec-Reason", "host")],
            "This host is not on the gate.",
        ));
    }

    let (query_pass, rest_query) = split_pass(req.query);
    if let Some(token) = query_pass.as_deref() {
        if verify_pass(cfg, token, req.now).is_some() {
            let clean = origin_url(&cfg.scheme, req.host, req.path, &rest_query);
            let cookie = pass_cookie(token, cfg.pass_ttl, cfg.scheme == "https");
            return Step::Response(redirect(
                &clean,
                &[
                    ("Set-Cookie", cookie.as_str()),
                    ("X-Ledgesec-Decision", "allow"),
                ],
            ));
        }
    }

    let pass_ok = req
        .pass_cookie
        .and_then(|token| verify_pass(cfg, token, req.now))
        .is_some();
    match classify(req.method, req.path, &rest_query, pass_ok) {
        Class::Continue => Step::Continue,
        Class::Hold(reason) => Step::Response(text(
            403,
            &[("X-Ledgesec-Reason", reason)],
            hold_body(reason),
        )),
        Class::Handoff => {
            let ip = signed_ip(cfg, req);
            let nonce = random_nonce();
            let exp = req.now.saturating_add(cfg.handoff_ttl);
            let token = handoff_token(
                &cfg.secret,
                &cfg.site_id,
                req.host,
                req.path,
                &rest_query,
                &ip,
                exp,
                &nonce,
            );
            let location = format!("{}/v1/gate?h={}", cfg.contour.trim_end_matches('/'), token);
            Step::Response(redirect(&location, &[("X-Ledgesec-Decision", "handoff")]))
        }
    }
}

pub fn contour_get(cfg: &Config, token: &str, peer_ip: &str, now: u64) -> Reply {
    decide(cfg, token, peer_ip, now, false)
}

pub fn contour_post(cfg: &Config, body: &str, peer_ip: &str, now: u64) -> Reply {
    let Some(token) = form_value(body, "h") else {
        return text(400, &[("X-Ledgesec-Reason", "handoff")], "Missing handoff.");
    };
    decide(cfg, &token, peer_ip, now, true)
}

fn decide(cfg: &Config, token: &str, peer_ip: &str, now: u64, confirmed: bool) -> Reply {
    let Some(handoff) = verify_handoff(cfg, token, now) else {
        return text(
            400,
            &[("X-Ledgesec-Reason", "handoff")],
            "This handoff is not valid.",
        );
    };
    if !ip_matches(cfg, peer_ip, &handoff.ip) {
        return text(
            400,
            &[("X-Ledgesec-Reason", "handoff")],
            "This handoff does not match the connection.",
        );
    }
    if suspicious(&handoff.path, &handoff.query) || !safe_return(&handoff.path) {
        return page(
            403,
            "deny",
            "waf",
            "Request refused",
            "This request does not continue to the origin.",
            "The contour refused the request line. The application does not see it.",
            None,
        );
    }
    if cfg.suspect_ips.contains(&handoff.ip) && !confirmed {
        return page(
            200,
            "challenge",
            "suspicious_ip",
            "Confirm this browser",
            "This address is already marked suspicious.",
            "The request has not reached the origin. Continue only if this browser should proceed.",
            Some(token),
        );
    }
    let exp = now.saturating_add(cfg.pass_ttl);
    let pass = pass_token(&cfg.secret, &cfg.site_id, exp);
    let query = append_pass(&handoff.query, &pass);
    let location = origin_url(&cfg.scheme, &handoff.host, &handoff.path, &query);
    let reason = if confirmed {
        "challenge_passed"
    } else {
        "allow"
    };
    redirect(
        &location,
        &[
            ("X-Ledgesec-Decision", "allow"),
            ("X-Ledgesec-Reason", reason),
        ],
    )
}

pub fn handoff_token(
    secret: &str,
    site: &str,
    host: &str,
    path: &str,
    query: &str,
    ip: &str,
    exp: u64,
    nonce: &[u8],
) -> String {
    let message = format!(
        "v1.handoff.{site}.{}.{}.{}.{}.{exp}.{}",
        b64url(host.as_bytes()),
        b64url(path.as_bytes()),
        b64url(query.as_bytes()),
        b64url(ip.as_bytes()),
        b64url(nonce)
    );
    finish(secret, &message)
}

pub fn pass_token(secret: &str, site: &str, exp: u64) -> String {
    finish(secret, &format!("v1.pass.{site}.{exp}.allow"))
}

fn finish(secret: &str, message: &str) -> String {
    let mac = b64url(&hmac_sha256(secret.as_bytes(), message.as_bytes()));
    format!("{message}.{mac}")
}

fn verify_handoff(cfg: &Config, token: &str, now: u64) -> Option<Handoff> {
    let parts = split_dots(token);
    if parts.len() != 10 || parts[0] != "v1" || parts[1] != "handoff" || parts[2] != cfg.site_id {
        return None;
    }
    let exp: u64 = parts[7].parse().ok()?;
    if !fresh(exp, now, cfg.handoff_ttl) {
        return None;
    }
    let message = parts[..9].join(".");
    if !mac_ok(cfg, &message, parts[9]) {
        return None;
    }
    let host = utf8(&b64url_decode(parts[3])?)?;
    if !cfg.hosts.iter().any(|item| item == &host) {
        return None;
    }
    let path = utf8(&b64url_decode(parts[4])?)?;
    let query = utf8(&b64url_decode(parts[5])?)?;
    let ip = utf8(&b64url_decode(parts[6])?)?;
    let _nonce = b64url_decode(parts[8])?;
    if path.len() > PATH_MAX || query.len() > QUERY_MAX || ip.len() > 64 || host.len() > 253 {
        return None;
    }
    Some(Handoff {
        site: parts[2].to_string(),
        host,
        path,
        query,
        ip,
        exp,
    })
}

fn verify_pass(cfg: &Config, token: &str, now: u64) -> Option<u64> {
    let parts = split_dots(token);
    if parts.len() != 6
        || parts[0] != "v1"
        || parts[1] != "pass"
        || parts[2] != cfg.site_id
        || parts[4] != "allow"
    {
        return None;
    }
    let exp: u64 = parts[3].parse().ok()?;
    if !fresh(exp, now, cfg.pass_ttl) {
        return None;
    }
    let message = parts[..5].join(".");
    if !mac_ok(cfg, &message, parts[5]) {
        return None;
    }
    Some(exp)
}

fn mac_ok(cfg: &Config, message: &str, presented: &str) -> bool {
    let expected = hmac_sha256(cfg.secret.as_bytes(), message.as_bytes());
    let Some(got) = b64url_decode(presented) else {
        return false;
    };
    ct_eq(&expected, &got)
}

fn fresh(exp: u64, now: u64, ttl: u64) -> bool {
    exp > now && exp <= now.saturating_add(ttl).saturating_add(SKEW)
}

fn suspicious(path: &str, query: &str) -> bool {
    let Some(path_bytes) = percent_decode(path) else {
        return true;
    };
    let Some(query_bytes) = percent_decode(query) else {
        return true;
    };
    if path_bytes.contains(&0) || query_bytes.contains(&0) || path_bytes.contains(&b'\\') {
        return true;
    }
    if path.starts_with("//") || path_bytes.starts_with(b"//") {
        return true;
    }
    if segments_escape(&path_bytes) {
        return true;
    }
    let path_l = lower_ascii(&path_bytes);
    let query_l = lower_ascii(&query_bytes);
    const PATH_MARKS: &[&[u8]] = &[
        b"/.env",
        b"/.git/",
        b"/wp-login.php",
        b"/wp-admin/",
        b"/phpmyadmin",
        b"/etc/passwd",
        b"/vendor/phpunit",
        b"<script",
        b"union select",
        b"' or 1=1",
    ];
    const QUERY_MARKS: &[&[u8]] = &[
        b"<script",
        b"union select",
        b"' or 1=1",
        b"../",
        b"/.env",
        b"/.git/",
    ];
    PATH_MARKS.iter().any(|mark| contains(&path_l, mark))
        || QUERY_MARKS.iter().any(|mark| contains(&query_l, mark))
}

fn safe_return(path: &str) -> bool {
    if !path.starts_with('/') || path.starts_with("//") || path.contains(['\\', ' ', '\r', '\n']) {
        return false;
    }
    let Some(decoded) = percent_decode(path) else {
        return false;
    };
    if decoded.contains(&0)
        || decoded.contains(&b'\\')
        || decoded.starts_with(b"//")
        || segments_escape(&decoded)
    {
        return false;
    }
    std::str::from_utf8(&decoded).is_ok()
}

fn segments_escape(path: &[u8]) -> bool {
    path.split(|b| *b == b'/').any(|segment| segment == b"..")
}

fn is_asset(path: &str) -> bool {
    let Some(decoded) = percent_decode(path) else {
        return false;
    };
    let Ok(text) = std::str::from_utf8(&decoded) else {
        return false;
    };
    let segment = text.rsplit('/').next().unwrap_or("");
    let Some((_, ext)) = segment.rsplit_once('.') else {
        return false;
    };
    ASSET_EXT.iter().any(|item| ext.eq_ignore_ascii_case(item))
}

fn is_acme(path: &str) -> bool {
    let Some(decoded) = percent_decode(path) else {
        return false;
    };
    let Ok(text) = std::str::from_utf8(&decoded) else {
        return false;
    };
    text.starts_with("/.well-known/acme-challenge/")
}

fn percent_decode(input: &str) -> Option<Vec<u8>> {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 >= bytes.len() {
                return None;
            }
            let hi = hex_val(bytes[i + 1])?;
            let lo = hex_val(bytes[i + 2])?;
            out.push((hi << 4) | lo);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    Some(out)
}

fn hex_val(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn lower_ascii(bytes: &[u8]) -> Vec<u8> {
    bytes.iter().map(|b| b.to_ascii_lowercase()).collect()
}

fn contains(hay: &[u8], needle: &[u8]) -> bool {
    hay.windows(needle.len()).any(|window| window == needle)
}

fn signed_ip<'a>(cfg: &Config, req: &'a Incoming<'a>) -> String {
    if cfg.demo
        && is_loopback(req.peer_ip)
        && req
            .demo_ip
            .is_some_and(|ip| cfg.suspect_ips.contains(ip) && ip != req.peer_ip)
    {
        return req.demo_ip.unwrap().to_string();
    }
    req.peer_ip.to_string()
}

fn ip_matches(cfg: &Config, peer_ip: &str, signed_ip: &str) -> bool {
    signed_ip == peer_ip
        || (cfg.demo && is_loopback(peer_ip) && cfg.suspect_ips.contains(signed_ip))
}

pub fn is_loopback(ip: &str) -> bool {
    ip == "127.0.0.1" || ip == "::1"
}

fn split_pass(query: &str) -> (Option<String>, String) {
    if query.is_empty() {
        return (None, String::new());
    }
    let mut pass = None;
    let mut rest = Vec::new();
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next().unwrap_or("");
        let value = parts.next();
        if key == "ledgesec_pass" {
            if pass.is_none() {
                pass = value.map(|item| item.to_string());
            }
            continue;
        }
        rest.push(pair);
    }
    (pass, rest.join("&"))
}

fn append_pass(query: &str, token: &str) -> String {
    let (_, rest) = split_pass(query);
    if rest.is_empty() {
        format!("ledgesec_pass={token}")
    } else {
        format!("{rest}&ledgesec_pass={token}")
    }
}

fn origin_url(scheme: &str, host: &str, path: &str, query: &str) -> String {
    if query.is_empty() {
        format!("{scheme}://{host}{path}")
    } else {
        format!("{scheme}://{host}{path}?{query}")
    }
}

fn pass_cookie(token: &str, max_age: u64, secure: bool) -> String {
    let mut cookie =
        format!("ledgesec_pass={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}");
    if secure {
        cookie.push_str("; Secure");
    }
    cookie
}

fn split_dots(token: &str) -> Vec<&str> {
    token.split('.').collect()
}

fn utf8(bytes: &[u8]) -> Option<String> {
    String::from_utf8(bytes.to_vec()).ok()
}

fn random_nonce() -> Vec<u8> {
    let mut buf = [0u8; 16];
    if let Ok(mut file) = std::fs::File::open("/dev/urandom") {
        use std::io::Read;
        if file.read_exact(&mut buf).is_ok() {
            return buf.to_vec();
        }
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    buf.copy_from_slice(&nanos.to_le_bytes());
    buf.to_vec()
}

fn form_value(body: &str, key: &str) -> Option<String> {
    for pair in body.split('&') {
        let mut parts = pair.splitn(2, '=');
        let got = parts.next().unwrap_or("");
        let value = parts.next().unwrap_or("");
        if form_decode(got) == key {
            return Some(form_decode(value));
        }
    }
    None
}

fn form_decode(input: &str) -> String {
    let plus = input.replace('+', " ");
    percent_decode(&plus)
        .and_then(|bytes| String::from_utf8(bytes).ok())
        .unwrap_or_default()
}

fn hold_body(reason: &str) -> &'static str {
    if reason == "waf" {
        "This request does not continue to the origin."
    } else {
        "This request has no contour decision yet, so it does not continue to the origin."
    }
}

fn redirect(location: &str, extra: &[(&str, &str)]) -> Reply {
    let mut headers = vec![
        ("Location".to_string(), location.to_string()),
        ("Cache-Control".to_string(), "no-store".to_string()),
        ("Referrer-Policy".to_string(), "no-referrer".to_string()),
    ];
    for (name, value) in extra {
        headers.push(((*name).to_string(), (*value).to_string()));
    }
    Reply {
        status: 302,
        headers,
        body: String::new(),
    }
}

fn text(status: u16, extra: &[(&str, &str)], body: &str) -> Reply {
    let mut headers = vec![
        (
            "Content-Type".to_string(),
            "text/plain; charset=utf-8".to_string(),
        ),
        ("Cache-Control".to_string(), "no-store".to_string()),
        ("X-Content-Type-Options".to_string(), "nosniff".to_string()),
    ];
    for (name, value) in extra {
        headers.push(((*name).to_string(), (*value).to_string()));
    }
    Reply {
        status,
        headers,
        body: body.to_string(),
    }
}

fn page(
    status: u16,
    decision: &str,
    reason: &str,
    title: &str,
    heading: &str,
    copy: &str,
    handoff: Option<&str>,
) -> Reply {
    let form = if let Some(token) = handoff {
        format!(
            "<form method=\"post\" action=\"/v1/gate\"><input type=\"hidden\" name=\"h\" value=\"{}\"><button type=\"submit\">Continue</button></form>",
            esc(token)
        )
    } else {
        String::new()
    };
    let body = format!(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>{title}</title><style>{CSS}</style><main><p class=\"kicker\">Ledgesec · contour</p><h1>{heading}</h1><p>{copy}</p>{form}</main>"
    );
    Reply {
        status,
        headers: vec![
            (
                "Content-Type".to_string(),
                "text/html; charset=utf-8".to_string(),
            ),
            ("Cache-Control".to_string(), "no-store".to_string()),
            ("X-Content-Type-Options".to_string(), "nosniff".to_string()),
            ("X-Ledgesec-Decision".to_string(), decision.to_string()),
            ("X-Ledgesec-Reason".to_string(), reason.to_string()),
        ],
        body,
    }
}

pub const CSS: &str = ":root{color-scheme:light}body{margin:0;background:#f3efe6;color:#1d1a16;font:18px/1.5 Georgia,\"Iowan Old Style\",serif}main{max-width:38rem;margin:0 auto;padding:4rem 1.25rem}p.kicker{letter-spacing:.08em;text-transform:uppercase;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#6b6256}h1{font-weight:500;font-size:2rem;line-height:1.2;margin:0 0 1rem}a,button{color:#1d4a3a}button{font:inherit;background:transparent;border:1px solid #1d4a3a;padding:.4rem .8rem;cursor:pointer}code{font:14px/1.4 ui-monospace,monospace}ul{padding-left:1.1rem}";

pub fn esc(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

pub fn header<'a>(reply: &'a Reply, name: &str) -> Option<&'a str> {
    reply
        .headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> Config {
        Config {
            site_id: "demo".to_string(),
            secret: "test-secret".to_string(),
            scheme: "https".to_string(),
            hosts: vec!["example.com".to_string()],
            contour: "https://eu.ledgesec.com".to_string(),
            suspect_ips: BTreeSet::from(["203.0.113.10".to_string()]),
            pass_ttl: PASS_TTL,
            handoff_ttl: HANDOFF_TTL,
            demo: false,
        }
    }

    fn incoming<'a>(
        method: &'a str,
        path: &'a str,
        query: &'a str,
        cookie: Option<&'a str>,
    ) -> Incoming<'a> {
        Incoming {
            method,
            path,
            query,
            pass_cookie: cookie,
            demo_ip: None,
            peer_ip: "198.51.100.8",
            host: "example.com",
            now: 1_800_000_000,
        }
    }

    #[test]
    fn class_table() {
        let rows = [
            ("GET", "/pricing", "utm=1", false, "handoff"),
            ("GET", "/pricing", "utm=1", true, "continue"),
            ("GET", "/.env", "", true, "handoff"),
            ("GET", "/app.js", "", false, "continue"),
            ("GET", "/app.js", "q=union%20select", true, "handoff"),
            ("GET", "/%2e%2e/secret", "", true, "handoff"),
            (
                "GET",
                "/.well-known/acme-challenge/abc",
                "",
                false,
                "continue",
            ),
            ("POST", "/pricing", "", false, "hold:needs_decision"),
            ("POST", "/pricing", "", true, "continue"),
            ("POST", "/.env", "", true, "hold:waf"),
            ("OPTIONS", "/pricing", "", false, "continue"),
            ("GET", "https://evil.test/", "", true, "hold:waf"),
        ];
        for (method, path, query, pass, want) in rows {
            assert_eq!(classify(method, path, query, pass).name(), want, "{path}");
        }
        let long = format!("/{}", "a".repeat(161));
        assert_eq!(classify("GET", &long, "", true).name(), "hold:waf");
    }

    #[test]
    fn clean_get_is_a_redirect_then_a_pass_then_the_origin() {
        let cfg = cfg();
        let first = customer_step(&cfg, &incoming("GET", "/pricing", "utm=1", None));
        let Step::Response(redir) = first else {
            panic!("expected handoff");
        };
        assert_eq!(redir.status, 302);
        let location = header(&redir, "Location").unwrap();
        assert!(location.starts_with("https://eu.ledgesec.com/v1/gate?h="));
        let token = location.split("h=").nth(1).unwrap();
        let decision = contour_get(&cfg, token, "198.51.100.8", 1_800_000_000);
        assert_eq!(decision.status, 302);
        assert_eq!(header(&decision, "X-Ledgesec-Reason"), Some("allow"));
        let back = header(&decision, "Location").unwrap();
        assert!(back.starts_with("https://example.com/pricing?utm=1&ledgesec_pass="));
        assert!(!back.contains("eu.ledgesec.com"));
        let pass = back.split("ledgesec_pass=").nth(1).unwrap();
        let cookie_step = customer_step(
            &cfg,
            &incoming(
                "GET",
                "/pricing",
                &format!("utm=1&ledgesec_pass={pass}"),
                None,
            ),
        );
        let Step::Response(set) = cookie_step else {
            panic!("expected cookie redirect");
        };
        assert_eq!(
            header(&set, "Location"),
            Some("https://example.com/pricing?utm=1")
        );
        let cookie = header(&set, "Set-Cookie").unwrap();
        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("Secure"));
        let token = cookie
            .split(';')
            .next()
            .unwrap()
            .trim_start_matches("ledgesec_pass=");
        let again = customer_step(&cfg, &incoming("GET", "/pricing", "utm=1", Some(token)));
        assert!(matches!(again, Step::Continue));
    }

    #[test]
    fn probe_never_returns_to_origin() {
        let cfg = cfg();
        let first = customer_step(&cfg, &incoming("GET", "/.env", "", None));
        let Step::Response(redir) = first else {
            panic!("probe should leave the origin");
        };
        let token = header(&redir, "Location")
            .unwrap()
            .split("h=")
            .nth(1)
            .unwrap();
        let decision = contour_get(&cfg, token, "198.51.100.8", 1_800_000_000);
        assert_eq!(decision.status, 403);
        assert_eq!(header(&decision, "X-Ledgesec-Reason"), Some("waf"));
        assert!(header(&decision, "Location").is_none());
        assert!(!decision.body.contains("continued"));
    }

    #[test]
    fn suspect_address_stops_until_the_browser_confirms() {
        let cfg = cfg();
        let mut req = incoming("GET", "/", "", None);
        req.peer_ip = "203.0.113.10";
        let Step::Response(redir) = customer_step(&cfg, &req) else {
            panic!("expected handoff");
        };
        let token = header(&redir, "Location")
            .unwrap()
            .split("h=")
            .nth(1)
            .unwrap();
        let challenge = contour_get(&cfg, token, "203.0.113.10", 1_800_000_000);
        assert_eq!(challenge.status, 200);
        assert_eq!(
            header(&challenge, "X-Ledgesec-Reason"),
            Some("suspicious_ip")
        );
        assert!(challenge.body.contains("Continue"));
        let allowed = contour_post(&cfg, &format!("h={token}"), "203.0.113.10", 1_800_000_000);
        assert_eq!(allowed.status, 302);
        assert_eq!(
            header(&allowed, "X-Ledgesec-Reason"),
            Some("challenge_passed")
        );
    }

    #[test]
    fn foreign_host_and_bad_mac_do_not_redirect() {
        let cfg = cfg();
        let token = handoff_token(
            &cfg.secret,
            &cfg.site_id,
            "evil.test",
            "/",
            "",
            "198.51.100.8",
            1_800_000_060,
            b"n0nce",
        );
        let reply = contour_get(&cfg, &token, "198.51.100.8", 1_800_000_000);
        assert_eq!(reply.status, 400);
        let mut broken = token.clone();
        broken.pop();
        broken.push('A');
        assert_eq!(
            contour_get(&cfg, &broken, "198.51.100.8", 1_800_000_000).status,
            400
        );
    }

    #[test]
    fn ip_mismatch_and_expired_handoff_fail() {
        let cfg = cfg();
        let token = handoff_token(
            &cfg.secret,
            &cfg.site_id,
            "example.com",
            "/",
            "",
            "198.51.100.8",
            1_800_000_060,
            b"n0nce",
        );
        assert_eq!(
            contour_get(&cfg, &token, "203.0.113.9", 1_800_000_000).status,
            400
        );
        assert_eq!(
            contour_get(&cfg, &token, "198.51.100.8", 1_800_000_061).status,
            400
        );
    }

    #[test]
    fn post_without_a_pass_does_not_continue() {
        let cfg = cfg();
        let step = customer_step(&cfg, &incoming("POST", "/pricing", "", None));
        let Step::Response(reply) = step else {
            panic!("post must not continue");
        };
        assert_eq!(reply.status, 403);
        assert_eq!(header(&reply, "X-Ledgesec-Reason"), Some("needs_decision"));
    }

    #[test]
    fn asset_and_acme_skip_the_contour() {
        let cfg = cfg();
        assert!(matches!(
            customer_step(&cfg, &incoming("GET", "/app.css", "", None)),
            Step::Continue
        ));
        assert!(matches!(
            customer_step(
                &cfg,
                &incoming("GET", "/.well-known/acme-challenge/tok", "", None)
            ),
            Step::Continue
        ));
    }

    #[test]
    fn lua_module_matches_the_contour_tokens() {
        let output = std::process::Command::new("lua5.4")
            .arg("module/check.lua")
            .output()
            .expect("lua5.4");
        let text = String::from_utf8(output.stdout).unwrap();
        assert!(
            output.status.success(),
            "{text}\n{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let cfg = Config {
            site_id: "demo".to_string(),
            secret: "test-secret".to_string(),
            scheme: "http".to_string(),
            hosts: vec!["127.0.0.1:44721".to_string()],
            contour: "http://127.0.0.1:44721".to_string(),
            suspect_ips: BTreeSet::new(),
            pass_ttl: PASS_TTL,
            handoff_ttl: HANDOFF_TTL,
            demo: false,
        };
        let handoff = text
            .lines()
            .find(|line| line.starts_with("HANDOFF "))
            .unwrap()
            .trim_start_matches("HANDOFF ");
        let parsed = verify_handoff(&cfg, handoff, 1_999_999_950).expect("lua handoff");
        assert_eq!(parsed.site, "demo");
        assert_eq!(parsed.exp, 2_000_000_000);
        assert_eq!(parsed.path, "/pricing");
        assert_eq!(parsed.query, "utm=1");
        assert_eq!(parsed.ip, "203.0.113.10");
        let pass = text
            .lines()
            .find(|line| line.starts_with("PASS "))
            .unwrap()
            .trim_start_matches("PASS ");
        assert!(verify_pass(&cfg, pass, 1_999_999_950).is_some());
    }
}
