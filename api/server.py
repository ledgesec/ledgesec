#!/usr/bin/env python3
"""Platform API. The browser reaches it only through the edge, at /api/ on dash.ledgesec.com."""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
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


def pg():
    return psycopg.connect(connect_timeout=2)


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
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}$")
IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
IPV6 = re.compile(r"^[0-9A-Fa-f:.]{2,64}$")


def ingest_secret():
    return os.environ.get("LEDGESEC_INGEST_SECRET", "")


def session_secret():
    return os.environ.get("LEDGESEC_SESSION_SECRET", "")


def to_ipv6(ip):
    if IPV4.match(ip):
        return "::ffff:" + ip
    if IPV6.match(ip) and "::" in ip:
        return ip
    return "::"


def show_ip(ip):
    text = str(ip or "")
    if text.startswith("::ffff:"):
        return text[7:]
    if text in ("", "::"):
        return ""
    return text


def path_marker(path):
    value = str(path or "").lower()
    rules = (
        ("env", "Secret file", lambda s: s == "/.env" or s.startswith("/.env.") or s.startswith("/.env/")),
        ("htaccess", "Server file", lambda s: s.startswith("/.htaccess") or s.startswith("/.htpasswd")),
        ("git", "Source checkout", lambda s: s == "/.git" or s.startswith("/.git/")),
        ("svn", "Source checkout", lambda s: s == "/.svn" or s.startswith("/.svn/")),
        ("aws", "Cloud key", lambda s: s == "/.aws" or s.startswith("/.aws/")),
        ("wp-config", "Config file", lambda s: s.endswith("/wp-config.php")),
        ("wp-login", "Login probe", lambda s: s.endswith("/wp-login.php")),
        ("xmlrpc", "Login probe", lambda s: s.endswith("/xmlrpc.php")),
        ("phpmyadmin", "Database tool", lambda s: "phpmyadmin" in s),
        ("adminer", "Database tool", lambda s: s.endswith("/adminer.php")),
        ("server-status", "Server status", lambda s: s == "/server-status" or s.startswith("/server-status/")),
        ("actuator", "Debug endpoint", lambda s: s == "/actuator" or s.startswith("/actuator/")),
        ("cgi-bin", "Old script path", lambda s: s == "/cgi-bin" or s.startswith("/cgi-bin/")),
        ("phpunit", "Test tool", lambda s: "/vendor/phpunit" in s),
        ("ds-store", "Hidden file", lambda s: s.endswith("/.ds_store")),
        ("key", "Private key", lambda s: s.endswith("/id_rsa") or s.endswith("/id_rsa.pub") or s.endswith("/.pem")),
        ("sql", "Database dump", lambda s: s.endswith(".sql") or s.endswith(".sql.gz")),
    )
    for code, label, test in rules:
        if test(value):
            return {"code": code, "label": label}
    return None


def with_marker(row):
    row["marker"] = path_marker(row.get("path"))
    if "ip" in row:
        row["ip"] = show_ip(row.get("ip"))
    return row


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


def fetch_events(limit, site_id=None):
    where = ""
    if site_id is not None:
        if not SITE_ID.match(site_id):
            raise ValueError("bad_site")
        where = f"WHERE site_id = '{site_id}' "
    raw = clickhouse_call(
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, edge_id, route_group, path, decision, reason, toString(ip) AS ip "
        "FROM ledgesec.events "
        f"{where}ORDER BY ts DESC LIMIT {int(limit)} FORMAT JSONEachRow"
    )
    rows = []
    for line in raw.splitlines():
        if line.strip():
            rows.append(with_marker(json.loads(line)))
    return rows


