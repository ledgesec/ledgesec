# API

FastAPI and Pydantic. Access (an admin, a user, a site, a session) is SQLAlchemy 2 and Postgres. Alembic builds the schema when the process starts. Observation (an event, a path, a probe) uses its own ClickHouse client, and Alembic does not touch it. A probe mark is one domain rule and is computed when the journal is read. It is not written into the journal or into SQL. An edge certificate is a separate model, and it does not describe the journal.

The `api` container sits on the compose network. It is not published outside: the edge proxies `/api/` only from `dash.ledgesec.com`. The browser does not talk to Postgres or ClickHouse.

`GET /health` checks both databases and writes `ingest: ok` only when the ingest secret is set. It does not return the value. `POST /v1/observations` accepts a batch from the module when the `X-Ledgesec-Mac` header matches `LEDGESEC_INGEST_SECRET`.

The other reads require a session. An admin sees addresses. A site user sees their own paths, without addresses. The probe mark is computed when the journal is read. It is not written into the journal on its own.

An admin is a row in `users`. The API does not create that row on startup. Once, in the `api` container:

```bash
python create_admin.py you@example.com
```

The password is asked for and is not stored in the clear. Shorter than 12 characters is refused. Running it again with the same address changes nothing.
