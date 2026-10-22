from app.codes import Code
from app.observation.markers import marker_body
from app.observation.repository import event_rows, insert_events, summary_rows
from app.observation.summary import CountRow, summarize


def show_ip(ip: str | None) -> str:
    text = str(ip or "")
    if text.startswith("::ffff:"):
        return text[7:]
    if text in ("", "::"):
        return ""
    return text


def fetch_summary(site_id: str | None = None) -> dict:
    rows = [
        CountRow(
            path=str(row.get("path") or ""),
            hour=str(row.get("hour") or ""),
            edge_id=str(row.get("edge_id") or ""),
            site_id=str(row.get("site_id") or ""),
            count=int(row.get("count") or 0),
        )
        for row in summary_rows(site_id)
    ]
    return summarize(rows)


def fetch_events(limit: int, site_id: str | None = None) -> list[dict]:
    limit = int(limit)
    if limit < 1 or limit > 1000:
        raise ValueError(Code.BAD_LIMIT)
    rows = []
    for row in event_rows(limit, site_id):
        row["marker"] = marker_body(row.get("path"))
        row["ip"] = show_ip(row.get("ip"))
        rows.append(row)
    return rows


def insert_observations(lines: list[str]) -> int:
    if not lines:
        return 0
    insert_events(lines)
    return len(lines)
