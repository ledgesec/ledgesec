//! The Linux daemon posts the same batch as the Lua module.
//! An nginx line is `$msec $remote_addr $host "$request" $status $request_time "$http_user_agent"`.
//! A line without the duration or the agent is still a hit.
//! A Coolify proxy line is Traefik's JSON access log.
//! A Caddy line is Caddy's JSON access log.
//! Query, body, Cookie, and Referer are dropped.

use crate::hash::hmac_sha256;

pub const LOG_PATH: &str = "/var/log/nginx/ledgesec.log";
pub const DEFAULT_BASE: &str = "https://dash.ledgesec.com";

pub fn product_version() -> &'static str {
    include_str!("../../../VERSION").trim()
}

const PATH_MAX: usize = 160;
const HOST_MAX: usize = 253;
const UA_MAX: usize = 200;
const PROTOCOL_MAX: usize = 24;
const TLS_MAX: usize = 64;
const EDGE_HEALTH: &str = "/edge-health";
const CABINET_SUMMARY: &str = "/api/v1/summary";
const CABINET_OBSERVATIONS: &str = "/api/v1/observations";
const CABINET_RATES: &str = "/api/v1/rates";

#[derive(Debug, PartialEq, Eq)]
pub struct Hit {
    pub ts_ms: u64,
    pub ip: String,
    pub host: String,
    pub method: String,
    pub path: String,
    pub status: u16,
    pub request_time_ms: u32,
    pub ua: String,
    pub bytes_sent: u64,
    pub protocol: String,
    pub tls: String,
    pub routed: bool,
}

pub fn parse_line(line: &str) -> Option<Hit> {
    let line = line.trim();
    if line.starts_with('{') {
        let value: serde_json::Value = serde_json::from_str(line).ok()?;
        if value.get("RequestHost").is_some() {
            return parse_proxy(&value);
        }
        return parse_caddy(&value);
    }
    parse_nginx(line)
}

