#!/bin/sh
# Install the observe-only OpenResty client. The secret stays out of argv
# when --token-file is used. Plain nginx is not replaced.
set -eu

LUA_SRC=""
PREFIX=/usr/local/ledgesec
ENV_FILE=/etc/ledgesec/agent.env
SNIPPET_NAME=ledgesec.conf
DEFAULT_BASE=https://dash.ledgesec.com

DRY=0
UNINSTALL=0
INSTALL_OPENRESTY=0
SITE_ID=""
EDGE_ID=""
BASE="$DEFAULT_BASE"
RATE="1"
TOKEN_FILE=""
TOKEN=""

usage() {
  cat <<'EOF'
Usage: install.sh [--site-id ID] [--edge-id ID] [--ingest-base URL]
                  [--sample-rate N] [--token-file PATH] [--dry-run]
                  [--uninstall] [--install-openresty]

--token-file is the way to pass LEDGESEC_INGEST_SECRET. --token works, but
the value is visible in the process list. Default ingest base is
https://dash.ledgesec.com. The module posts to /api/v1/observations.
--site-id is the host id from the user's cabinet. Sites come from the Host header.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    --install-openresty) INSTALL_OPENRESTY=1; shift ;;
    --site-id) SITE_ID=${2:?}; shift 2 ;;
    --edge-id) EDGE_ID=${2:?}; shift 2 ;;
    --ingest-base) BASE=${2:?}; shift 2 ;;
    --sample-rate) RATE=${2:?}; shift 2 ;;
    --token-file) TOKEN_FILE=${2:?}; shift 2 ;;
    --token) TOKEN=${2:?}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument" >&2; usage >&2; exit 2 ;;
  esac
done

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LUA_SRC=$script_dir/module/ledgesec

say() { printf '%s\n' "$*" >&2; }

have() { command -v "$1" >/dev/null 2>&1; }

lua_nginx() {
  bin=$1
  "$bin" -V 2>&1 | grep -q ngx_http_lua_module
}

config_file() {
  bin=$1
  "$bin" -t 2>&1 | sed -n 's/.*configuration file \([^ ]*\).*/\1/p' | head -n 1
}

install_openresty() {
  if [ "$DRY" -eq 1 ]; then
    say "would install the openresty package"
    return 0
  fi
  if ! have curl || ! have gpg || ! have apt-get; then
    echo "openresty install needs curl, gpg, and apt-get" >&2
    exit 1
  fi
  . /etc/os-release
  sudo_cmd=""
  if [ "$(id -u)" -ne 0 ]; then sudo_cmd=sudo; fi
  $sudo_cmd mkdir -p /usr/share/keyrings
  curl -fsSL https://openresty.org/package/pubkey.gpg | $sudo_cmd gpg --dearmor -o /usr/share/keyrings/openresty.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/openresty.gpg] http://openresty.org/package/ubuntu ${VERSION_CODENAME} main" \
    | $sudo_cmd tee /etc/apt/sources.list.d/openresty.list >/dev/null
  $sudo_cmd apt-get update -qq >&2
  $sudo_cmd apt-get install -y openresty >&2
}

pick_bin() {
  if [ "$INSTALL_OPENRESTY" -eq 1 ] && ! have openresty; then
    install_openresty
  fi
  if have openresty; then
    command -v openresty
    return 0
  fi
  if have nginx && lua_nginx nginx; then
    command -v nginx
    return 0
  fi
  if have nginx; then
    echo "nginx has no ngx_http_lua_module; refusing to replace it. Pass --install-openresty to add OpenResty beside it." >&2
    exit 1
  fi
  echo "openresty was not found. Pass --install-openresty to add it." >&2
  exit 1
}

read_secret() {
  if [ -n "$TOKEN_FILE" ]; then
    TOKEN=$(sed -n '1p' "$TOKEN_FILE" | tr -d '\r')
    return 0
  fi
  if [ -n "$TOKEN" ]; then
    return 0
  fi
  if [ "$DRY" -eq 1 ] || [ "$UNINSTALL" -eq 1 ]; then
    return 0
  fi
  if [ -t 0 ]; then
    printf 'Ingest secret: ' >&2
    IFS= read -r TOKEN
    printf '\n' >&2
    return 0
  fi
  echo "pass --token-file" >&2
  exit 1
}

nginx_user() {
  conf=$1
  user=$(awk '/^[[:space:]]*user[[:space:]]+/ && $1 !~ /^#/ { gsub(/;/, "", $2); print $2; exit }' "$conf")
  if [ -z "$user" ]; then user=nobody; fi
  printf '%s' "$user"
}

write_snippet() {
  dest=$1
  cat > "$dest" <<'EOF'
# Ledgesec observe-only client. Include this file inside http { }.
lua_package_path "/usr/local/ledgesec/lua/?.lua;;";
lua_shared_dict ledgesec_observe 16m;

init_worker_by_lua_block {
    require("ledgesec.observe").start()
}

log_by_lua_block {
    require("ledgesec.observe").note()
}
EOF
}

