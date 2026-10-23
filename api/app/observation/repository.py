from app.codes import Code
from app.ids import SITE_ID
from app.observation.clickhouse import (
    clickhouse_call,
    clickhouse_rows,
    ensure_event_columns,
)

_retained = False


def events_ttl() -> str:
    return "ALTER TABLE ledgesec.events MODIFY TTL toDateTime(ts) + INTERVAL 3 YEAR"


def minute_ttl() -> str:
    return "ALTER TABLE ledgesec.events_minute MODIFY TTL minute + INTERVAL 3 YEAR"


def retain_events() -> None:
    global _retained
    if _retained:
        return
    clickhouse_call(events_ttl())
    clickhouse_call(minute_ttl())
    _retained = True


def prepare_journal() -> None:
    ensure_event_columns()
    retain_events()


def host_predicate(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    if host_ids is None:
        return "", {}
    clean = []
    for host_id in host_ids:
        if not SITE_ID.match(host_id):
            raise ValueError(Code.BAD_HOST)
        clean.append(host_id)
    if not clean:
        raise ValueError(Code.BAD_HOST)
    listed = ", ".join(f"'{host_id}'" for host_id in clean)
    return f"host_id IN ({listed})", {}


def _day(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    predicate, params = host_predicate(host_ids)
    where = "ts >= now() - INTERVAL 24 HOUR"
    if predicate:
        where = f"{where} AND {predicate}"
    return where, params


def rollup_query(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    where, params = _day(host_ids)
    sql = (
        "SELECT toString(toStartOfHour(ts)) AS hour, edge_id, site_id, count() AS count "
        "FROM ledgesec.events "
        f"WHERE {where} "
        "GROUP BY hour, edge_id, site_id "
        "FORMAT JSONEachRow"
    )
    return sql, params


def path_query(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    where, params = _day(host_ids)
    sql = (
        "SELECT path, count() AS count, sum(request_time_ms) AS time_ms, max(request_time_ms) AS max_ms "
        "FROM ledgesec.events "
        f"WHERE {where} "
        "GROUP BY path "
        "FORMAT JSONEachRow"
    )
    return sql, params


def probe_paths_param(paths: list[str]) -> str:
    quoted = []
    for path in paths:
        escaped = path.replace("\\", "\\\\").replace("'", "\\'")
        quoted.append("'" + escaped + "'")
    return "[" + ",".join(quoted) + "]"


def probe_query(host_ids: list[str] | None, paths: list[str]) -> tuple[str, dict[str, str]]:
    where, params = _day(host_ids)
    where = f"{where} AND path IN {{probe_paths:Array(String)}}"
    params = dict(params)
    params["probe_paths"] = probe_paths_param(paths)
    sql = (
        "SELECT path, toString(toStartOfHour(ts)) AS hour, edge_id, site_id, count() AS count "
        "FROM ledgesec.events "
        f"WHERE {where} "
        "GROUP BY path, hour, edge_id, site_id "
        "FORMAT JSONEachRow"
    )
    return sql, params


def series_query(host_ids: list[str] | None, span: int, step: int) -> tuple[str, dict[str, str]]:
    span_seconds = int(span)
    step_seconds = int(step)
    predicate, params = host_predicate(host_ids)
    where = f"ts >= now() - INTERVAL {span_seconds + step_seconds} SECOND"
    if predicate:
        where = f"{where} AND {predicate}"
    sql = (
        "SELECT toString(toStartOfInterval(ts, "
        f"INTERVAL {step_seconds} SECOND)) AS bucket, count() AS count "
        "FROM ledgesec.events "
        f"WHERE {where} "
        "GROUP BY bucket FORMAT JSONEachRow"
    )
    return sql, params


def rate_query(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    predicate, params = host_predicate(host_ids)
    where = "ts >= now() - INTERVAL 60 SECOND"
    if predicate:
        where = f"{where} AND {predicate}"
    sql = (
        "SELECT site_id, count() AS count FROM ledgesec.events "
        f"WHERE {where} GROUP BY site_id FORMAT JSONEachRow"
    )
    return sql, params


def country_query(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    predicate, params = host_predicate(host_ids)
    where = "ts >= now() - INTERVAL 24 HOUR AND country != ''"
    if predicate:
        where = f"{where} AND {predicate}"
    sql = (
        "SELECT country, count() AS count FROM ledgesec.events "
        f"WHERE {where} GROUP BY country FORMAT JSONEachRow"
    )
    return sql, params


def rollup_rows(host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = rollup_query(host_ids)
    return clickhouse_rows(sql, params)


def path_rows(host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = path_query(host_ids)
    return clickhouse_rows(sql, params)


def probe_rows(host_ids: list[str] | None, paths: list[str]) -> list[dict]:
    if not paths:
        return []
    prepare_journal()
    sql, params = probe_query(host_ids, paths)
    return clickhouse_rows(sql, params)


def series_rows(host_ids: list[str] | None, span: int, step: int) -> list[dict]:
    prepare_journal()
    sql, params = series_query(host_ids, span, step)
    return clickhouse_rows(sql, params)


def rate_rows(host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = rate_query(host_ids)
    return clickhouse_rows(sql, params)


def country_rows(host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = country_query(host_ids)
    return clickhouse_rows(sql, params)


def open_country_query(host_ids: list[str] | None) -> tuple[str, dict[str, str]]:
    predicate, params = host_predicate(host_ids)
    where = "ts >= now() - INTERVAL 24 HOUR AND country = ''"
    if predicate:
        where = f"{where} AND {predicate}"
    sql = (
        "SELECT toString(ip) AS ip, count() AS count FROM ledgesec.events "
        f"WHERE {where} GROUP BY ip FORMAT JSONEachRow"
    )
    return sql, params


def open_country_rows(host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = open_country_query(host_ids)
    return clickhouse_rows(sql, params)


def event_rows(limit: int, host_ids: list[str] | None) -> list[dict]:
    prepare_journal()
    sql, params = event_page_query(host_ids, None, "next", limit, None)
    return clickhouse_rows(sql, params)


def _moment(op: str) -> str:
    stamp = "parseDateTime64BestEffort({c_ts:String}, 6, 'UTC')"
    return (
        f"(ts {op} {stamp} "
        f"OR (ts = {stamp} AND site_id {op} {{c_site:String}}) "
        f"OR (ts = {stamp} AND site_id = {{c_site:String}} AND edge_id {op} {{c_edge:String}}) "
        f"OR (ts = {stamp} AND site_id = {{c_site:String}} AND edge_id = {{c_edge:String}} "
        f"AND path {op} {{c_path:String}}) "
        f"OR (ts = {stamp} AND site_id = {{c_site:String}} AND edge_id = {{c_edge:String}} "
        f"AND path = {{c_path:String}} AND toString(ip) {op} {{c_ip:String}}))"
    )


def _equals(clauses: list[str], params: dict[str, str], column: str, key: str, value: str | None) -> None:
    if not value:
        return
    clauses.append(f"{column} = {{{key}:String}}")
    params[key] = value


def _contains(clauses: list[str], params: dict[str, str], q: str | None, columns: list[str]) -> None:
    if not q:
        return
    params["f_q"] = q
    parts = [f"positionCaseInsensitive({column}, {{f_q:String}}) > 0" for column in columns]
    clauses.append("(" + " OR ".join(parts) + ")")


def event_page_query(
    host_ids: list[str] | None,
    bound: dict | None,
    direction: str,
    limit: int,
    ip: str | None,
    path: str | None = None,
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
    wide: bool = False,
) -> tuple[str, dict[str, str]]:
    predicate, params = host_predicate(host_ids)
    clauses = []
    if predicate:
        clauses.append(predicate)
    if ip:
        clauses.append("toString(ip) = {f_ip:String}")
        params["f_ip"] = ip
    if path:
        clauses.append("path = {f_path:String}")
        params["f_path"] = path
    _equals(clauses, params, "site_id", "f_site", site)
    _equals(clauses, params, "country", "f_country", country)
    _equals(clauses, params, "edge_id", "f_edge", edge)
    columns = ["site_id", "path", "country", "ua"]
    if wide:
        columns.extend(["edge_id", "toString(ip)"])
    _contains(clauses, params, q, columns)
    order = "ts DESC, site_id DESC, edge_id DESC, path DESC, toString(ip) DESC"
    if bound is not None:
        params["c_ts"] = bound["t"]
        params["c_site"] = bound["site"]
        params["c_edge"] = bound["edge"]
        params["c_path"] = bound["path"]
        params["c_ip"] = bound["ip"]
        if direction == "prev":
            clauses.append(_moment(">"))
            order = "ts ASC, site_id ASC, edge_id ASC, path ASC, toString(ip) ASC"
        else:
            clauses.append(_moment("<"))
    where = f"WHERE {' AND '.join(clauses)} " if clauses else ""
    sql = (
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, edge_id, route_group, path, decision, reason, toString(ip) AS ip, country, "
        "request_time_ms, method, status, ua, bytes_sent, protocol, tls "
        "FROM ledgesec.events "
        f"{where}ORDER BY {order} LIMIT {int(limit)} FORMAT JSONEachRow"
    )
    return sql, params


def event_page_rows(
    limit: int,
    host_ids: list[str] | None,
    bound: dict | None,
    direction: str,
    ip: str | None,
    path: str | None = None,
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
    wide: bool = False,
) -> list[dict]:
    prepare_journal()
    sql, params = event_page_query(
        host_ids, bound, direction, limit, ip, path, site=site, country=country, edge=edge, q=q, wide=wide
    )
    return clickhouse_rows(sql, params)


def address_key_query(
    bound: dict | None,
    direction: str,
    limit: int,
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
) -> tuple[str, dict[str, str]]:
    having = ""
    params: dict[str, str] = {}
    where_clauses: list[str] = []
    _equals(where_clauses, params, "site_id", "f_site", site)
    _equals(where_clauses, params, "country", "f_country", country)
    _equals(where_clauses, params, "edge_id", "f_edge", edge)
    _contains(where_clauses, params, q, ["toString(ip)", "country", "site_id", "edge_id", "path", "ua"])
    where = f"WHERE {' AND '.join(where_clauses)} " if where_clauses else ""
    order = "count() DESC, toString(ip) ASC"
    if bound is not None:
        params["c_n"] = str(bound["n"])
        params["c_ip"] = bound["ip"]
        if direction == "prev":
            having = (
                "HAVING count() > {c_n:UInt64} "
                "OR (count() = {c_n:UInt64} AND toString(ip) < {c_ip:String}) "
            )
            order = "count() ASC, toString(ip) DESC"
        else:
            having = (
                "HAVING count() < {c_n:UInt64} "
                "OR (count() = {c_n:UInt64} AND toString(ip) > {c_ip:String}) "
            )
    sql = (
        "SELECT toString(ip) AS ip, count() AS count, "
        "formatDateTime(max(ts), '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS last_ts, "
        "anyIf(country, country != '') AS country, "
        "argMaxIf(ua, ts, ua != '') AS ua "
        "FROM ledgesec.events "
        f"{where}GROUP BY ip "
        f"{having}ORDER BY {order} LIMIT {int(limit)} FORMAT JSONEachRow"
    )
    return sql, params


def address_key_rows(
    bound: dict | None,
    direction: str,
    limit: int,
    *,
    site: str | None = None,
    country: str | None = None,
    edge: str | None = None,
    q: str | None = None,
) -> list[dict]:
    prepare_journal()
    sql, params = address_key_query(bound, direction, limit, site=site, country=country, edge=edge, q=q)
    return clickhouse_rows(sql, params)


def address_sample_rows(ips: list[str]) -> list[dict]:
    prepare_journal()
    if not ips:
        return []
    clean = []
    for ip in ips:
        if not isinstance(ip, str) or ip == "" or any(char not in "0123456789abcdefABCDEF:." for char in ip):
            raise ValueError(Code.BAD_CURSOR)
        clean.append(ip)
    listed = ", ".join(f"'{ip}'" for ip in clean)
    sql = (
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, edge_id, route_group, path, decision, reason, toString(ip) AS ip, country "
        "FROM ledgesec.events "
        f"WHERE toString(ip) IN ({listed}) "
        "ORDER BY ts DESC LIMIT 10 BY toString(ip) FORMAT JSONEachRow"
    )
    return clickhouse_rows(sql, {})


def insert_events(lines: list[str]) -> None:
    prepare_journal()
    clickhouse_call("INSERT INTO ledgesec.events FORMAT JSONEachRow", payload="\n".join(lines) + "\n")
