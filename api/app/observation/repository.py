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


def site_predicate(site_id: str | None) -> tuple[str, dict[str, str]]:
    if site_id is None:
        return "", {}
    if not SITE_ID.match(site_id):
        raise ValueError(Code.BAD_SITE)
    return "site_id = {site:String}", {"site": site_id}


def count_query(site_id: str | None) -> tuple[str, dict[str, str]]:
    predicate, params = site_predicate(site_id)
    where = "ts >= now() - INTERVAL 24 HOUR"
    if predicate:
        where = f"{where} AND {predicate}"
    sql = (
        "SELECT path, toString(toStartOfHour(ts)) AS hour, edge_id, site_id, count() AS count "
        "FROM ledgesec.events "
        f"WHERE {where} "
        "GROUP BY path, hour, edge_id, site_id "
        "FORMAT JSONEachRow"
    )
    return sql, params


def summary_rows(site_id: str | None) -> list[dict]:
    prepare_journal()
    sql, params = count_query(site_id)
    return clickhouse_rows(sql, params)


def event_rows(limit: int, site_id: str | None) -> list[dict]:
    prepare_journal()
    limit = int(limit)
    predicate, params = site_predicate(site_id)
    where = f"WHERE {predicate} " if predicate else ""
    sql = (
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, edge_id, route_group, path, decision, reason, toString(ip) AS ip, country "
        "FROM ledgesec.events "
        f"{where}ORDER BY ts DESC LIMIT {limit} FORMAT JSONEachRow"
    )
    return clickhouse_rows(sql, params)


def insert_events(lines: list[str]) -> None:
    prepare_journal()
    clickhouse_call("INSERT INTO ledgesec.events FORMAT JSONEachRow", payload="\n".join(lines) + "\n")