def address_panel(rows):
    grouped = {}
    for row in rows:
        ip = row.get("ip") or ""
        if ip == "":
            continue
        item = grouped.setdefault(ip, {
            "ip": ip,
            "edges": {},
            "probes": 0,
            "last_ts": row["ts"],
            "sites": [],
            "probe_path": "",
            "probe_label": "",
        })
        edge = row.get("edge_id") or "module"
        item["edges"][edge] = item["edges"].get(edge, 0) + 1
        site = row.get("site_id") or ""
        if site and site not in item["sites"]:
            item["sites"].append(site)
        if row.get("marker"):
            item["probes"] += 1
            if item["probe_path"] == "":
                item["probe_path"] = row["path"]
                item["probe_label"] = row["marker"]["label"]
    panel = list(grouped.values())
    panel.sort(key=lambda item: (item["probes"], sum(item["edges"].values())), reverse=True)
    return panel[:80]


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210000)
    return "pbkdf2$210000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def check_password(password, stored):
    try:
        kind, rounds, salt_b64, digest_b64 = stored.split("$", 3)
        if kind != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def ensure_schema():
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id text PRIMARY KEY,
                    email text NOT NULL UNIQUE,
                    password_hash text NOT NULL,
                    role text NOT NULL,
                    site_id text,
                    created_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
        conn.commit()


def bootstrap_admin():
    email = os.environ.get("LEDGESEC_ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("LEDGESEC_ADMIN_PASSWORD", "")
    if not EMAIL.match(email) or len(password) < 12:
        return
    digest = hash_password(password)
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if row is None:
                cur.execute(
                    "INSERT INTO users (id, email, password_hash, role, site_id) VALUES (%s, %s, %s, 'admin', NULL)",
                    (secrets.token_hex(8), email, digest),
                )
            else:
                cur.execute(
                    "UPDATE users SET password_hash = %s, role = 'admin' WHERE email = %s",
                    (digest, email),
                )
        conn.commit()


def user_public(row):
    user_id, email, role, site_id = row
    return {"id": user_id, "email": email, "role": role, "site_id": site_id or ""}


def find_user(email):
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, role, site_id FROM users WHERE email = %s",
                (email,),
            )
            return cur.fetchone()


def sign_session(user_id):
    secret = session_secret()
    if secret == "":
        raise PermissionError("session_unconfigured")
    exp = int((datetime.now(timezone.utc) + timedelta(hours=12)).timestamp())
    msg = f"v1.{user_id}.{exp}"
    mac = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return f"{msg}.{mac}"


def open_session(token):
    secret = session_secret()
    if secret == "" or not token or token.count(".") != 3:
        return None
    version, user_id, exp, mac = token.split(".", 3)
    if version != "v1" or not re.fullmatch(r"[0-9a-f]{16}", user_id):
        return None
    msg = f"v1.{user_id}.{exp}"
    expected = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        return None
    if int(exp) < int(datetime.now(timezone.utc).timestamp()):
        return None
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, role, site_id FROM users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
    if row is None:
        return None
    return user_public(row)


def session_cookie(token, clear=False):
    if clear:
        return "ledgesec_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure"
    return f"ledgesec_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200; Secure"


def cookie_token(header):
    for part in (header or "").split(";"):
        name, _, value = part.strip().partition("=")
        if name == "ledgesec_session":
            return value
    return ""


def list_users():
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, role, site_id FROM users ORDER BY email")
            return [user_public(row) for row in cur.fetchall()]


def create_user(email, password, site_id):
    email = email.strip().lower()
    if not EMAIL.match(email) or len(password) < 12 or not SITE_ID.match(site_id):
        raise ValueError("bad_user")
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, email, password_hash, role, site_id) VALUES (%s, %s, %s, 'user', %s)",
                (secrets.token_hex(8), email, hash_password(password), site_id),
            )
        conn.commit()


