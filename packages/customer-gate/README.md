# Ledgesec gate

The first customers install observation mode. The request reaches their application. `log_by_lua` puts a short record in `lua_shared_dict`. A worker timer posts a batch to `POST https://dash.ledgesec.com/api/v1/observations` with the header `X-Ledgesec-Mac`. The secret is `LEDGESEC_INGEST_SECRET`. `LEDGESEC_SITE_ID` is the host from the cabinet, not each site: a site is created from the Host header. The body, Cookie, query, Authorization, and Referer are not written. This mode has no challenge and no deny. Install with `install.sh`. The example is `module/nginx.conf.example`.

The decision mode, where the contour can stop a request, stays in `ledgesec.gate` and is not turned on for the first customers.

The module is for a site that stays on its own address. The visitor reaches the customer's server. Until the browser has a fresh pass, the request does not reach the application: the module sends the browser to the Ledgesec contour. The contour decides whether to continue.

This does not replace the two A records of the DNS edge. The package is for a place where the A record cannot be changed. The module does not run the customer's zone.

## What goes where

- `module/ledgesec/` is Lua on the customer's OpenResty, in the `access_by_lua` phase. The example is `module/nginx.conf.example`.
- The contour is this Rust binary. It checks the signature, reads the request line, and either returns a pass, shows a confirmation, or refuses.

One secret per site, held by the module and by the contour. The repository has no live secret.

## Decision

A clean address is sent straight back with a pass. A suspect address (the `LEDGESEC_SUSPECT_IPS` list) sees a page and does not reach the application until the browser confirms. A line with a path bypass, a probe, or an injection is refused, without a trip to the origin.

A pass lasts 12 hours and is bound to the site, not to an IP. Static files, `/.well-known/acme-challenge/`, and a plain `OPTIONS` do not reach the contour. A `POST` without a pass does not go to the application: a redirect has no body, so the contour does not see it.

While there is no pass and the contour is down, a new document does not reach the application. A browser that already has a pass goes to the application directly.

## Demo

One process plays both the module and the contour, so the flow opens without OpenResty. It listens only on localhost. The demo secret is not for a live site.

From the monorepo root:

```bash
cargo run -p ledgesec-gate
```

From this directory, `cargo run` is enough. Open `http://127.0.0.1:44721/`.

A live run sets the secret and turns the demo switch off:

```bash
LEDGESEC_SECRET="$(openssl rand -hex 32)" LEDGESEC_SITE_ID=example LEDGESEC_PORT=44721 cargo run
```

`LEDGESEC_DEMO=1` keeps the suspect-address button (`203.0.113.10`). Without that flag, and with the secret set, there is no button.

## Check

```bash
cargo test -p ledgesec-gate
lua5.4 module/check.lua
```

`cargo test` from the root runs the same checks and compares the Lua signature with the contour. Run `lua5.4 module/check.lua` from this directory.
