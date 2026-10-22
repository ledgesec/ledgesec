import json

import pytest

from app.access.actor import Actor
from app.access.models import Host
from app.access.service import (
    assign_host,
    create_host,
    remember_agent,
    remove_host,
    set_site_enabled,
    split_monitored,
)
from app.ids import SITE_ID, site_name
from app.observation.geo import country_of


class Mem:
    def __init__(self, row=None):
        self.row = row
        self.rows = []
        self.committed = False

    def scalar(self, _statement):
        return self.row

    def add(self, row):
        self.rows.append(row)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.committed = False

    def delete(self, row):
        self.deleted = row


def test_the_host_keeps_the_agent_build():
    row = Host(id="abcd1234", label="Shop", collector="linux", owner_id="user1", agent_version="")

    class Db:
        def scalar(self, _statement):
            return row

        def commit(self):
            self.committed = True

    db = Db()
    remember_agent(db, "abcd1234", "0.1.5")
    assert row.agent_version == "0.1.5"
    assert db.committed
    db.committed = False
    remember_agent(db, "abcd1234", "0.1.5")
    assert db.committed is False
    remember_agent(db, "abcd1234", "")
    assert row.agent_version == "0.1.5"


def test_site_name_is_the_hostname_without_a_port():
    assert site_name("Shop.Example:443") == "shop.example"
    assert site_name("shop.example.") == "shop.example"
    assert site_name("") == ""
    assert site_name("not a host") == ""
    assert site_name("[2001:db8::1]") == ""


def test_create_host_keeps_nginx_and_a_short_id():
    db = Mem()
    row = create_host(db, "  Shop   EU  ", "nginx", "user1")
    assert row["label"] == "Shop EU"
    assert row["collector"] == "nginx"
    assert db.rows[0].owner_id == "user1"
    assert row["sites"] == []
    assert SITE_ID.match(row["id"])
    assert db.committed
    assert db.rows[0].id == row["id"]


def test_a_blank_label_and_an_unavailable_collector_are_refused():
    with pytest.raises(ValueError, match="bad_host"):
        create_host(Mem(), "   ", "nginx", "user1")
    with pytest.raises(ValueError, match="unavailable"):
        create_host(Mem(), "Shop", "dns", "user1")
    row = create_host(Mem(), "Shop", "linux", "user1")
    assert row["collector"] == "linux"
    row = create_host(Mem(), "Shop", "coolify", "user1")
    assert row["collector"] == "coolify"
    with pytest.raises(ValueError, match="unavailable"):
        create_host(Mem(), "Shop", "apache", "user1")


def test_a_new_site_is_kept_and_a_disabled_one_is_dropped():
    rows = [
        {"host_id": "host1", "site_id": "Shop.Example", "path": "/"},
        {"host_id": "host1", "site_id": "old.example", "path": "/admin"},
        {"host_id": "host1", "site_id": "shop.example", "path": "/pricing"},
    ]
    kept, fresh = split_monitored(rows, {"host1"}, {("host1", "old.example"): False})
    assert fresh == [("host1", "shop.example")]
    assert [json.loads(line)["path"] for line in kept] == ["/", "/pricing"]
    assert json.loads(kept[0])["site_id"] == "shop.example"


def test_a_catch_all_host_stays_in_the_journal_and_does_not_become_a_site():
    rows = [
        {"host_id": "host1", "site_id": "www.securitas.com", "path": "/", "routed": False},
        {"host_id": "host1", "site_id": "plantagoweb.com", "path": "/blog/", "routed": True},
    ]
    kept, fresh = split_monitored(rows, {"host1"}, {})
    assert fresh == [("host1", "plantagoweb.com")]
    stored = [json.loads(line) for line in kept]
    assert [row["site_id"] for row in stored] == ["www.securitas.com", "plantagoweb.com"]
    assert all("routed" not in row for row in stored)


def test_an_unknown_host_is_rejected():
    with pytest.raises(ValueError, match="unknown_host"):
        split_monitored([{"host_id": "missing", "site_id": "shop.example"}], set(), {})


def test_turn_monitoring_off_for_a_known_site():
    class Site:
        enabled = True

    row = Site()
    db = Mem(row)
    set_site_enabled(db, "abcd1234", "Shop.Example", False)
    assert row.enabled is False
    assert db.committed


def test_a_missing_site_cannot_be_toggled():
    with pytest.raises(LookupError):
        set_site_enabled(Mem(None), "abcd1234", "shop.example", False)
    with pytest.raises(ValueError, match="bad_site"):
        set_site_enabled(Mem(None), "abcd1234", "not a host", False)


def test_an_admin_binds_the_host_to_the_chosen_user(monkeypatch):
    monkeypatch.setattr("app.access.service.host_id_taken", lambda _db, _host_id: False)
    owner = "ab" * 8

    class Found:
        def __init__(self, user_id: str) -> None:
            self.id = user_id

    monkeypatch.setattr(
        "app.access.service.get_user",
        lambda _db, user_id: Found(user_id) if user_id == owner else None,
    )
    actor = Actor("ff" * 8, "admin@example.com", "admin", "")
    db = Mem()
    assign_host(db, actor, "Shop", "nginx", owner)
    assert db.rows[0].owner_id == owner
    with pytest.raises(ValueError, match="bad_owner"):
        assign_host(Mem(), actor, "Shop", "nginx", "")
    with pytest.raises(LookupError):
        assign_host(Mem(), actor, "Shop", "nginx", "cd" * 8)


def test_the_owner_receives_the_install_secret(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "batch-secret")
    monkeypatch.setattr("app.access.service.host_id_taken", lambda _db, _host_id: False)
    owner = "ab" * 8

    class Found:
        def __init__(self, user_id: str) -> None:
            self.id = user_id

    monkeypatch.setattr(
        "app.access.service.get_user",
        lambda _db, user_id: Found(user_id) if user_id == owner else None,
    )
    user = Actor("useruseruserus11", "person@example.com", "user", "demo")
    created = assign_host(Mem(), user, "Shop", "nginx", "")
    assert created["ingest_secret"] == "batch-secret"
    admin = Actor("ff" * 8, "admin@example.com", "admin", "")
    created = assign_host(Mem(), admin, "Shop", "nginx", owner)
    assert "ingest_secret" not in created


def test_a_site_user_keeps_the_host_even_if_another_owner_is_sent(monkeypatch):
    monkeypatch.setattr("app.access.service.host_id_taken", lambda _db, _host_id: False)
    actor = Actor("useruseruserus11", "person@example.com", "user", "demo")
    db = Mem()
    assign_host(db, actor, "Shop", "nginx", "ab" * 8)
    assert db.rows[0].owner_id == actor.id


def test_removing_a_host_drops_the_row_and_keeps_the_call_in_postgres():
    row = object()
    db = Mem(row)
    remove_host(db, "abcd1234", None)
    assert db.deleted is row
    assert db.committed
    with pytest.raises(LookupError):
        remove_host(Mem(None), "abcd1234", "user1")
    with pytest.raises(ValueError, match="bad_host"):
        remove_host(Mem(None), "bad host", None)


def test_country_is_an_iso_code_or_empty(monkeypatch):
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: "de")
    assert country_of("203.0.113.10") == "DE"
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: "Germany")
    assert country_of("203.0.113.10") == ""
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: None)
    assert country_of("203.0.113.10") == ""