fn parse_nginx(line: &str) -> Option<Hit> {
    if line.is_empty() || line.starts_with('#') {
        return None;
    }
    let mut parts = line.splitn(4, ' ');
    let ts_ms = parse_msec(parts.next()?)?;
    let ip = clean_ip(parts.next()?);
    let host = clean_host(parts.next()?)?;
    let (method, path, status, request_time_ms, protocol, ua) = split_request(parts.next()?)?;
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
        request_time_ms,
        ua,
        bytes_sent: 0,
        protocol,
        tls: String::new(),
        routed: true,
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
    let mut extra = String::new();
    if hit.request_time_ms > 0 {
        extra.push_str(&format!(r#","request_time_ms":{}"#, hit.request_time_ms));
    }
    push_text(&mut extra, "ua", &hit.ua);
    if hit.bytes_sent > 0 {
        extra.push_str(&format!(r#","bytes_sent":{}"#, hit.bytes_sent));
    }
    push_text(&mut extra, "protocol", &hit.protocol);
    push_text(&mut extra, "tls", &hit.tls);
    if !hit.routed {
        extra.push_str(r#","routed":false"#);
    }
    format!(
        "{{\"ts\":{},\"method\":\"{}\",\"path\":\"{}\",\"route_group\":\"{}\",\"status\":{},\"ip\":\"{}\",\"host\":\"{}\",\"sampled\":{}{}}}",
        hit.ts_ms,
        esc(&hit.method),
        esc(&hit.path),
        route_group(&hit.path),
        hit.status,
        esc(&hit.ip),
        esc(&hit.host),
        if sampled { "true" } else { "false" },
        extra,
    )
}

fn push_text(extra: &mut String, key: &str, value: &str) {
    if value.is_empty() {
        return;
    }
    extra.push_str(&format!(r#","{key}":"{}""#, esc(value)));
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

fn parse_proxy(value: &serde_json::Value) -> Option<Hit> {
    let host = clean_host(value.get("RequestHost")?.as_str()?)?;
    if host == "localhost" || host == "127.0.0.1" {
        return None;
    }
    let router = value.get("RouterName").and_then(|item| item.as_str()).unwrap_or("");
    let routed = application_router(router);
    let path = clean_path(value.get("RequestPath")?.as_str()?)?;
    if path.starts_with("/.well-known/acme-challenge/") {
        return None;
    }
    let method = method_name(
        value
            .get("RequestMethod")
            .and_then(|item| item.as_str())
            .unwrap_or("GET"),
    );
    let status = u16::try_from(value.get("DownstreamStatus")?.as_u64()?).ok()?;
    let ip = clean_ip(value.get("ClientHost").and_then(|item| item.as_str()).unwrap_or(""));
    let ts_ms = parse_rfc3339(value.get("StartUTC")?.as_str()?)?;
    Some(Hit {
        ts_ms,
        ip,
        host,
        method,
        path,
        status,
        request_time_ms: duration_ms(value.get("Duration")),
        ua: header_value(value, "request_User-Agent"),
        bytes_sent: content_size(value.get("DownstreamContentSize")),
        protocol: client_protocol(
            value.get("RequestScheme").and_then(|item| item.as_str()).unwrap_or(""),
            value.get("RequestProtocol").and_then(|item| item.as_str()).unwrap_or(""),
        ),
        tls: tls_name(
            value.get("TLSVersion").and_then(|item| item.as_str()).unwrap_or(""),
            value.get("TLSCipher").and_then(|item| item.as_str()).unwrap_or(""),
        ),
        routed,
    })
}

fn parse_caddy(value: &serde_json::Value) -> Option<Hit> {
    let request = value.get("request")?;
    let host = clean_host(request.get("host")?.as_str()?)?;
    if host == "localhost" || host == "127.0.0.1" {
        return None;
    }
    let path = clean_path(request.get("uri")?.as_str()?)?;
    if path.starts_with("/.well-known/acme-challenge/") || cabinet_noise(&path) {
        return None;
    }
    let method = method_name(
        request
            .get("method")
            .and_then(|item| item.as_str())
            .unwrap_or("GET"),
    );
    let status = u16::try_from(value.get("status")?.as_u64()?).ok()?;
    let ip = clean_ip(
        request
            .get("client_ip")
            .and_then(|item| item.as_str())
            .or_else(|| request.get("remote_ip").and_then(|item| item.as_str()))
            .unwrap_or(""),
    );
    let secure = request.get("tls").is_some_and(|item| !item.is_null());
    Some(Hit {
        ts_ms: caddy_ts(value.get("ts")?)?,
        ip,
        host,
        method,
        path,
        status,
        request_time_ms: caddy_duration_ms(value.get("duration")),
        ua: request_header(request, "User-Agent"),
        bytes_sent: content_size(value.get("size")),
        protocol: client_protocol(
            if secure { "https" } else { "http" },
            request.get("proto").and_then(|item| item.as_str()).unwrap_or(""),
        ),
        tls: caddy_tls(request),
        routed: true,
    })
}

fn cabinet_noise(path: &str) -> bool {
    path == EDGE_HEALTH
        || path == CABINET_SUMMARY
        || path == CABINET_OBSERVATIONS
        || path == CABINET_RATES
}

fn request_header(request: &serde_json::Value, name: &str) -> String {
    request
        .get("headers")
        .map(|headers| header_value(headers, name))
        .unwrap_or_default()
}

fn caddy_ts(value: &serde_json::Value) -> Option<u64> {
    let seconds = value.as_f64()?;
    if !seconds.is_finite() || seconds < 0.0 {
        return None;
    }
    Some((seconds * 1000.0).round() as u64)
}

fn caddy_duration_ms(value: Option<&serde_json::Value>) -> u32 {
    let Some(seconds) = value.and_then(serde_json::Value::as_f64) else {
        return 0;
    };
    if !seconds.is_finite() || seconds <= 0.0 {
        return 0;
    }
    let millis = seconds * 1000.0;
    if millis >= f64::from(u32::MAX) {
        return u32::MAX;
    }
    millis.round() as u32
}

fn caddy_tls(request: &serde_json::Value) -> String {
    let Some(tls) = request.get("tls").filter(|item| !item.is_null()) else {
        return String::new();
    };
    let version = match tls.get("version").and_then(serde_json::Value::as_u64) {
        Some(0x0301) => "1.0",
        Some(0x0302) => "1.1",
        Some(0x0303) => "1.2",
        Some(0x0304) => "1.3",
        _ => "",
    };
    tls_name(version, "")
}

fn header_value(value: &serde_json::Value, key: &str) -> String {
    let Some(item) = value.get(key) else {
        return String::new();
    };
    let text = item.as_str().or_else(|| item.as_array().and_then(|list| list.first()).and_then(|part| part.as_str()));
    clip(text.unwrap_or(""), UA_MAX)
}

fn content_size(value: Option<&serde_json::Value>) -> u64 {
    value.and_then(|item| item.as_u64().or_else(|| item.as_str().and_then(|text| text.parse().ok()))).unwrap_or(0)
}

fn tls_name(version: &str, cipher: &str) -> String {
    let version = clip(version, TLS_MAX);
    let cipher = clip(cipher, TLS_MAX);
    let text = match (version.is_empty(), cipher.is_empty()) {
        (true, true) => return String::new(),
        (false, true) => version,
        (true, false) => cipher,
        (false, false) => format!("{version} {cipher}"),
    };
    keep_token(&text, TLS_MAX, &['.', '_', '/', ' '])
}

fn protocol_name(value: &str) -> String {
    keep_token(value, PROTOCOL_MAX, &['/', '.'])
}

fn client_protocol(scheme: &str, protocol: &str) -> String {
    let scheme = keep_token(scheme, 8, &[]);
    let scheme = if scheme == "http" || scheme == "https" { scheme } else { String::new() };
    let protocol = protocol_name(protocol);
    match (scheme.is_empty(), protocol.is_empty()) {
        (false, false) => format!("{scheme} {protocol}"),
        (false, true) => scheme,
        (true, false) => protocol,
        (true, true) => String::new(),
    }
}

fn clip(value: &str, max: usize) -> String {
    let text: String = value.chars().filter(|c| !c.is_control()).collect();
    let mut end = text.len().min(max);
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    text[..end].to_string()
}

fn keep_token(value: &str, max: usize, extra: &[char]) -> String {
    let text = clip(value, max);
    if text.is_empty() || text.chars().any(|c| !c.is_ascii_alphanumeric() && !extra.contains(&c)) {
        return String::new();
    }
    text
}

fn application_router(name: &str) -> bool {
    let name = name.trim();
    !name.is_empty() && name != "catchall@file"
}

fn duration_ms(value: Option<&serde_json::Value>) -> u32 {
    let nanos = value.and_then(serde_json::Value::as_u64).unwrap_or(0);
    u32::try_from(nanos / 1_000_000).unwrap_or(u32::MAX)
}

fn parse_rfc3339(text: &str) -> Option<u64> {
    let text = text.trim().trim_end_matches('Z');
    let (date, time) = text.split_once('T')?;
    let mut date = date.split('-');
    let year: i32 = date.next()?.parse().ok()?;
    let month: u32 = date.next()?.parse().ok()?;
    let day: u32 = date.next()?.parse().ok()?;
    let (clock, frac) = time.split_once('.').unwrap_or((time, "0"));
    let mut clock = clock.split(':');
    let hour: u32 = clock.next()?.parse().ok()?;
    let minute: u32 = clock.next()?.parse().ok()?;
    let second: u32 = clock.next()?.parse().ok()?;
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let digits: String = frac.chars().take(3).filter(|c| c.is_ascii_digit()).collect();
    let millis: u64 = format!("{digits:0<3}").parse().ok()?;
    let days = days_from_civil(year, month, day)?;
    let secs = days.saturating_mul(86_400) + i64::from(hour * 3600 + minute * 60 + second);
    Some(u64::try_from(secs).ok()?.saturating_mul(1000).saturating_add(millis))
}

fn days_from_civil(mut year: i32, month: u32, day: u32) -> Option<i64> {
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    if month <= 2 {
        year -= 1;
    }
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let yoe = u64::try_from(year - era * 400).ok()?;
    let shifted = i32::try_from(month).ok()? + if month > 2 { -3 } else { 9 };
    let doy = (153 * shifted + 2) / 5 + i32::try_from(day).ok()? - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + u64::try_from(doy).ok()?;
    Some(i64::from(era) * 146_097 + i64::try_from(doe).ok()? - 719_468)
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

fn split_request(rest: &str) -> Option<(String, String, u16, u32, String, String)> {
    let rest = rest.trim();
    let start = rest.find('"')?;
    let end = rest[start + 1..].find('"')? + start + 1;
    let request = &rest[start + 1..end];
    let mut tail = rest[end + 1..].trim_start();
    let status_end = tail.find(|c: char| c.is_whitespace()).unwrap_or(tail.len());
    let status: u16 = tail[..status_end].parse().ok()?;
    tail = tail[status_end..].trim_start();
    let mut took_ms = 0;
    if !tail.is_empty() && !tail.starts_with('"') {
        let token_end = tail.find(|c: char| c.is_whitespace()).unwrap_or(tail.len());
        took_ms = request_time_ms(&tail[..token_end]);
        tail = tail[token_end..].trim_start();
    }
    let ua = if let Some(quoted) = tail.strip_prefix('"') {
        clip(quoted.split('"').next().unwrap_or(""), UA_MAX)
    } else {
        String::new()
    };
    let mut parts = request.split_whitespace();
    let method = method_name(parts.next()?);
    let target = parts.next()?.to_string();
    let protocol = protocol_name(parts.next().unwrap_or(""));
    Some((method, target, status, took_ms, protocol, ua))
}

fn request_time_ms(text: &str) -> u32 {
    let (sec, frac) = text.split_once('.').unwrap_or((text, ""));
    let Ok(sec) = sec.parse::<u64>() else {
        return 0;
    };
    let digits: String = frac.chars().filter(|c| c.is_ascii_digit()).take(3).collect();
    let millis: u64 = if digits.is_empty() {
        0
    } else {
        format!("{digits:0<3}").parse().unwrap_or(0)
    };
    u32::try_from(sec.saturating_mul(1000).saturating_add(millis)).unwrap_or(u32::MAX)
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
        assert_eq!(hit.request_time_ms, 0);
        let timed = parse_line(
            r#"1761141841.123 203.0.113.10 vipkeys.net "GET /pricing HTTP/1.1" 200 0.042"#,
        )
        .unwrap();
        assert_eq!(timed.request_time_ms, 42);
        assert_eq!(timed.protocol, "HTTP/1.1");
        assert!(event_json(&timed, false).contains(r#""request_time_ms":42"#));
        assert!(!event_json(&hit, false).contains("request_time_ms"));
        let agent = parse_line(
            r#"1761141841.123 203.0.113.10 vipkeys.net "GET /pricing HTTP/1.1" 200 0.042 "Mozilla/5.0""#,
        )
        .unwrap();
        assert_eq!(agent.ua, "Mozilla/5.0");
        assert!(event_json(&agent, false).contains(r#""ua":"Mozilla/5.0""#));
    }

    #[test]
    fn a_blocked_status_is_kept_and_an_ordinary_page_is_sampled() {
        assert_eq!(admit(444, 1, 50), Some(false));
        assert_eq!(admit(404, 1, 100), Some(false));
        assert_eq!(admit(200, 1, 50), None);
        assert_eq!(admit(200, 1, 1), Some(true));
    }

    #[test]
    fn a_proxy_line_keeps_the_host_and_drops_the_query() {
        let hit = parse_line(
            r#"{"ClientHost":"203.0.113.10","DownstreamContentSize":1280,"DownstreamStatus":404,"Duration":42000000,"RequestHost":"Shop.Example","RequestMethod":"GET","RequestPath":"/pricing?q=1","RequestProtocol":"HTTP/2.0","RequestScheme":"https","RouterName":"https-0-app@docker","StartUTC":"2026-10-21T15:43:05.08506422Z","TLSCipher":"TLS_AES_128_GCM_SHA256","TLSVersion":"1.3","request_Referer":"https://secret.example/a","request_User-Agent":"Mozilla/5.0"}"#,
        )
        .unwrap();
        assert_eq!(hit.ts_ms, 1_792_597_385_085);
        assert_eq!(hit.ip, "203.0.113.10");
        assert_eq!(hit.host, "shop.example");
        assert_eq!(hit.method, "GET");
        assert_eq!(hit.path, "/pricing");
        assert_eq!(hit.status, 404);
        assert_eq!(hit.request_time_ms, 42);
        assert_eq!(hit.ua, "Mozilla/5.0");
        assert_eq!(hit.bytes_sent, 1280);
        assert_eq!(hit.protocol, "https HTTP/2.0");
        assert_eq!(hit.tls, "1.3 TLS_AES_128_GCM_SHA256");
        assert!(hit.routed);
        let event = event_json(&hit, false);
        assert!(event.contains(r#""ua":"Mozilla/5.0""#));
        assert!(event.contains(r#""bytes_sent":1280"#));
        assert!(!event.contains("secret"));
        assert!(!event.contains("Referer"));
        assert!(!event.contains('?'));
        assert!(parse_line(r#"{"RequestPath":"/ping","DownstreamStatus":200}"#).is_none());
        assert!(parse_line(
            r#"{"ClientHost":"203.0.113.10","DownstreamStatus":200,"RequestHost":"localhost","RequestMethod":"GET","RequestPath":"/ping","StartUTC":"2026-10-21T15:43:05Z"}"#
        )
        .is_none());
        assert!(parse_line(
            r#"{"ClientHost":"203.0.113.10","DownstreamStatus":200,"RequestHost":"shop.example","RequestMethod":"GET","RequestPath":"/.well-known/acme-challenge/token","StartUTC":"2026-10-21T15:43:05Z"}"#
        )
        .is_none());
        let scan = parse_line(
            r#"{"ClientHost":"203.0.113.10","DownstreamStatus":503,"RequestHost":"www.securitas.com","RequestMethod":"GET","RequestPath":"/","RouterName":"catchall@file","StartUTC":"2026-10-21T15:43:05Z"}"#,
        )
        .unwrap();
        assert!(!scan.routed);
        assert!(event_json(&scan, false).contains(r#""routed":false"#));
        let bare = parse_line(
            r#"{"ClientHost":"203.0.113.10","DownstreamStatus":404,"RequestHost":"95.81.96.246","RequestMethod":"GET","RequestPath":"/","StartUTC":"2026-10-21T15:43:05Z"}"#,
        )
        .unwrap();
        assert!(!bare.routed);
    }

    #[test]
    fn a_caddy_line_keeps_the_host_and_drops_the_cabinet_poll() {
        let hit = parse_line(
            r#"{"duration":0.042,"request":{"client_ip":"203.0.113.10","headers":{"Cookie":["session=secret-cookie"],"Referer":["https://secret.example/a"],"User-Agent":["Mozilla/5.0"]},"host":"Admin.Ledgesec.com","method":"GET","proto":"HTTP/2.0","tls":{"version":772},"uri":"/pricing?q=secret"},"size":1280,"status":200,"ts":1761141841.123}"#,
        )
        .unwrap();
        assert_eq!(hit.ts_ms, 1_761_141_841_123);
        assert_eq!(hit.ip, "203.0.113.10");
        assert_eq!(hit.host, "admin.ledgesec.com");
        assert_eq!(hit.method, "GET");
        assert_eq!(hit.path, "/pricing");
        assert_eq!(hit.status, 200);
        assert_eq!(hit.request_time_ms, 42);
        assert_eq!(hit.ua, "Mozilla/5.0");
        assert_eq!(hit.bytes_sent, 1280);
        assert_eq!(hit.protocol, "https HTTP/2.0");
        assert_eq!(hit.tls, "1.3");
        assert!(hit.routed);
        let event = event_json(&hit, false);
        assert!(!event.contains("secret"));
        assert!(!event.contains("Cookie"));
        assert!(!event.contains("Referer"));
        assert!(!event.contains('?'));
        let scan = caddy_line("GET", "/.env", "ledgesec.com", 404);
        assert_eq!(parse_line(&scan).unwrap().path, "/.env");
        assert!(parse_line(&caddy_line("GET", EDGE_HEALTH, "admin.ledgesec.com", 200)).is_none());
        assert!(parse_line(&caddy_line("GET", CABINET_SUMMARY, "admin.ledgesec.com", 200)).is_none());
        assert!(parse_line(&caddy_line("GET", CABINET_OBSERVATIONS, "dash.ledgesec.com", 200)).is_none());
        assert!(parse_line(&caddy_line("POST", CABINET_OBSERVATIONS, "dash.ledgesec.com", 202)).is_none());
        assert!(parse_line(&caddy_line("GET", CABINET_RATES, "admin.ledgesec.com", 200)).is_none());
        assert!(parse_line(&caddy_line("GET", "/.well-known/acme-challenge/token", "ledgesec.com", 200)).is_none());
        assert!(parse_line(&caddy_line("GET", "/", "127.0.0.1", 200)).is_none());
    }

    fn caddy_line(method: &str, path: &str, host: &str, status: u16) -> String {
        format!(
            r#"{{"duration":0.001,"request":{{"client_ip":"203.0.113.10","host":"{host}","method":"{method}","proto":"HTTP/1.1","uri":"{path}"}},"status":{status},"ts":1761141841.123}}"#
        )
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
