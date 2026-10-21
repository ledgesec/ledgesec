from app.ids import SITE_ID
from app.observation.clickhouse import clickhouse_call, clickhouse_rows
from app.observation.markers import marker_body
from app.observation.summary import CountRow, summarize


def show_ip(ip: str | None) -> str:
    text = str(ip or "")
    if text.startswith("::ffff:"):
        return text[7:]
    if text in ("", "::"):
        return ""
    return text


def site_predicate(site_id: str | None) -> tuple[str, dict[str, str]]:
    if site_id is None:
        return "", {}
    if not SITE_ID.match(site_id):
        raise ValueError("bad_site")
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


def fetch_summary(site_id: str | None = None) -> dict:
    sql, params = count_query(site_id)
    rows = [
        CountRow(
            path=str(row.get("path") or ""),
            hour=str(row.get("hour") or ""),
            edge_id=str(row.get("edge_id") or ""),
            site_id=str(row.get("site_id") or ""),
            count=int(row.get("count") or 0),
        )
        for row in clickhouse_rows(sql, params)
    ]
    return summarize(rows)


def fetch_events(limit: int, site_id: str | None = None) -> list[dict]:
    limit = int(limit)
    if limit < 1 or limit > 1000:
        raise ValueError("bad_limit")
    predicate, params = site_predicate(site_id)
    where = f"WHERE {predicate} " if predicate else ""
    sql = (
        "SELECT formatDateTime(ts, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ts, "
        "site_id, edge_id, route_group, path, decision, reason, toString(ip) AS ip "
        "FROM ledgesec.events "
        f"{where}ORDER BY ts DESC LIMIT {limit} FORMAT JSONEachRow"
    )
    rows = []
    for row in clickhouse_rows(sql, params):
        row["marker"] = marker_body(row.get("path"))
        row["ip"] = show_ip(row.get("ip"))
        rows.append(row)
    return rows


def insert_observations(lines: list[str]) -> int:
    if not lines:
        return 0
    clickhouse_call("INSERT INTO ledgesec.events FORMAT JSONEachRow", payload="\n".join(lines) + "\n")
    return len(lines)
