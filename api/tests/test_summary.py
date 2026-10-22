from datetime import UTC, datetime

import pytest

from app.http.schemas import SummaryOut
from app.observation.clickhouse import clickhouse_call
from app.observation.repository import (
    count_query,
    country_query,
    events_ttl,
    minute_ttl,
    open_country_query,
    rate_query,
)
from app.observation.summary import CountRow, summarize, with_rates


def test_summary_uses_the_marker_rule_not_a_second_sql_copy():
    now = datetime(2026, 10, 21, 16, 40, tzinfo=UTC)
    body = summarize(
        [
            CountRow("/.env", "2026-10-21 16:00:00.000", "eu", "demo", 2),
            CountRow("/pricing", "2026-10-21T15:00:00", "us", "demo", 3),
            CountRow("/wp-login.php", "2026-10-21 16:00:00", "eu", "other", 1),
        ],
        now,
    )
    SummaryOut.model_validate(body)
    assert body["requests"] == 6
    assert body["probes"] == 3
    assert body["sites"] == 2
    assert body["edges"] == [
        {"id": "eu", "requests": 3, "probes": 3},
        {"id": "us", "requests": 3, "probes": 0},
    ]
    assert body["by_site"] == [
        {"name": "demo", "requests": 5, "probes": 2},
        {"name": "other", "requests": 1, "probes": 1},
    ]
    assert body["slow"] == []
    assert body["hours"][-1] == {"hour": "2026-10-21 16:00:00", "requests": 3, "probes": 3}
    assert body["hours"][-2] == {"hour": "2026-10-21 15:00:00", "requests": 3, "probes": 0}
    assert len(body["hours"]) == 24
    assert body["markers"] == [
        {"path": "/.env", "label": "Secret file", "count": 2},
        {"path": "/wp-login.php", "label": "Login probe", "count": 1},
    ]


def test_empty_window_is_twenty_four_zero_hours():
    now = datetime(2026, 10, 21, 16, tzinfo=UTC)
    body = summarize([], now)
    assert body["requests"] == 0
    assert body["probes"] == 0
    assert len(body["hours"]) == 24
    assert body["hours"][0]["hour"] == "2026-10-20 17:00:00"
    assert body["hours"][-1]["hour"] == "2026-10-21 16:00:00"


def test_count_query_filters_by_owned_hosts_and_does_not_encode_probe_rules():
    sql, params = count_query(None)
    assert params == {}
    assert "count()" in sql
    assert "sum(request_time_ms)" in sql
    assert "max(request_time_ms)" in sql
    assert "phpmyadmin" not in sql
    assert "/.env" not in sql
    scoped, scoped_params = count_query(["f274178d", "abcd1234"])
    assert scoped_params == {}
    assert "host_id IN ('f274178d', 'abcd1234')" in scoped
    with pytest.raises(ValueError):
        count_query(["bad site"])
    with pytest.raises(ValueError):
        count_query([])


def test_a_journal_row_lives_for_three_years_and_is_not_deleted_by_hand():
    events = events_ttl()
    minutes = minute_ttl()
    assert "INTERVAL 3 YEAR" in events
    assert "INTERVAL 3 YEAR" in minutes
    assert "DELETE" not in events
    assert "DELETE" not in minutes
    assert "30 DAY" not in events
    assert "180 DAY" not in minutes


def test_slow_paths_average_the_recorded_time_and_keep_a_probe_label():
    body = summarize(
        [
            CountRow("/pricing", "2026-10-21 16:00:00", "us", "demo", 4, time_ms=800, max_ms=500),
            CountRow("/wp-login.php", "2026-10-21 16:00:00", "eu", "demo", 1, time_ms=100, max_ms=100),
            CountRow("/.env", "2026-10-21 16:00:00", "eu", "demo", 2),
        ],
        datetime(2026, 10, 21, 16, tzinfo=UTC),
    )
    SummaryOut.model_validate(body)
    assert body["slow"] == [
        {"path": "/pricing", "label": "", "requests": 4, "avg_ms": 200, "max_ms": 500},
        {"path": "/wp-login.php", "label": "Login probe", "requests": 1, "avg_ms": 100, "max_ms": 100},
    ]


def test_rates_are_requests_in_the_last_minute_by_domain():
    body = with_rates(
        summarize([]),
        [{"site_id": "web7.pro", "count": 30}, {"site_id": "plantagoweb.ru", "count": 6}, {"site_id": "", "count": 9}],
        [{"country": "de", "count": 4}, {"country": "US", "count": 12}, {"country": "x", "count": 3}],
    )
    SummaryOut.model_validate(body)
    assert body["rps"] == 0.6
    assert body["domains"] == [
        {"name": "web7.pro", "requests": 30, "rps": 0.5},
        {"name": "plantagoweb.ru", "requests": 6, "rps": 0.1},
    ]
    assert body["countries"] == [{"code": "US", "requests": 12}, {"code": "DE", "requests": 4}]
    rate_sql, _params = rate_query(["f274178d"])
    country_sql, _country_params = country_query(None)
    assert "INTERVAL 60 SECOND" in rate_sql
    assert "host_id IN ('f274178d')" in rate_sql
    assert "phpmyadmin" not in rate_sql
    assert "country != ''" in country_sql
    open_sql, _open_params = open_country_query(["f274178d"])
    assert "country = ''" in open_sql
    assert "toString(ip)" in open_sql
    assert "host_id IN ('f274178d')" in open_sql


def test_a_clickhouse_query_is_posted(monkeypatch):
    seen = {}

    class Response:
        def read(self):
            return b""

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    def opened(request, timeout=3):
        seen["method"] = request.get_method()
        seen["timeout"] = timeout
        return Response()

    monkeypatch.setenv("CLICKHOUSE_URL", "http://clickhouse:8123")
    monkeypatch.setenv("CLICKHOUSE_PASSWORD", "secret")
    monkeypatch.setattr("app.observation.clickhouse.urllib.request.urlopen", opened)
    clickhouse_call("SELECT 1")
    assert seen == {"method": "POST", "timeout": 3}
