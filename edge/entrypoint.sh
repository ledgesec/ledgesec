#!/bin/sh
set -eu

options="email ${ACME_EMAIL:-shmidtelson@gmail.com}"
if [ "${CADDY_LOCAL_CERTS:-}" = "1" ]; then
    options="${options}
	local_certs"
fi

cat > /etc/caddy/Caddyfile << EOF
{
	${options}
}
import /etc/caddy/site.Caddyfile
EOF

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
