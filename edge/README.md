# Edge

Caddy in the `edge` container. On the European machine it alone listens on 80 and 443 and issues the certificates for `ledgesec.com`, `www`, `dash.ledgesec.com`, and `admin.ledgesec.com`. The site and the blog use the first two names. `/api/` is open on `dash` and `admin`.

The New York edge is a separate `docker-compose.us.yml`. It has no Postgres, ClickHouse, site, or API. It listens on 80 and 443, with a certificate for `us.ledgesec.com`. Until there is a filter, `/` answers that this is the US East edge.

Do not set `CADDY_LOCAL_CERTS` on the servers. That variable is only for a local run, where public port 80 is not available.
