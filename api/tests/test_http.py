import hashlib
import hmac
import json
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.access.models import User
from app.access.passwords import hash_password
from app.access.sessions import sign_session
from app.db import get_db
from app.main import create_app
from app.observation.summary import summarize

SECRET = "session-secret"
USER_ID = "ab" * 8


class Holder:
    def __init__(self):
        self.user = None
        self.fail = False


class FakeDb:
    def __init__(self, holder):
        self.holder = holder

    def _boom(self):
        if self.holder.fail:
            raise RuntimeError("postgres")

    def scalar(self, _statement):
        self._boom()
        return self.holder.user

    def get(self, _model, ident):
        self._boom()
        user = self.holder.user
        if user is not None and user.id == ident:
            return user
        return None

    def scalars(self, _statement):
        self._boom()
        return self

    def all(self):
        if self.holder.user is None:
            return []
        return [self.holder.user]

    def add(self, _row):
        return None

    def commit(self):
        return None

    def rollback(self):
        return None


def admin():
    return User(
        id=USER_ID,
        email="admin@example.com",
        password_hash=hash_password("correct horse battery"),
        role="admin",
        site_id=None,
    )


def client_for(holder):
    app = create_app(prepare=False)

    def _db():
        yield FakeDb(holder)

    app.dependency_overrides[get_db] = _db
    return TestClient(app)


def event_row():
    return {
        "ts": "2026-10-21T16:00:00.000000Z",
        "site_id": "demo",
        "edge_id": "eu",
        "route_group": "document",
        "path": "/.env",
        "decision": "allow",
        "reason": "observe",
        "ip": "203.0.113.10",
        "marker": {"code": "env", "label": "Secret file"},
    }


def test_unknown_path_is_json():
    client = TestClient(create_app(prepare=False))
    response = client.get("/missing")
    assert response.status_code == 404
    assert response.json() == {"error": "not_found"}
    assert response.headers["cache-control"] == "no-store"


def test_session_without_a_cookie_asks_for_sign_in():
    response = TestClient(create_app(prepare=False)).get("/v1/session")
    assert response.status_code == 401
    assert response.json() == {"error": "sign_in"}


