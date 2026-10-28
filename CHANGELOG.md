# Changelog

The product number lives in `VERSION`. Closed work raises the patch. A person sets the minor and the major by hand. The HTTP contract stays `/v1` until it breaks: a new capability does not open `/v2`.

## Unreleased

- The movement detector decides separately by address and by fingerprint. A red mark blocks its own subject at once, and the rest accumulate a score up to a threshold. Accepting a batch does not apply that decision.
- The mouse and scroll trail is two percent. A straight path and even steps set fingerprint marks. The points are not written to the journal.

## 0.1.21

- A demo note that reached Telegram shows as sent. Clearing the form does not report that the note failed.

## 0.1.20

- The public site loads Google Analytics. The cabinets do not.

## 0.1.19

- Diagrams on the public pages show the journal: the request continues, a copy of the line is kept, and the rest stays out.
- On a phone, documentation code samples scroll inside the block and do not widen the page.
- The demo form can say how to reply: email, Telegram, or WhatsApp.
- On the home page, probe history plays one example of 50 lines for shop.example: first the five oldest, then every few seconds one to three newer ones, with a red flash and the country lit on the map. Visitor addresses are not there.
- The changelog and the Cursor rules are in English.

## 0.1.18

- On the home page, a section on who the journal helps and when: the server, the site owner, an admin; a scan, a kept line, and the request still arrives.
- For crawlers: `robots.txt` closes the cabinets, `llms.txt` and `llms-full.txt` describe the journal, and `humans.txt` names the site and the source.
- Public pages keep one spacing: the edge matches the header, then the title, the lede, the cards, and the button. The blog lines up to the same edge.
- On the public site background, a warm glow and rust specks wander slowly. With motion turned off they stay still.
- A Pricing page: self-hosted is the current journal, Premium is work on request. The note is marked `premium`.
- Future pages: ten pains, and ten ideas on each. The demo form names the pain with the `interest` field.
- The public site is dark. About, Product, and Demo pages. The demo form writes to Telegram when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set. The `ledgesec.com` edge sends `POST /api/v1/contact` to the API.

## 0.1.17

- The public page describes the access-log journal. Probe history shows the country and the User-Agent. The site has no addresses. Cabinet examples are drawn for shop.example.
- The site and the README show the layout: the journal in Europe, New York without the databases. Three connections: OpenResty, the Linux daemon, and Coolify.

## 0.1.16

- The European edge writes the Caddy access log. The host daemon `eu-ledgesec` reads it and posts the same batch. An edge check, a poll of the summary, the journal, and RPS, and posting a batch do not land in the journal.

## 0.1.15

- The summary marks paths with one template index and reads a path's count and time in one pass. Twelve slow paths are chosen from that list. The mark is still computed when the journal is read.

## 0.1.14

- The cabinet build passes the type check: the RPS chart refresh period comes from the same list as the rest of the cabinet.

## 0.1.13

- The summary does not expand every path by hour and by edge. Slow paths are read by a separate short query, and the probe share by hour does not repeat the path. The mark is still computed when the journal is read, once per path.

## 0.1.12

- The Markers page shows the whole template catalog. Only a template added with the button can be deleted.
- Names from the web-shell scan, including `/bless.php`, `/wp.php`, and `/a.php`, receive a type when the journal is read. `/.well-known` does not become a mark.
- The summary reads the journal in three queries: without a path, by path, and probes only. The mark is still computed when the journal is read.
- The live table and the RPS chart do not send the next request until the previous one has returned.
- Reading the journal for one signed-in user is limited: the cabinet gets through, and a tight loop receives `busy`.

## 0.1.11

- The ClickHouse journal is given 2 GB. At the 1 GB limit, reading the summary was cut off.

## 0.1.10

- A slow first answer from the journal does not replace rows that search already found.
- Leaving request search for Overview does not mix the filtered page into the main feed.
- The Actions menu on the dark panel reads in light text.
- The summary does not pile up: the next request waits for the current one to finish, and a repeat within a second takes the same calculation. Four journal reads go together.
- The Actions button sits in the address cell, above the address itself.
- Under Probes an admin has two items: All probes and Markers. The probe list and the templates are no longer on one screen.
- The Columns menu on the dark panel reads in light text.
- A `.git` copy inside a directory and through `../`, `/.env_sample`, `sftp.json`, `docker-compose.prod.yml`, `/config/database.php`, and `/config/app.php` receive a type when the journal is read. `/.gitignore`, `/config.json`, and `/config.php` do not become a mark.

