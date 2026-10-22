from app.codes import Code
from app.observation.addresses import address_panel
from app.observation.geo import noted_country, tally_countries
from app.observation.markers import marker_body
from app.observation.page import (
    PAGE,
    decode_address_cursor,
    decode_event_cursor,
    encode_address_cursor,
    encode_event_cursor,
    page_cursors,
)
from app.observation.repository import (
    address_key_rows,
    address_sample_rows,
    country_rows,
    event_page_rows,
    event_rows,
    insert_events,
    open_country_rows,
    rate_rows,
    summary_rows,
)
from app.observation.summary import CountRow, summarize, with_rates


def show_ip(ip: str | None) -> str:
    text = str(ip or "")
    if text.startswith("::ffff:"):
        return text[7:]
    if text in ("", "::"):
        return ""
    return text


def fetch_summary(host_ids: list[str] | None = None) -> dict:
    rows = [
        CountRow(
            path=str(row.get("path") or ""),
            hour=str(row.get("hour") or ""),
            edge_id=str(row.get("edge_id") or ""),
            site_id=str(row.get("site_id") or ""),
            count=int(row.get("count") or 0),
            time_ms=int(row.get("time_ms") or 0),
            max_ms=int(row.get("max_ms") or 0),
        )
        for row in summary_rows(host_ids)
    ]
    places = tally_countries(country_rows(host_ids), open_country_rows(host_ids))
    return with_rates(summarize(rows), rate_rows(host_ids), places)


def fetch_events(limit: int, host_ids: list[str] | None = None) -> list[dict]:
    limit = int(limit)
    if limit < 1 or limit > 1000:
        raise ValueError(Code.BAD_LIMIT)
    return _mark([row for row in event_rows(limit, host_ids)])


def fetch_event_page(
    host_ids: list[str] | None,
    cursor: str | None,
    direction: str,
    ip: str | None = None,
    path: str | None = None,
) -> tuple[list[dict], str | None, str | None]:
    point, way = _point(cursor, direction, decode_event_cursor)
    if ip is not None and ip != "":
        decode_address_cursor(encode_address_cursor(0, ip))
    rows = event_page_rows(PAGE + 1, host_ids, point, way, ip or None, path or None)
    more = len(rows) > PAGE
    rows = rows[:PAGE]
    if point is not None and way == "prev":
        rows.reverse()
    raw = [dict(row) for row in rows]
    marked = _mark(rows)
    first = encode_event_cursor(raw[0]) if raw else None
    last = encode_event_cursor(raw[-1]) if raw else None
    nxt, prev = page_cursors(first, last, more=more, started=point is not None, direction=way)
    return marked, nxt, prev


def fetch_address_page(cursor: str | None, direction: str) -> tuple[list[dict], str | None, str | None]:
    point, way = _point(cursor, direction, decode_address_cursor)
    keys = address_key_rows(point, way, PAGE + 1)
    more = len(keys) > PAGE
    keys = keys[:PAGE]
    if point is not None and way == "prev":
        keys.reverse()
    ips = []
    for key in keys:
        ip = str(key.get("ip") or "")
        if ip != "":
            decode_address_cursor(encode_address_cursor(0, ip))
            ips.append(ip)
    grouped = {item["ip"]: item for item in address_panel(address_sample_rows(ips))}
    rows = []
    for key in keys:
        ip = str(key.get("ip") or "")
        if ip == "":
            continue
        item = grouped.get(ip) or {
            "ip": ip,
            "edges": {},
            "probes": 0,
            "last_ts": "",
            "sites": [],
            "probe_path": "",
            "probe_label": "",
            "country": "",
            "paths": [],
            "requests": 0,
        }
        item["requests"] = int(key.get("count") or 0)
        item["last_ts"] = str(key.get("last_ts") or item.get("last_ts") or "")
        item["country"] = noted_country(str(key.get("country") or ""), ip)
        rows.append(item)
    first = encode_address_cursor(int(keys[0].get("count") or 0), str(keys[0].get("ip") or "")) if keys else None
    last = encode_address_cursor(int(keys[-1].get("count") or 0), str(keys[-1].get("ip") or "")) if keys else None
    nxt, prev = page_cursors(first, last, more=more, started=point is not None, direction=way)
    return rows, nxt, prev


def _point(cursor: str | None, direction: str, decode):
    if direction not in ("next", "prev"):
        raise ValueError(Code.BAD_CURSOR)
    if not cursor:
        return None, "next"
    return decode(cursor), direction


def _mark(rows: list[dict]) -> list[dict]:
    marked = []
    for row in rows:
        row["marker"] = marker_body(row.get("path"))
        row["country"] = noted_country(str(row.get("country") or ""), str(row.get("ip") or ""))
        row["ip"] = show_ip(row.get("ip"))
        marked.append(row)
    return marked


def insert_observations(lines: list[str]) -> int:
    if not lines:
        return 0
    insert_events(lines)
    return len(lines)
