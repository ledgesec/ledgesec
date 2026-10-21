#!/usr/bin/env python3
"""Platform API. The browser reaches it only through the edge, at /api/."""

import base64
import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg


def postgres_ready():
    with psycopg.connect(connect_timeout=2) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()


def clickhouse_ready():
    query = urllib.parse.quote("SELECT 1")
    database = urllib.parse.quote(os.environ.get("CLICKHOUSE_DB", "ledgesec"))
    url = os.environ["CLICKHOUSE_URL"].rstrip("/") + f"/?database={database}&query={query}"
    user = os.environ.get("CLICKHOUSE_USER", "ledgesec")
    password = os.environ.get("CLICKHOUSE_PASSWORD", "")
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    request = urllib.request.Request(url, headers={"Authorization": f"Basic {token}"})
    with urllib.request.urlopen(request, timeout=3) as response:
        response.read()


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
        else:
            self.reply(404, {"error": "not_found"})

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