def list_sites():
    with pg() as conn:
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
        elif path == "/v1/session":
            self.session_view()
        elif path == "/v1/sites":
            self.sites()
        elif path == "/v1/observations":
            self.observations()
        elif path == "/v1/addresses":
            self.addresses()
        elif path == "/v1/users":
            self.users()
        else:
            self.reply(404, {"error": "not_found"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/v1/observations":
            self.ingest()
            return
        if path == "/v1/session":
            self.sign_in()
            return
        if path == "/v1/logout":
            self.reply(200, {"ok": True}, [("Set-Cookie", session_cookie("", clear=True))])
            return
        if path == "/v1/users":
            self.add_user()
            return
        self.reply(404, {"error": "not_found"})

    def actor(self):
        return open_session(cookie_token(self.headers.get("Cookie")))

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 65536:
            raise ValueError("bad_body")
        return self.rfile.read(length)

    def ingest(self):
        try:
            body = self.read_body()
        except ValueError:
            self.reply(400, {"error": "bad_body"})
            return
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

    def sign_in(self):
        if session_secret() == "":
            self.reply(503, {"error": "session_unconfigured"})
            return
        try:
            parsed = json.loads(self.read_body())
            email = str(parsed.get("email") or "").strip().lower()
            password = str(parsed.get("password") or "")
        except Exception:
            self.reply(400, {"error": "bad_body"})
            return
        row = None
        try:
            row = find_user(email)
        except Exception:
            self.reply(503, {"error": "postgres_down"})
            return
        if row is None or not check_password(password, row[2]):
            self.reply(401, {"error": "bad_login"})
            return
        try:
            token = sign_session(row[0])
        except PermissionError as exc:
            self.reply(503, {"error": str(exc)})
            return
        self.reply(200, user_public((row[0], row[1], row[3], row[4])), [("Set-Cookie", session_cookie(token))])

    def session_view(self):
        user = self.actor()
        if user is None:
            self.reply(401, {"error": "sign_in"})
            return
        self.reply(200, user)

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
        body["ingest"] = "ok" if ingest_secret() else "disabled"
        self.reply(200 if ok else 503, body)

    def sites(self):
        user = self.actor()
        if user is None or user["role"] != "admin":
            self.reply(401, {"error": "sign_in"})
            return
        try:
            self.reply(200, {"sites": list_sites()})
        except Exception:
            self.reply(503, {"error": "postgres_down"})

    def observations(self):
        user = self.actor()
        if user is None:
            self.reply(401, {"error": "sign_in"})
            return
        if user["role"] != "admin" and not SITE_ID.match(user["site_id"] or ""):
            self.reply(200, {"observations": []})
            return
        try:
            site_id = None if user["role"] == "admin" else user["site_id"]
            rows = fetch_events(40, site_id)
        except Exception:
            self.reply(503, {"error": "clickhouse_down"})
            return
        if user["role"] != "admin":
            for row in rows:
                row.pop("ip", None)
        self.reply(200, {"observations": rows})

    def addresses(self):
        user = self.actor()
        if user is None or user["role"] != "admin":
            self.reply(401, {"error": "sign_in"})
            return
        try:
            rows = fetch_events(1000)
        except Exception:
            self.reply(503, {"error": "clickhouse_down"})
            return
        self.reply(200, {"addresses": address_panel(rows)})

    def users(self):
        user = self.actor()
        if user is None or user["role"] != "admin":
            self.reply(401, {"error": "sign_in"})
            return
        try:
            self.reply(200, {"users": list_users()})
        except Exception:
            self.reply(503, {"error": "postgres_down"})

    def add_user(self):
        user = self.actor()
        if user is None or user["role"] != "admin":
            self.reply(401, {"error": "sign_in"})
            return
        try:
            parsed = json.loads(self.read_body())
            create_user(
                str(parsed.get("email") or ""),
                str(parsed.get("password") or ""),
                str(parsed.get("site_id") or ""),
            )
        except ValueError:
            self.reply(400, {"error": "bad_user"})
            return
        except Exception:
            self.reply(400, {"error": "rejected"})
            return
        self.reply(201, {"ok": True})

    def reply(self, status, body, extra=None):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        for key, value in extra or []:
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt, *args):
        return


def prepare():
    last = None
    for _ in range(20):
        try:
            ensure_schema()
            bootstrap_admin()
            return
        except Exception as exc:
            last = exc
            time.sleep(1)
    raise SystemExit(f"postgres schema: {last}")


def main():
    prepare()
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