## 0.1.9

- While a write is in flight, the button shows a loader and cannot be pressed. The label stays. Sign-in, adding a host and a mark, deleting a host, enabling a site, and signing out behave this way.
- WordPress directories and web-shell names from the scan receive a type when the journal is read. `/.well-known/` and an ordinary `/index.php` do not become a mark.
- A click on an address writes it into search, and the request table shows that row above the rows and highlights the match in the cell.
- The country pulse on the map is drawn over the fill and reaches the screen: the animation class lives in the styles, not in a utility the build was dropping.
- On the requests-by-hour chart, the red share of a bar is probes. The height of the bar stays the request count.
- Overview shows RPS for the chosen period: an hour, 3 hours, 6, 12, and a day. For an hour a point is a minute, and on a longer period the step is larger.
- Probe templates live in Postgres. An admin adds a template on the Probes page: a label, how to compare, and the template itself. The mark is computed when the journal is read, and a path already written is marked again.
- Table search does not fire on every character, only after a pause. Until the answer arrives, the rows already shown are dimmed and stay on screen.
- In the cabinet tables, columns hide from the Columns menu. The width stretches from the right edge of the header, a double click restores it, and the browser remembers the setting. The last column stays.
- A Firebase key and a GCP key, a copy `.env1` and `.env_copy`, `/_environment`, and spare phpinfo names receive a type when the journal is read. `/.environment` does not become a mark.
- A Spring config, `composer.lock`, and `configuration.php` receive a type when the journal is read. A `.bak` copy and a file inside a directory do too. `/composer.json` and `/application.js` do not become a mark.
- A cloud key is found outside the root as well: `/root/.aws/`, `/home/*/.aws/`, gcloud, a service account, metadata, Azure, and Bedrock. A `*.env` file with a secret, a Laravel log, `/_profiler`, and an AI config also receive a type. `/config.php` and `/config.js` do not become a mark, and a copy `/config.php.bak` does.

## 0.1.8

- On the country map, a new request gives that country a light green pulse. A probe and another mark pulse red. The fill by request count stays.
- Cabinet tabs sit on the address. Locally that is `/dashboard/probes` and `/admin/addresses`; on dash and admin it is the same path tail. Overview stays the cabinet root. A request by path or by address opens Requests with that filter in the address.
- Cabinet tables have search and a filter on the row fields: site, path, country, mark, and, for an admin, the edge and the address. Requests and addresses are searched in the journal, not only on the open page. Search and the filter live in the page address.
- Until the API answer arrives, the cabinet keeps a frame and covers the values with a skeleton: the Recording badge, the cards, the tables, the chart, and the map. An empty answer and an error stay as text. A repeat request does not hide numbers already shown.
- A sweep for secrets receives a type when the journal is read: `/.env~` and `/.env-sample`, `sendgrid.env`, cloud keys, `appsettings`, a Docker and npm config, a pipeline, editor settings, `phpinfo`, and `installed.json`. Ordinary `/app.js`, `/index.js`, `/composer.json`, and `/config.json` do not become a mark. A path already written is marked again, and the journal row is not rewritten.
- On a Coolify host, a site is only the name the proxy passed to the application. A request that hit the catch-all stays in the journal and does not enter the site list.
- A secret mark is also set on `/.env` inside a directory: `/redis/.env`, `/ci/.env`. The name `/.environment` does not become a mark.
- A new row in the live table flashes dark green and fades back to the ordinary background. On Overview, Latest requests keeps only the latest 30. There is no address list on Overview.
- The country code is taken from a local GeoIP file. A row already written is not rewritten: the cabinet fills an empty code from the same file. A new batch writes the code at once.
- A journal row keeps the method, the status, the User-Agent, the response size, the protocol, and TLS. The Referer, the body, the cookie, and the query are not written.

## 0.1.7