def test_sign_in_cookie_opens_the_next_request(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    response = client.post(
        "/v1/session",
        json={"email": "Admin@Example.com", "password": "correct horse battery"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"
    assert response.json()["role"] == "admin"
    assert "HttpOnly" in response.headers["set-cookie"]
    token = response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]
    client.cookies.set("ledgesec_session", token)
    follow = client.get("/v1/session")
    assert follow.status_code == 200
    assert follow.json()["site_id"] == ""


def test_wrong_password_is_refused(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    response = client_for(holder).post(
        "/v1/session",
        json={"email": "admin@example.com", "password": "wrong horse battery"},
    )
    assert response.status_code == 401
    assert response.json() == {"error": "bad_login"}


def test_sign_in_without_a_session_secret(monkeypatch):
    monkeypatch.delenv("LEDGESEC_SESSION_SECRET", raising=False)
    response = client_for(Holder()).post("/v1/session", content=b"{}", headers={"content-length": "2"})
    assert response.status_code == 503
    assert response.json() == {"error": "session_unconfigured"}


def test_postgres_down_on_sign_in(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.fail = True
    response = client_for(holder).post(
        "/v1/session",
        json={"email": "admin@example.com", "password": "correct horse battery"},
    )
    assert response.status_code == 503
    assert response.json() == {"error": "postgres_down"}


def test_logout_clears_the_cookie():
    response = TestClient(create_app(prepare=False)).post("/v1/logout")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_site_user_observations_hide_the_address(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = "demo"
    seen = {}

    def fake(limit, site_id=None):
        seen["limit"] = limit
        seen["site"] = site_id
        return [event_row()]

    monkeypatch.setattr("app.http.observation.fetch_events", fake)
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/observations")
    assert response.status_code == 200
    row = response.json()["observations"][0]
    assert "ip" not in row
    assert row["marker"]["code"] == "env"
    assert seen == {"limit": 40, "site": "demo"}


def test_user_without_a_site_gets_an_empty_journal(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = ""

    def fail(_limit, _site_id=None):
        raise AssertionError("journal should not be read")

    monkeypatch.setattr("app.http.observation.fetch_events", fail)
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/observations")
    assert response.json() == {"observations": []}


def test_admin_summary_and_addresses(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    monkeypatch.setattr("app.http.observation.fetch_summary", lambda site_id=None: summarize([]))
    monkeypatch.setattr("app.http.observation.fetch_events", lambda limit, site_id=None: [event_row()])
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    summary = client.get("/v1/summary")
    assert summary.status_code == 200
    assert summary.json()["window"] == "24h"
    assert len(summary.json()["hours"]) == 24
    addresses = client.get("/v1/addresses")
    assert addresses.status_code == 200
    assert addresses.json()["addresses"][0]["ip"] == "203.0.113.10"
    assert addresses.json()["addresses"][0]["probe_label"] == "Secret file"


def test_site_user_cannot_list_addresses(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = "demo"
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/addresses")
    assert response.status_code == 401
    assert response.json() == {"error": "sign_in"}


def test_ingest_accepts_a_signed_batch(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    monkeypatch.setattr("app.http.observation.insert_observations", lambda lines: len(lines))
    monkeypatch.setattr("app.http.observation.filter_monitored", lambda _db, lines: lines)
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    body = json.dumps(
        {
            "site_id": "demo",
            "edge_id": "eu",
            "events": [{"ts": now_ms, "path": "/pricing", "host": "shop.example", "ip": "203.0.113.10"}],
        }
    ).encode()
    mac = hmac.new(b"secret", body, hashlib.sha256).hexdigest()
    response = TestClient(create_app(prepare=False)).post(
        "/v1/observations",
        content=body,
        headers={"x-ledgesec-mac": mac, "content-length": str(len(body))},
    )
    assert response.status_code == 202
    assert response.json()["stored"] == 1


def test_ingest_rejects_a_bad_signature(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    body = b'{"site_id":"demo","events":[{"ts":1,"path":"/"}]}'
    response = TestClient(create_app(prepare=False)).post(
        "/v1/observations",
        content=body,
        headers={"x-ledgesec-mac": "ab" * 32, "content-length": str(len(body))},
    )
    assert response.status_code == 401
    assert response.json() == {"error": "bad_mac"}


def test_health_reports_both_stores(monkeypatch):
    monkeypatch.setattr("app.http.health.postgres_ready", lambda: None)
    monkeypatch.setattr("app.http.health.clickhouse_ready", lambda: None)
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    response = TestClient(create_app(prepare=False)).get("/health")
    assert response.status_code == 200
    assert response.json() == {"postgres": "ok", "clickhouse": "ok", "ingest": "ok"}


def test_health_degrades_when_a_store_is_down(monkeypatch):
    def down():
        raise RuntimeError("down")

    monkeypatch.setattr("app.http.health.postgres_ready", down)
    monkeypatch.setattr("app.http.health.clickhouse_ready", lambda: None)
    monkeypatch.delenv("LEDGESEC_INGEST_SECRET", raising=False)
    response = TestClient(create_app(prepare=False)).get("/health")
    assert response.status_code == 503
    assert response.json() == {"postgres": "down", "clickhouse": "ok", "ingest": "disabled"}


def test_admin_can_refuse_a_short_site_user(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post(
        "/v1/users",
        json={"email": "person@example.com", "password": "short", "site_id": "demo"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "bad_user"}


def test_admin_adds_an_nginx_host(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    monkeypatch.setattr(
        "app.http.access.create_host",
        lambda _db, label, collector: {"id": "abcd1234", "label": label.strip(), "collector": collector, "sites": []},
    )
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post("/v1/hosts", json={"label": " Shop ", "collector": "nginx"})
    assert response.status_code == 201
    assert response.json()["id"] == "abcd1234"
    assert response.json()["collector"] == "nginx"
    assert response.json()["sites"] == []


def test_a_site_user_cannot_add_a_host(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = "demo"
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post("/v1/hosts", json={"label": "Shop", "collector": "nginx"})
    assert response.status_code == 401
    assert response.json() == {"error": "sign_in"}


def test_apache_is_not_available_yet(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post("/v1/hosts", json={"label": "Shop", "collector": "apache"})
    assert response.status_code == 400
    assert response.json() == {"error": "unavailable"}
