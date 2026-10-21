#!/bin/sh
# One /.env and one / must reach a local mock ingest, with no query and no Cookie.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PREFIX=${TMPDIR:-/tmp}/ledgesec-smoke
MOCK_PORT=44742
EDGE_PORT=44741
SECRET=smoke-secret
OUT=$PREFIX/bodies

rm -rf "$PREFIX"
mkdir -p "$PREFIX/logs" "$PREFIX/conf"

export SMOKE_SECRET=$SECRET
export SMOKE_OUT=$OUT
export SMOKE_PORT=$MOCK_PORT
: > "$OUT"

python3 - <<'PY' &
import hashlib, hmac, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

secret = os.environ["SMOKE_SECRET"].encode()
out = os.environ["SMOKE_OUT"]
port = int(os.environ["SMOKE_PORT"])

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length)
        mac = (self.headers.get("X-Ledgesec-Mac") or "").strip().lower()
        expect = hmac.new(secret, body, hashlib.sha256).hexdigest()
        ok = self.path == "/api/v1/observations" and hmac.compare_digest(expect, mac)
        if ok:
            with open(out, "ab") as handle:
                handle.write(body + b"\n")
            self.send_response(202)
        else:
            self.send_response(401)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, fmt, *args):
        return

ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
PY
MOCK_PID=$!

cleanup() {
  if [ -n "${EDGE_PID:-}" ]; then kill "$EDGE_PID" 2>/dev/null || true; fi
  kill "$MOCK_PID" 2>/dev/null || true
  wait "$MOCK_PID" 2>/dev/null || true
  if [ -n "${EDGE_PID:-}" ]; then wait "$EDGE_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

cat > "$PREFIX/conf/nginx.conf" <<EOF
worker_processes 1;
error_log logs/error.log info;
pid logs/nginx.pid;
events { worker_connections 64; }
env LEDGESEC_INGEST_SECRET;
env LEDGESEC_SITE_ID;
env LEDGESEC_EDGE_ID;
env LEDGESEC_INGEST_URL;
env LEDGESEC_SAMPLE_RATE;
env LEDGESEC_BATCH_MIN;
http {
    lua_package_path "$ROOT/module/?.lua;;";
    lua_shared_dict ledgesec_observe 8m;
    init_worker_by_lua_block {
        require("ledgesec.observe").start()
    }
    server {
        listen 127.0.0.1:$EDGE_PORT;
        location / {
            log_by_lua_block { require("ledgesec.observe").note() }
            content_by_lua_block { ngx.say("ok") }
        }
    }
}
EOF

export LEDGESEC_INGEST_SECRET=$SECRET
export LEDGESEC_SITE_ID=demo
export LEDGESEC_EDGE_ID=smoke
export LEDGESEC_INGEST_URL="http://127.0.0.1:$MOCK_PORT/api/v1/observations"
export LEDGESEC_SAMPLE_RATE=100
export LEDGESEC_BATCH_MIN=1

openresty -p "$PREFIX" -c "$PREFIX/conf/nginx.conf" -g 'daemon off;' &
EDGE_PID=$!

ready=0
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf -o /dev/null "http://127.0.0.1:$EDGE_PORT/"; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 0.2
done
if [ "$ready" -ne 1 ]; then
  echo "openresty did not listen" >&2
  tail -n 40 "$PREFIX/logs/error.log" >&2 || true
  exit 1
fi

curl -sf -o /dev/null \
  -H 'Cookie: leakcookie=1' \
  -H 'Authorization: Bearer leakauth' \
  -H 'Referer: https://evil.example/leakreferer' \
  "http://127.0.0.1:$EDGE_PORT/.env?leakquery=1"
curl -sf -o /dev/null \
  -H 'Cookie: leakcookie=1' \
  -H 'Authorization: Bearer leakauth' \
  -H 'Referer: https://evil.example/leakreferer' \
  "http://127.0.0.1:$EDGE_PORT/?leakquery=1"

i=0
while [ "$i" -lt 20 ]; do
  if grep -q '"path":"/.env"' "$OUT" && grep -q '"path":"/"' "$OUT"; then
    break
  fi
  i=$((i + 1))
  sleep 0.5
done

python3 - "$OUT" <<'PY'
import sys
text = open(sys.argv[1], encoding="utf-8").read()
missing = [item for item in ('"path":"/.env"', '"path":"/"') if item not in text]
leaked = [item for item in ("leakquery", "leakcookie", "leakauth", "leakreferer") if item in text]
if missing or leaked or not text:
    sys.stderr.write("smoke failed\n")
    if missing:
        sys.stderr.write("missing paths\n")
    if leaked:
        sys.stderr.write("leaked fields\n")
    sys.exit(1)
sys.stdout.write("smoke ok\n")
PY
