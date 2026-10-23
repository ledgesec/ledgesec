import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.codes import Code
from app.observation.addresses import address_panel
from app.observation.geo import noted_country, tally_countries
from app.observation.markers import marker_body
from app.observation.page import (
    FIND_LIMIT,
    PAGE,
    decode_address_cursor,
    decode_event_cursor,
    encode_address_cursor,
    encode_event_cursor,
    page_cursors,
)
from app.observation.rates import bucket_key, rates_body, window_of
from app.observation.repository import (
    address_key_rows,
    address_sample_rows,
    country_rows,
    event_page_rows,
    event_rows,
    insert_events,
    open_country_rows,
    path_rows,
    probe_rows,
    rate_rows,
    rollup_rows,
    series_rows,
)
from app.observation.summary import (
    CountRow,
    probe_counts,
    summarize_parts,
    with_rates,
)

SUMMARY_SHARE_SECONDS = 1
SUMMARY_READS = 5

_summary_cache: dict[str, tuple[float, dict]] = {}
_summary_lock = threading.Lock()


def summary_key(host_ids: list[str] | None) -> str:
    if host_ids is None:
        return ""
    return "\n".join(host_ids)


def share_result(key: str, compute, now: float | None = None) -> dict:
    stamp = time.monotonic() if now is None else now
    with _summary_lock:
        hit = _summary_cache.get(key)
        if hit is not None and stamp - hit[0] < SUMMARY_SHARE_SECONDS:
            return hit[1]
        body = compute()
        finished = time.monotonic() if now is None else now
        _summary_cache[key] = (finished, body)
        return body


def show_ip(ip: str | None) -> str:
    text = str(ip or "")
    if text.startswith("::ffff:"):
        return text[7:]
    if text in ("", "::"):
        return ""
    return text


def _count_row(row: dict) -> CountRow:
    return CountRow(
        path=str(row.get("path") or ""),
        hour=str(row.get("hour") or ""),
        edge_id=str(row.get("edge_id") or ""),
        site_id=str(row.get("site_id") or ""),
        count=int(row.get("count") or 0),
        time_ms=int(row.get("time_ms") or 0),
        max_ms=int(row.get("max_ms") or 0),
    )


def _build_summary(host_ids: list[str] | None) -> dict:
    with ThreadPoolExecutor(max_workers=SUMMARY_READS) as pool:
        grouped = pool.submit(rollup_rows, host_ids)
        by_path = pool.submit(path_rows, host_ids)
        countries = pool.submit(country_rows, host_ids)
        pending = pool.submit(open_country_rows, host_ids)
        rates = pool.submit(rate_rows, host_ids)
        counted = [_count_row(row) for row in by_path.result()]
        names, markers = probe_counts(counted)
        shares = probe_rows(host_ids, names)
        places = tally_countries(countries.result(), pending.result())
        found = rates.result()
        rollups = grouped.result()
    return with_rates(
        summarize_parts(
            [_count_row(row) for row in rollups],
            markers,
            [_count_row(row) for row in shares],
            counted,
        ),
        found,
        places,
    )


def fetch_summary(host_ids: list[str] | None = None) -> dict:
    return share_result(summary_key(host_ids), lambda: _build_summary(host_ids))


def fetch_rates(host_ids: list[str] | None, window: str) -> dict:
    name, span, step = window_of(window)
    found: dict[str, int] = {}
    for row in series_rows(host_ids, span, step):
        key = bucket_key(str(row.get("bucket") or ""))
        found[key] = found.get(key, 0) + int(row.get("count") or 0)
    return rates_body(found, name, span, step)


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
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
    wide: bool = False,
) -> tuple[list[dict], str | None, str | None]:
    point, way = _point(cursor, direction, decode_event_cursor)
    if ip is not None and ip != "":
        decode_address_cursor(encode_address_cursor(0, ip))
    rows = event_page_rows(
        PAGE + 1,
        host_ids,
        point,
        way,
        ip or None,
        path or None,
        site=_clip(site),
        country=_country(country),
        edge=_clip(edge) if wide else None,
        q=_clip(q),
        wide=wide,
    )
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


def fetch_address_page(
    cursor: str | None,
    direction: str,
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
) -> tuple[list[dict], str | None, str | None]:
    point, way = _point(cursor, direction, decode_address_cursor)
    keys = address_key_rows(
        point,
        way,
        PAGE + 1,
        site=_clip(site),
        country=_country(country),
        edge=_clip(edge),
        q=_clip(q),
    )
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
            "ua": "",
            "paths": [],
            "requests": 0,
        }
        item["requests"] = int(key.get("count") or 0)
        item["last_ts"] = str(key.get("last_ts") or item.get("last_ts") or "")
        item["country"] = noted_country(str(key.get("country") or ""), ip)
        item["ua"] = str(key.get("ua") or "")
        rows.append(item)
    first = encode_address_cursor(int(keys[0].get("count") or 0), str(keys[0].get("ip") or "")) if keys else None
    last = encode_address_cursor(int(keys[-1].get("count") or 0), str(keys[-1].get("ip") or "")) if keys else None
    nxt, prev = page_cursors(first, last, more=more, started=point is not None, direction=way)
    return rows, nxt, prev


def _clip(value: str | None) -> str | None:
    text = " ".join(str(value or "").split())
    if text == "":
        return None
    return text[:FIND_LIMIT]


def _country(value: str | None) -> str | None:
    text = _clip(value)
    if text is None:
        return None
    text = text.upper()
    if len(text) != 2 or not text.isalpha():
        return None
    return text


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