- A journal row holds the request time, `request_time_ms`. The module sends it from nginx. The daemon reads `$request_time` on the nginx line and `Duration` in the proxy log. Zero means the collector did not send a time. Advice about a path is not built from this field yet.
- The Coolify collector reads the proxy log and posts the same batch. The request is not changed. One process per server, and each domain becomes a site.
- A host is the whole web server. A request for a name or a path the server does not have stays in the journal: that is how a scan shows up.
- On Overview and Requests, a user sees the requests of their hosts, without addresses.
- Reading the journal no longer fails: the ClickHouse query is sent as POST.
- On Overview an admin sees a country map, the total RPS, and the RPS of each domain for the last minute.
- An admin sees the addresses that checked in. An address has an Actions button: details, the requests, and copy. Block and challenge are visible and switched off: observation does not stop a request.
- Journal tables page with a cursor. A page is 500 rows, with Prev and Next.
- The home page shows a cabinet sample: cards, probes, and a country map. The site has no live journal.
- The cabinet sidebar has a shield, a recording badge, and items with the current one marked. The badge shows requests, probes, and RPS for what is already in the journal.
- Switching a cabinet section shows the Threatrix radar while the screen opens.
- Overview refreshes once a second. A new request flashes green and returns to its ordinary color. The interval is 1, 5, 10, 30, 60, or Never.
- Probes, requests, and sites are separate live pages of the same journal. A probe path and a slow path open the requests for that path. A site shows its requests and probes for the day, and RPS for the minute. The edge is visible to an admin. A request row shows the time when the collector sent it. Requests and Addresses refresh on the same interval while the first page is open.

## 0.1.6

- After install, the wizard waits for the first site and closes when the name arrives.
- The Linux daemon reads the nginx log and posts the same batch. The request is not changed, and nginx's own blocking is left as it is.
- The agent carries the number from `VERSION`. A batch names the build, and the cabinet shows the number that arrived with the host.

## 0.1.5

- A user on dash has an Add host button. The host belongs to that user. An admin sees everyone's hosts.
- An API scenario goes through the service, and reading and writing go through the repository. The route accepts the request and returns the response.
- The cabinet sidebar shows the number from `VERSION`.
- A host can be deleted. That host's journal stays. A row lives for 3 years.
- When an admin adds a host, they attach it to a user. A user still receives a host of their own. That user sees the module install lines, in their own cabinet.
- An error code lives as a constant: `app/codes.py` in the API, `shared/lib/api-error.ts` in the cabinet.

## 0.1.4

- An admin adds a host through the wizard: the name, how it reports, and the nginx install. DNS, the daemon, and Apache are listed and are not available yet.
- A site on a host appears from the Host name in a batch. A disabled site is not written further.
- The country of a request is taken at ingest from a local GeoIP database. Without the file the code is empty. There is no map.

## 0.1.3

- The cabinets are split across hosts. `dash.ledgesec.com` is the customer, `admin.ledgesec.com` is the admin.
- Both use the dark Threatrix shell in the same Next.js application. The template's demo screens are not connected.
- Sign-in checks the email and the password with a Zod schema before the request. The error text does not change the height of the card.

## 0.1.2

- An observation client for OpenResty: `log_by_lua` puts a short record in `lua_shared_dict`, and a timer sends `POST https://dash.ledgesec.com/api/v1/observations` with `X-Ledgesec-Mac`.
- A probe and a response from 400 always go out; the rest go out at 1%. The probe list is taken from `classify()`.
- When ingest fails, the batch stays in the ring. The body, the cookie, the query, Authorization, and the Referer are not written.

## 0.1.1

- A Postgres password that contains a space reaches SQLAlchemy. Before, the space became `+` in the URL, sign-in to the database failed, the API did not become healthy, and Caddy did not open 80 and 443.

## 0.1.0

The first tagged version. Before it, commits landed on main without a number.

- The site, the blog, and sign-in on dash are one Next.js application.
- One session covers an admin and a site user. An admin is a row in Postgres and is not created at startup.
- The API is FastAPI and Pydantic. The Postgres schema is Alembic. The journal is ClickHouse, with its own client.
- A batch is accepted by HMAC, the probe mark is computed when the journal is read, and the summary covers 24 hours.
