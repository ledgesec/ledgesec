#!/usr/bin/env python3
"""Platform API. The browser reaches it only through the edge, at /api/."""

import base64
import hashlib
import hmac
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg


def postgres_ready():
    with psycopg.connect(connect_timeout=2) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()


def clickhouse_call(sql, payload=None):
    database = urllib.parse.quote(os.environ.get("CLICKHOUSE_DB", "ledgesec"))
    query = urllib.parse.quote(sql)
    url = os.environ["CLICKHOUSE_URL"].rstrip("/") + f"/?database={database}&query={query}"
    user = os.environ.get("CLICKHOUSE_USER", "ledgesec")
    password = os.environ.get("CLICKHOUSE_PASSWORD", "")
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    data = None if payload is None else payload.encode()
    request = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {token}"})
    with urllib.request.urlopen(request, timeout=3) as response:
        return response.read()


def clickhouse_ready():
    clickhouse_call("SELECT 1")


SITE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
IPV6 = re.compile(r"^[0-9A-Fa-f:.]{2,64}$")


def ingest_secret():
    return os.environ.get("LEDGESEC_INGEST_SECRET", "")


def to_ipv6(ip):
    if IPV4.match(ip):
        return "::ffff:" + ip
    if IPV6.match(ip) and "::" in ip:
        return ip
    return "::"


def observation_rows(raw):
    secret = ingest_secret()
    if secret == "":
        raise PermissionError("ingest_disabled")
    mac = raw["mac"]
    body = raw["body"]
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        raise PermissionError("bad_mac")
    parsed = json.loads(body)
    site_id = parsed.get("site_id", "")
    if not SITE_ID.match(site_id):
        raise ValueError("bad_site")
    edge_id = parsed.get("edge_id") or "module"
    if not SITE_ID.match(edge_id):
        raise ValueError("bad_edge")
    events = parsed.get("events")
    if not isinstance(events, list) or len(events) == 0 or len(events) > 50:
        raise ValueError("bad_events")
    now = datetime.now(timezone.utc)
    lines = []
    for event in events:
        ts_ms = int(event["ts"])
        when = datetime.fromtimestamp(ts_ms / 1000, timezone.utc)
        if when < now - timedelta(days=2) or when > now + timedelta(hours=1):
            continue
        path = str(event.get("path") or "/")
        path = path.split("?", 1)[0].replace("\n", "").replace("\r", "")
        if path == "" or len(path) > 160:
            continue
        route_group = event.get("route_group")
        if route_group not in ("document", "asset", "api"):
            route_group = "document"
        stamp = when.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        lines.append(json.dumps({
            "ts": stamp,
            "site_id": site_id,
            "edge_id": edge_id,
            "decision": "allow",
            "reason": "observe",
            "policy_version": 1,
            "snapshot_gen": 0,
            "snapshot_age_ms": 0,
            "route_group": route_group,
            "path": path,
            "ip": to_ipv6(str(event.get("ip") or "")),
            "had_session": 0,
            "client_class": "",
            "ja4": "",
            "sampled": 0,
        }, separators=(",", ":")))
    return lines


def insert_observations(lines):
    if not lines:
        return 0
    clickhouse_call(
        "INSERT INTO ledgesec.events FORMAT JSONEachRow",
        "\n".join(lines) + "\n",
    )
    return len(lines)


def list_observations():
    raw = clickhouse_call(
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, route_group, path, decision, reason "
        "FROM ledgesec.events ORDER BY ts DESC LIMIT 40 FORMAT JSONEachRow"
    )
    rows = []
    for line in raw.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def list_sites():
    with psycopg.connect(connect_timeout=2) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, domain, origin_url, dry_run
                FROM sites
                ORDER BY domain
                """
            )
            rows = cur.fetchall()
    return [
        {
            "id": site_id,
            "domain": domain,
            "origin_url": origin_url,
            "dry_run": dry_run,
        }
        for site_id, domain, origin_url, dry_run in rows
    ]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self.health()
        elif path == "/v1/sites":
            self.sites()
        elif path == "/v1/observations":
            self.observations()
        else:
            self.reply(404, {"error": "not_found"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/v1/observations":
            self.reply(404, {"error": "not_found"})
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 65536:
            self.reply(400, {"error": "bad_body"})
            return
        body = self.rfile.read(length)
        mac = (self.headers.get("X-Ledgesec-Mac") or "").strip().lower()
        try:
            lines = observation_rows({"mac": mac, "body": body})
            stored = insert_observations(lines)
        except PermissionError as exc:
            self.reply(401, {"error": str(exc)})
            return
        except Exception:
            self.reply(400, {"error": "rejected"})
            return
        self.reply(202, {"stored": stored})

    def health(self):
        body = {}
        ok = True
        try:
            postgres_ready()
            body["postgres"] = "ok"
        except Exception:
            ok = False
            body["postgres"] = "down"
        try:
            clickhouse_ready()
            body["clickhouse"] = "ok"
        except Exception:
            ok = False
            body["clickhouse"] = "down"
        self.reply(200 if ok else 503, body)

    def sites(self):
        try:
            self.reply(200, {"sites": list_sites()})
        except Exception:
            self.reply(503, {"error": "postgres_down"})

    def observations(self):
        try:
            self.reply(200, {"observations": list_observations()})
        except Exception:
            self.reply(503, {"error": "clickhouse_down"})

    def reply(self, status, body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt, *args):
        return


def main():
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
