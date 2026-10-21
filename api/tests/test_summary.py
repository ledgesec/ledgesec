from datetime import UTC, datetime

import pytest

from app.http.schemas import SummaryOut
from app.observation.journal import count_query
from app.observation.summary import CountRow, summarize


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
        {"id": "eu", "requests": 3},
        {"id": "us", "requests": 3},
    ]
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


def test_count_query_filters_by_site_and_does_not_encode_probe_rules():
    sql, params = count_query(None)
    assert params == {}
    assert "count()" in sql
    assert "phpmyadmin" not in sql
    assert "/.env" not in sql
    scoped, scoped_params = count_query("demo")
    assert scoped_params == {"site": "demo"}
    assert "site_id = {site:String}" in scoped
    with pytest.raises(ValueError):
        count_query("bad site")