insert_include() {
  conf=$1
  snippet=$2
  python3 - "$conf" "$snippet" <<'PY'
import pathlib, sys
conf, snippet = sys.argv[1:]
path = pathlib.Path(conf)
text = path.read_text()
needle = f"include {snippet};"
if needle in text:
    sys.exit(0)
lines = text.splitlines(True)
out = []
done = False
for line in lines:
    out.append(line)
    if not done and line.lstrip().startswith("http") and "{" in line and not line.lstrip().startswith("#"):
        out.append(f"    {needle}\n")
        done = True
if not done:
    sys.exit(1)
backup = path.with_name(path.name + ".ledgesec-bak")
if not backup.exists():
    backup.write_text(text)
path.write_text("".join(out))
PY
}

remove_include() {
  conf=$1
  python3 - "$conf" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
if not path.exists():
    sys.exit(0)
text = path.read_text()
for line in (
    "    include /etc/ledgesec/ledgesec.conf;\n",
    "include /etc/ledgesec/ledgesec.conf;\n",
    "    include /etc/nginx/conf.d/ledgesec.conf;\n",
    "include /etc/nginx/conf.d/ledgesec.conf;\n",
):
    text = text.replace(line, "")
path.write_text(text)
PY
}

reload_if_ok() {
  bin=$1
  if ! "$bin" -t >/dev/null 2>&1; then
    echo "config test failed; not reloading" >&2
    "$bin" -t >&2 || true
    exit 1
  fi
  if "$bin" -s reload >/dev/null 2>&1; then
    say "reloaded"
    return 0
  fi
  say "config test passed; process was not reloaded"
}

uninstall() {
  bin=$(pick_bin)
  conf=$(config_file "$bin")
  say "would remove $PREFIX/lua, $ENV_FILE, and the include snippet"
  if [ "$DRY" -eq 1 ]; then
    return 0
  fi
  if [ "$(id -u)" -ne 0 ]; then
    echo "uninstall needs root" >&2
    exit 1
  fi
  rm -rf "$PREFIX/lua"
  rm -f "$ENV_FILE" /etc/ledgesec/ledgesec.conf /etc/nginx/conf.d/ledgesec.conf
  if [ -n "$conf" ]; then remove_include "$conf"; fi
  rmdir /etc/ledgesec 2>/dev/null || true
  reload_if_ok "$bin"
}

install_all() {
  bin=$(pick_bin)
  conf=$(config_file "$bin")
  if [ -z "$EDGE_ID" ]; then EDGE_ID=$(hostname | tr -cd 'A-Za-z0-9._-' | cut -c1-64); fi
  if [ -z "$EDGE_ID" ]; then EDGE_ID=module; fi
  case "$BASE" in
    */) url=${BASE}api/v1/observations ;;
    *) url=$BASE/api/v1/observations ;;
  esac
  case "$url" in
    */v1/observations) ;;
    *) url=$BASE/api/v1/observations ;;
  esac
  say "binary $bin"
  say "config ${conf:-unknown}"
  say "lua $PREFIX/lua/ledgesec/"
  say "env $ENV_FILE mode 600"
  say "ingest $url"
  say "site $SITE_ID"
  say "edge $EDGE_ID"
  say "sample-rate $RATE"
  if [ "$DRY" -eq 1 ]; then
    say "dry-run"
    return 0
  fi
  if [ "$(id -u)" -ne 0 ]; then
    echo "install needs root" >&2
    exit 1
  fi
  if [ -z "$SITE_ID" ]; then
    echo "pass --site-id" >&2
    exit 1
  fi
  read_secret
  if [ -z "$TOKEN" ]; then
    echo "empty secret" >&2
    exit 1
  fi
  mkdir -p "$PREFIX/lua/ledgesec" /etc/ledgesec
  cp "$LUA_SRC/observe.lua" "$LUA_SRC/probes.lua" "$LUA_SRC/token.lua" "$PREFIX/lua/ledgesec/"
  umask 077
  tmp=$(mktemp)
  {
    printf '%s\n' "LEDGESEC_INGEST_SECRET=$TOKEN"
    printf '%s\n' "LEDGESEC_SITE_ID=$SITE_ID"
    printf '%s\n' "LEDGESEC_EDGE_ID=$EDGE_ID"
    printf '%s\n' "LEDGESEC_INGEST_URL=$url"
    printf '%s\n' "LEDGESEC_SAMPLE_RATE=$RATE"
  } > "$tmp"
  install -m 600 "$tmp" "$ENV_FILE"
  rm -f "$tmp"
  user=$(nginx_user "$conf")
  chown "$user":"$user" "$ENV_FILE" 2>/dev/null || chown "$user" "$ENV_FILE"
  snippet=/etc/ledgesec/ledgesec.conf
  if [ -n "$conf" ] && grep -qE 'include[[:space:]]+/etc/nginx/conf.d/\*\.conf' "$conf"; then
    snippet=/etc/nginx/conf.d/ledgesec.conf
    write_snippet "$snippet"
  else
    write_snippet "$snippet"
    if [ -n "$conf" ]; then insert_include "$conf" "$snippet"; fi
  fi
  TOKEN=""
  reload_if_ok "$bin"
}

if [ "$UNINSTALL" -eq 1 ]; then
  uninstall
else
  install_all
fi
