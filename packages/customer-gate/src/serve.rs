//! Local demo server. The same process plays the customer module and the contour
//! so the redirect can be followed without OpenResty. Production splits them:
//! Lua stays on the customer server, this decision runs on the contour.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

use crate::gate::{
    contour_get, contour_post, customer_step, esc, header, is_loopback, Config, Incoming, Reply,
    Step, CSS,
};

pub fn serve(addr: &str, cfg: Config) -> std::io::Result<()> {
    let listener = TcpListener::bind(addr)?;
    accept_loop(listener, cfg)
}

fn accept_loop(listener: TcpListener, cfg: Config) -> std::io::Result<()> {
    for conn in listener.incoming() {
        let mut conn = match conn {
            Ok(conn) => conn,
            Err(_) => continue,
        };
        let cfg = cfg.clone();
        thread::spawn(move || {
            let _ = handle_conn(&mut conn, &cfg);
        });
    }
    Ok(())
}

fn handle_conn(sock: &mut TcpStream, cfg: &Config) -> std::io::Result<()> {
    let _ = sock.set_read_timeout(Some(Duration::from_secs(5)));
    let peer = sock
        .peer_addr()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|_| "0.0.0.0".to_string());
    let raw = read_request(sock)?;
    let reply = dispatch(cfg, &peer, &raw);
    write_reply(sock, &reply)
}

struct RawReq {
    method: String,
    path: String,
    query: String,
    headers: Vec<(String, String)>,
    body: String,
}

fn dispatch(cfg: &Config, peer: &str, raw: &RawReq) -> Reply {
    if raw.path == "/v1/health" {
        return plain(200, "ok\n", &[]);
    }
    if raw.path == "/v1/gate" && raw.method.eq_ignore_ascii_case("GET") {
        let token = query_value(&raw.query, "h").unwrap_or_default();
        return contour_get(cfg, &token, peer, now());
    }
    if raw.path == "/v1/gate" && raw.method.eq_ignore_ascii_case("POST") {
        return contour_post(cfg, &raw.body, peer, now());
    }
    if raw.path == "/_ledgesec/clear" {
        return clear_cookies();
    }
    if raw.path == "/_ledgesec/suspect" {
        return mark_suspect(cfg, peer);
    }

    let host = header_value(&raw.headers, "host").unwrap_or("").to_string();
    let cookies = header_value(&raw.headers, "cookie").unwrap_or("");
    let step = customer_step(
        cfg,
        &Incoming {
            method: &raw.method,
            path: &raw.path,
            query: &raw.query,
            pass_cookie: cookie_value(cookies, "ledgesec_pass").as_deref(),
            demo_ip: cookie_value(cookies, "ledgesec_demo_ip").as_deref(),
            peer_ip: peer,
            host: &host,
            now: now(),
        },
    );
    match step {
        Step::Response(reply) => reply,
        Step::Continue => origin_body(&raw.path, &raw.query),
    }
}

fn origin_body(path: &str, query: &str) -> Reply {
    if path.starts_with("/.well-known/acme-challenge/") {
        return plain(200, "acme-challenge\n", &[("X-Ledgesec-Origin", "acme")]);
    }
    if is_demo_asset(path) {
        return plain(
            200,
            "/* ledgesec asset */\n",
            &[("X-Ledgesec-Origin", "asset")],
        );
    }
    let shown = if query.is_empty() {
        path.to_string()
    } else {
        format!("{path}?{query}")
    };
    let body = format!(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Origin received the request</title><style>{CSS}</style><main><p class=\"kicker\">Ledgesec · origin</p><h1>This request continued.</h1><p>The contour already allowed this browser. The gate did not call it again, and the application sees the request.</p><p>Path <code>{}</code></p><ul><li><a href=\"/.env\">Probe the request line</a></li><li><a href=\"/_ledgesec/suspect\">Ask again as a suspicious address</a></li><li><a href=\"/_ledgesec/clear\">Drop the pass</a></li></ul></main>",
        esc(&shown)
    );
    Reply {
        status: 200,
        headers: vec![
            (
                "Content-Type".to_string(),
                "text/html; charset=utf-8".to_string(),
            ),
            ("Cache-Control".to_string(), "no-store".to_string()),
            ("X-Content-Type-Options".to_string(), "nosniff".to_string()),
            ("X-Ledgesec-Origin".to_string(), "hit".to_string()),
        ],
        body,
    }
}

