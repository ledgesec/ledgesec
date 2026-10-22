import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta

import pytest

from app.observation.ingest import accept_batch, to_ipv6
from app.observation.service import show_ip


def batch(events, site_id="demo", edge_id="eu"):
    return json.dumps({"site_id": site_id, "edge_id": edge_id, "events": events}).encode()


def mac_for(secret, body):
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def test_accept_strips_the_query_and_stores_an_observe_line(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    body = batch(
        [
            {
                "ts": now_ms,
                "path": "/.env?x=1\n",
                "host": "Shop.Example:443",
                "ip": "203.0.113.10",
                "route_group": "nope",
            }
        ]
    )
    lines = accept_batch(mac_for("secret", body), body)
    assert len(lines) == 1
    row = json.loads(lines[0])
    assert row["path"] == "/.env"
    assert row["ip"] == "::ffff:203.0.113.10"
    assert row["route_group"] == "document"
    assert row["decision"] == "allow"
    assert row["reason"] == "observe"
    assert row["site_id"] == "shop.example"
    assert row["host_id"] == "demo"
    assert row["country"] == ""
    assert row["edge_id"] == "eu"


def test_bad_mac_is_refused(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    body = batch([{"ts": 1, "path": "/"}])
    with pytest.raises(PermissionError, match="bad_mac"):
        accept_batch("ab" * 32, body)


def test_ingest_without_a_secret_is_disabled(monkeypatch):
    monkeypatch.delenv("LEDGESEC_INGEST_SECRET", raising=False)
    with pytest.raises(PermissionError, match="ingest_disabled"):
        accept_batch("aa", b"{}")


def test_stale_and_huge_paths_are_dropped(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    stale = int((datetime.now(UTC) - timedelta(days=3)).timestamp() * 1000)
    body = batch([{"ts": stale, "path": "/"}, {"ts": stale, "path": "/" + ("a" * 200)}])
    assert accept_batch(mac_for("secret", body), body) == []


def test_sampled_flag_is_stored(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    body = batch([{"ts": now_ms, "path": "/", "host": "shop.example", "ip": "203.0.113.10", "sampled": True}])
    row = json.loads(accept_batch(mac_for("secret", body), body)[0])
    assert row["sampled"] == 1
    plain = batch([{"ts": now_ms, "path": "/", "host": "shop.example", "ip": "203.0.113.10", "sampled": False}])
    row = json.loads(accept_batch(mac_for("secret", plain), plain)[0])
    assert row["sampled"] == 0


def test_a_thousand_events_fit_and_one_more_does_not(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    events = [{"ts": now_ms, "path": "/", "host": "shop.example", "ip": "203.0.113.10"} for _ in range(1000)]
    body = batch(events)
    assert len(accept_batch(mac_for("secret", body), body)) == 1000
    with pytest.raises(ValueError, match="bad_events"):
        huge = batch(events + [{"ts": now_ms, "path": "/"}])
        accept_batch(mac_for("secret", huge), huge)


def test_a_bad_site_is_rejected(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    body = batch([{"ts": 1, "path": "/"}], site_id="bad site")
    with pytest.raises(ValueError):
        accept_batch(mac_for("secret", body), body)


def test_a_line_without_a_hostname_is_not_a_site(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    body = batch([{"ts": now_ms, "path": "/", "host": ""}])
    assert accept_batch(mac_for("secret", body), body) == []


def test_country_comes_from_the_local_lookup(monkeypatch):
    monkeypatch.setenv("LEDGESEC_INGEST_SECRET", "secret")
    monkeypatch.setattr("app.observation.ingest.country_of", lambda _ip: "DE")
    now_ms = int(datetime.now(UTC).timestamp() * 1000)
    body = batch([{"ts": now_ms, "path": "/", "host": "shop.example", "ip": "203.0.113.10"}])
    row = json.loads(accept_batch(mac_for("secret", body), body)[0])
    assert row["country"] == "DE"
    assert row["host_id"] == "demo"
    assert row["site_id"] == "shop.example"


def test_ipv6_mapping_and_display():
    assert to_ipv6("203.0.113.10") == "::ffff:203.0.113.10"
    assert to_ipv6("not-an-ip") == "::"
    assert show_ip("::ffff:203.0.113.10") == "203.0.113.10"
    assert show_ip("::") == ""
    assert show_ip("2001:db8::1") == "2001:db8::1"
