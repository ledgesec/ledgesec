import json

import pytest

from app.access.hosts import create_host, set_site_enabled, split_monitored
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


def test_site_name_is_the_hostname_without_a_port():
    assert site_name("Shop.Example:443") == "shop.example"
    assert site_name("shop.example.") == "shop.example"
    assert site_name("") == ""
    assert site_name("not a host") == ""
    assert site_name("[2001:db8::1]") == ""


def test_create_host_keeps_nginx_and_a_short_id():
    db = Mem()
    row = create_host(db, "  Shop   EU  ", "nginx")
    assert row["label"] == "Shop EU"
    assert row["collector"] == "nginx"
    assert row["sites"] == []
    assert SITE_ID.match(row["id"])
    assert db.committed
    assert db.rows[0].id == row["id"]


def test_a_blank_label_and_an_unavailable_collector_are_refused():
    with pytest.raises(ValueError, match="bad_host"):
        create_host(Mem(), "   ", "nginx")
    with pytest.raises(ValueError, match="unavailable"):
        create_host(Mem(), "Shop", "dns")
    with pytest.raises(ValueError, match="unavailable"):
        create_host(Mem(), "Shop", "linux")
    with pytest.raises(ValueError, match="unavailable"):
        create_host(Mem(), "Shop", "apache")


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


def test_country_is_an_iso_code_or_empty(monkeypatch):
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: "de")
    assert country_of("203.0.113.10") == "DE"
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: "Germany")
    assert country_of("203.0.113.10") == ""
    monkeypatch.setattr("app.observation.geo.lookup_country", lambda _ip: None)
    assert country_of("203.0.113.10") == ""