fn is_demo_asset(path: &str) -> bool {
    matches!(
        path.rsplit('.').next(),
        Some(
            "css"
                | "js"
                | "png"
                | "jpg"
                | "jpeg"
                | "gif"
                | "webp"
                | "ico"
                | "svg"
                | "woff"
                | "woff2"
                | "map"
        )
    ) && path.rsplit('/').next().is_some_and(|seg| seg.contains('.'))
}

fn mark_suspect(cfg: &Config, peer: &str) -> Reply {
    if !(cfg.demo && is_loopback(peer)) {
        return plain(404, "Not found.\n", &[]);
    }
    Reply {
        status: 302,
        headers: vec![
            ("Location".to_string(), "/".to_string()),
            ("Cache-Control".to_string(), "no-store".to_string()),
            (
                "Set-Cookie".to_string(),
                "ledgesec_demo_ip=203.0.113.10; Path=/; Max-Age=600".to_string(),
            ),
            (
                "Set-Cookie".to_string(),
                "ledgesec_pass=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0".to_string(),
            ),
        ],
        body: String::new(),
    }
}

fn clear_cookies() -> Reply {
    Reply {
        status: 302,
        headers: vec![
            ("Location".to_string(), "/".to_string()),
            ("Cache-Control".to_string(), "no-store".to_string()),
            (
                "Set-Cookie".to_string(),
                "ledgesec_pass=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0".to_string(),
            ),
            (
                "Set-Cookie".to_string(),
                "ledgesec_demo_ip=; Path=/; Max-Age=0".to_string(),
            ),
        ],
        body: String::new(),
    }
}

fn plain(status: u16, body: &str, extra: &[(&str, &str)]) -> Reply {
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

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn header_value<'a>(headers: &'a [(String, String)], name: &str) -> Option<&'a str> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.as_str())
}

fn cookie_value(header: &str, name: &str) -> Option<String> {
    for part in header.split(';') {
        let mut pair = part.trim().splitn(2, '=');
        let key = pair.next().unwrap_or("");
        let value = pair.next().unwrap_or("");
        if key == name && !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

fn query_value(query: &str, name: &str) -> Option<String> {
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        if parts.next() == Some(name) {
            return Some(parts.next().unwrap_or("").to_string());
        }
    }
    None
}

fn read_request(sock: &mut TcpStream) -> std::io::Result<RawReq> {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 1024];
    let mut header_end = None;
    while header_end.is_none() {
        if buf.len() > 16 * 1024 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "headers too large",
            ));
        }
        let n = sock.read(&mut tmp)?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&tmp[..n]);
        header_end = find_sep(&buf);
    }
    let Some(header_end) = header_end else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "no header",
        ));
    };
    let head = String::from_utf8_lossy(&buf[..header_end]).to_string();
    let mut lines = head.split("\r\n");
    let request = lines.next().unwrap_or("");
    let mut pieces = request.split(' ');
    let method = pieces.next().unwrap_or("").to_string();
    let target = pieces.next().unwrap_or("/");
    let (path, query) = target.split_once('?').unwrap_or((target, ""));
    let mut headers = Vec::new();
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.push((name.trim().to_string(), value.trim().to_string()));
        }
    }
    let length = header_value(&headers, "content-length")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    if length > 8 * 1024 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "body too large",
        ));
    }
    let mut body_buf = buf[header_end + 4..].to_vec();
    while body_buf.len() < length {
        let n = sock.read(&mut tmp)?;
        if n == 0 {
            break;
        }
        body_buf.extend_from_slice(&tmp[..n]);
    }
    body_buf.truncate(length);
    Ok(RawReq {
        method,
        path: if path.is_empty() {
            "/".to_string()
        } else {
            path.to_string()
        },
        query: query.to_string(),
        headers,
        body: String::from_utf8_lossy(&body_buf).to_string(),
    })
}

fn find_sep(buf: &[u8]) -> Option<usize> {
    buf.windows(4).position(|w| w == b"\r\n\r\n")
}

