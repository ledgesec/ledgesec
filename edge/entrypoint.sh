#!/bin/sh
set -eu

mkdir -p /etc/ledgesec/tls
if [ ! -s /etc/ledgesec/tls/fullchain.pem ] || [ ! -s /etc/ledgesec/tls/privkey.pem ]; then
    openssl req -x509 -newkey rsa:2048 \
        -keyout /etc/ledgesec/tls/privkey.pem \
        -out /etc/ledgesec/tls/fullchain.pem \
        -days 2 -nodes -subj "/CN=ledgesec.com"
fi

exec openresty -g "daemon off;"
