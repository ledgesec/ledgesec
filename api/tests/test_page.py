import pytest

from app.codes import Code
from app.observation.page import (
    PAGE,
    decode_address_cursor,
    decode_event_cursor,
    encode_address_cursor,
    encode_event_cursor,
    page_cursors,
)
from app.observation.repository import address_key_query, event_page_query


def test_a_page_is_five_hundred_and_the_cursor_walks_both_ways():
    assert PAGE == 500
    row = {"ts": "2026-10-22T15:00:00.085000Z", "site_id": "web7.pro", "edge_id": "web7", "path": "/.env", "ip": "203.0.113.10"}
    token = encode_event_cursor(row)
    assert decode_event_cursor(token)["path"] == "/.env"
    assert page_cursors(None, None, more=True, started=False, direction="next") == (None, None)
    assert page_cursors("first", "last", more=True, started=False, direction="next") == ("last", None)
    assert page_cursors("first", "last", more=False, started=True, direction="next") == (None, "first")
    assert page_cursors("first", "last", more=True, started=True, direction="prev") == ("last", "first")
    assert page_cursors("first", "last", more=False, started=True, direction="prev") == ("last", None)
    with pytest.raises(ValueError, match=Code.BAD_CURSOR):
        decode_event_cursor(encode_address_cursor(4, "203.0.113.10"))
    with pytest.raises(ValueError, match=Code.BAD_CURSOR):
        decode_address_cursor("not-a-cursor")


def test_the_page_query_keeps_the_bound_in_parameters():
    sql, params = event_page_query(
        ["f274178d"],
        {"t": "2026-10-22T15:00:00.085000Z", "site": "web7.pro", "edge": "web7", "path": "/.env", "ip": "203.0.113.10"},
        "next",
        PAGE + 1,
        "203.0.113.10",
    )
    assert "LIMIT 501" in sql
    assert "phpmyadmin" not in sql
    assert "/.env" not in sql
    assert params["c_path"] == "/.env"
    assert params["f_ip"] == "203.0.113.10"
    assert "host_id IN ('f274178d')" in sql
    address_sql, address_params = address_key_query({"n": 4, "ip": "203.0.113.10"}, "next", PAGE + 1)
    assert "LIMIT 501" in address_sql
    assert "203.0.113.10" not in address_sql
    assert address_params["c_ip"] == "203.0.113.10"


def test_a_path_filter_stays_a_parameter_and_does_not_copy_probe_rules():
    sql, params = event_page_query(None, None, "next", 10, None, "/.env")
    assert params["f_path"] == "/.env"
    assert "/.env" not in sql
    assert "phpmyadmin" not in sql
    assert "path = {f_path:String}" in sql
    assert "request_time_ms" in sql