fn write_reply(sock: &mut TcpStream, reply: &Reply) -> std::io::Result<()> {
    let phrase = match reply.status {
        200 => "OK",
        302 => "Found",
        400 => "Bad Request",
        403 => "Forbidden",
        404 => "Not Found",
        421 => "Misdirected Request",
        _ => "Error",
    };
    let mut head = format!("HTTP/1.1 {} {}\r\n", reply.status, phrase);
    for (name, value) in &reply.headers {
        if value.contains(['\r', '\n']) {
            continue;
        }
        head.push_str(name);
        head.push_str(": ");
        head.push_str(value);
        head.push_str("\r\n");
    }
    if header(reply, "content-length").is_none() {
        head.push_str("Content-Length: ");
        head.push_str(&reply.body.len().to_string());
        head.push_str("\r\n");
    }
    head.push_str("Connection: close\r\n\r\n");
    sock.write_all(head.as_bytes())?;
    sock.write_all(reply.body.as_bytes())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpStream;

    fn start() -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let cfg = Config::demo(port);
        thread::spawn(move || {
            let _ = accept_loop(listener, cfg);
        });
        port
    }

    fn talk(port: u16, path: &str, jar: &[(String, String)]) -> String {
        let cookie = jar
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<Vec<_>>()
            .join("; ");
        let req = format!(
            "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nCookie: {cookie}\r\nConnection: close\r\n\r\n"
        );
        let mut sock = TcpStream::connect(("127.0.0.1", port)).unwrap();
        sock.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
        sock.write_all(req.as_bytes()).unwrap();
        let mut buf = Vec::new();
        let mut tmp = [0u8; 4096];
        loop {
            match sock.read(&mut tmp) {
                Ok(0) => break,
                Ok(n) => buf.extend_from_slice(&tmp[..n]),
                Err(_) => break,
            }
        }
        String::from_utf8_lossy(&buf).into_owned()
    }

    fn status(resp: &str) -> u16 {
        resp.split_whitespace().nth(1).unwrap().parse().unwrap()
    }

    fn take_cookies(resp: &str, jar: &mut Vec<(String, String)>) {
        for line in resp.split("\r\n") {
            let Some(value) = line.split_once(':').and_then(|(name, value)| {
                name.eq_ignore_ascii_case("set-cookie")
                    .then_some(value.trim())
            }) else {
                continue;
            };
            let pair = value.split(';').next().unwrap();
            let Some((name, cookie)) = pair.split_once('=') else {
                continue;
            };
            jar.retain(|(key, _)| key != name);
            if !cookie.is_empty() && !value.contains("Max-Age=0") {
                jar.push((name.to_string(), cookie.to_string()));
            }
        }
    }

    fn location(resp: &str, port: u16) -> Option<String> {
        let line = resp
            .lines()
            .find(|line| line.to_ascii_lowercase().starts_with("location:"))?;
        let value = line.split_once(':').unwrap().1.trim().to_string();
        let prefix = format!("http://127.0.0.1:{port}");
        if let Some(rest) = value.strip_prefix(&prefix) {
            Some(if rest.is_empty() {
                "/".to_string()
            } else {
                rest.to_string()
            })
        } else if value.starts_with('/') {
            Some(value)
        } else {
            None
        }
    }

    fn follow(port: u16, start_path: &str) -> String {
        let mut jar = Vec::new();
        let mut path = start_path.to_string();
        let mut last = String::new();
        for _ in 0..6 {
            last = talk(port, &path, &jar);
            take_cookies(&last, &mut jar);
            if status(&last) != 302 {
                break;
            }
            path = location(&last, port).expect("redirect");
        }
        last
    }

    #[test]
    fn demo_allows_a_clean_browser_and_refuses_a_probe() {
        let port = start();
        let page = follow(port, "/");
        assert_eq!(status(&page), 200, "{page}");
        assert!(page.contains("X-Ledgesec-Origin: hit"), "{page}");
        assert!(page.contains("This request continued."));

        let probe = follow(port, "/.env");
        assert_eq!(status(&probe), 403, "{probe}");
        assert!(probe.contains("X-Ledgesec-Reason: waf"), "{probe}");
        assert!(!probe.contains("X-Ledgesec-Origin"), "{probe}");

        let asset = follow(port, "/app.js");
        assert_eq!(status(&asset), 200, "{asset}");
        assert!(asset.contains("X-Ledgesec-Origin: asset"), "{asset}");

        let challenge = follow(port, "/_ledgesec/suspect");
        assert_eq!(status(&challenge), 200, "{challenge}");
        assert!(
            challenge.contains("X-Ledgesec-Reason: suspicious_ip"),
            "{challenge}"
        );
        assert!(challenge.contains("Continue"), "{challenge}");
        assert!(!challenge.contains("X-Ledgesec-Origin"), "{challenge}");
    }
}
