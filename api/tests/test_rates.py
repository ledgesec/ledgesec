from datetime import UTC, datetime

import pytest

from app.codes import Code
from app.http.schemas import RatesOut
from app.observation.rates import RATE_WINDOWS, bucket_key, fill_rates, window_of
from app.observation.repository import series_query


def test_one_hour_is_one_point_per_minute():
    now = datetime(2026, 10, 22, 18, 7, 40, tzinfo=UTC)
    points = fill_rates({"2026-10-22 18:07:00": 120}, 3600, 60, now)
    RatesOut.model_validate({"window": "1h", "step": 60, "points": points})
    assert len(points) == 60
    assert points[0]["at"] == "2026-10-22 17:08:00"
    assert points[-1] == {"at": "2026-10-22 18:07:00", "requests": 120, "rps": 2.0}
    assert points[-2] == {"at": "2026-10-22 18:06:00", "requests": 0, "rps": 0.0}


def test_longer_windows_step_up_from_the_minute():
    assert RATE_WINDOWS["1h"] == (3600, 60)
    assert RATE_WINDOWS["3h"] == (3 * 3600, 5 * 60)
    assert RATE_WINDOWS["6h"] == (6 * 3600, 10 * 60)
    assert RATE_WINDOWS["12h"] == (12 * 3600, 15 * 60)
    assert RATE_WINDOWS["24h"] == (24 * 3600, 30 * 60)
    now = datetime(2026, 10, 22, 18, 7, 40, tzinfo=UTC)
    points = fill_rates({"2026-10-22 18:05:00": 300}, *RATE_WINDOWS["3h"], now)
    assert len(points) == 36
    assert points[0]["at"] == "2026-10-22 15:10:00"
    assert points[-1] == {"at": "2026-10-22 18:05:00", "requests": 300, "rps": 1.0}


def test_a_bucket_with_milliseconds_matches_the_minute():
    assert bucket_key("2026-10-22T18:07:00.000Z") == "2026-10-22 18:07:00"


def test_an_unknown_window_is_rejected():
    with pytest.raises(ValueError, match=Code.BAD_WINDOW):
        window_of("2h")
    with pytest.raises(ValueError, match=Code.BAD_WINDOW):
        fill_rates({}, 120, 10)


def test_series_query_buckets_by_the_window_step_and_owned_hosts():
    sql, params = series_query(None, 3600, 60)
    assert params == {}
    assert "toStartOfInterval(ts, INTERVAL 60 SECOND)" in sql
    assert "INTERVAL 3660 SECOND" in sql
    assert "phpmyadmin" not in sql
    scoped, scoped_params = series_query(["f274178d"], 3 * 3600, 5 * 60)
    assert scoped_params == {}
    assert "INTERVAL 300 SECOND" in scoped
    assert "host_id IN ('f274178d')" in scoped
    with pytest.raises(ValueError):
        series_query(["bad site"], 3600, 60)
