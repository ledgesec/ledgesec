import hashlib
import hmac
import json
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.access.models import Host, User
from app.access.passwords import hash_password
from app.access.sessions import sign_session
from app.db import get_db
from app.main import create_app
from app.observation.addresses import address_panel
from app.observation.summary import summarize

SECRET = "session-secret"
USER_ID = "ab" * 8


class Holder:
    def __init__(self):
        self.user = None
        self.fail = False
        self.hosts = None


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
        if self.holder.hosts is not None:
            return self.holder.hosts
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
    holder.user.site_id = ""
    holder.hosts = [Host(id="f274178d", label="web7.pro", collector="linux", owner_id=USER_ID)]
    seen = {}

    def fake(host_ids=None, cursor=None, direction="next", ip=None, path=None, **extra):
        seen["hosts"] = host_ids
        seen["cursor"] = cursor
        seen["direction"] = direction
        seen["ip"] = ip
        seen["path"] = path
        seen["extra"] = extra
        return [event_row()], None, None

    monkeypatch.setattr("app.http.observation.fetch_event_page", fake)
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/observations")
    assert response.status_code == 200
    row = response.json()["observations"][0]
    assert "ip" not in row
    assert row["marker"]["code"] == "env"
    assert response.json()["next"] is None
    assert response.json()["prev"] is None
    assert seen["hosts"] == ["f274178d"]
    assert seen["ip"] is None
    assert seen["extra"]["wide"] is False
    assert seen["extra"]["q"] is None
    assert seen["extra"]["edge"] is None


def test_user_without_a_host_gets_an_empty_journal(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = ""

    def fail(*_args, **_kwargs):
        raise AssertionError("journal should not be read")

    monkeypatch.setattr("app.http.observation.fetch_event_page", fail)
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/observations")
    assert response.json() == {"observations": [], "next": None, "prev": None}


def test_admin_summary_and_addresses(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    monkeypatch.setattr("app.http.observation.fetch_summary", lambda site_id=None: summarize([]))
    monkeypatch.setattr(
        "app.http.observation.fetch_address_page",
        lambda cursor=None, direction="next", **_extra: (address_panel([event_row()]), "next-cursor", None),
    )
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
    assert addresses.json()["next"] == "next-cursor"
    assert addresses.json()["prev"] is None


def test_rates_follow_the_chosen_window(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    seen = {}

    def fake(host_ids=None, window="1h"):
        seen["hosts"] = host_ids
        seen["window"] = window
        return {"window": window, "step": 60, "points": [{"at": "2026-10-22 18:07:00", "requests": 60, "rps": 1.0}]}

    monkeypatch.setattr("app.http.observation.fetch_rates", fake)
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.get("/v1/rates?window=1h")
    assert response.status_code == 200
    assert response.json()["window"] == "1h"
    assert response.json()["points"][0]["rps"] == 1.0
    assert seen["window"] == "1h"
    assert seen["hosts"] is None
    rejected = client.get("/v1/rates?window=2h")
    assert rejected.status_code == 400
    assert rejected.json()["error"] == "bad_window"


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
    seen = {}

    def assign(_db, actor, label, collector, owner_id):
        seen["role"] = actor.role
        seen["owner"] = owner_id
        return {"id": "abcd1234", "label": label.strip(), "collector": collector, "sites": []}

    monkeypatch.setattr("app.http.access.assign_host", assign)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post(
        "/v1/hosts",
        json={"label": " Shop ", "collector": "nginx", "owner_id": "cd" * 8},
    )
    assert response.status_code == 201
    assert response.json()["id"] == "abcd1234"
    assert response.json()["collector"] == "nginx"
    assert response.json()["sites"] == []
    assert seen == {"role": "admin", "owner": "cd" * 8}


def test_an_admin_must_choose_an_account(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post("/v1/hosts", json={"label": "Shop", "collector": "nginx"})
    assert response.status_code == 400
    assert response.json() == {"error": "bad_owner"}


def test_an_unknown_account_cannot_own_a_host(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post(
        "/v1/hosts",
        json={"label": "Shop", "collector": "nginx", "owner_id": "cd" * 8},
    )
    assert response.status_code == 404
    assert response.json() == {"error": "not_found"}


def test_a_site_user_adds_their_own_host(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    seen = {}

    def assign(_db, _actor, label, collector, _owner_id):
        seen["owner"] = _actor.id
        return {"id": "abcd1234", "label": label, "collector": collector, "sites": []}

    monkeypatch.setattr("app.http.access.assign_host", assign)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = "demo"
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post("/v1/hosts", json={"label": "Shop", "collector": "nginx"})
    assert response.status_code == 201
    assert seen["owner"] == USER_ID


def test_apache_is_not_available_yet(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.post(
        "/v1/hosts",
        json={"label": "Shop", "collector": "apache", "owner_id": USER_ID},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "unavailable"}


def test_a_site_user_deletes_their_own_host(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    seen = {}

    def remove(_db, host_id, owner_id):
        seen["host"] = host_id
        seen["owner"] = owner_id

    monkeypatch.setattr("app.http.access.remove_host", remove)
    holder = Holder()
    holder.user = admin()
    holder.user.role = "user"
    holder.user.site_id = "demo"
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.delete("/v1/hosts/abcd1234")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert seen == {"host": "abcd1234", "owner": USER_ID}


def test_a_missing_host_cannot_be_deleted(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)

    def remove(_db, _host_id, _owner):
        raise LookupError("missing")

    monkeypatch.setattr("app.http.access.remove_host", remove)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.delete("/v1/hosts/abcd1234")
    assert response.status_code == 404
    assert response.json() == {"error": "not_found"}


def test_a_bad_host_id_is_refused(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    holder = Holder()
    holder.user = admin()
    client = client_for(holder)
    client.cookies.set("ledgesec_session", sign_session(USER_ID))
    response = client.delete("/v1/hosts/bad%20id")
    assert response.status_code == 400
    assert response.json() == {"error": "bad_host"}
