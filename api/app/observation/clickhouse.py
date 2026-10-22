import base64
import json
import os
import urllib.parse
import urllib.request

_columns_ready = False


def event_columns() -> str:
    return (
        "ALTER TABLE ledgesec.events "
        "ADD COLUMN IF NOT EXISTS host_id LowCardinality(String) DEFAULT '', "
        "ADD COLUMN IF NOT EXISTS country LowCardinality(String) DEFAULT '', "
        "ADD COLUMN IF NOT EXISTS request_time_ms UInt32 DEFAULT 0"
    )


def ensure_event_columns() -> None:
    global _columns_ready
    if _columns_ready:
        return
    clickhouse_call(event_columns())
    _columns_ready = True


def ping() -> None:
    clickhouse_call("SELECT 1")


def clickhouse_call(sql: str, params: dict[str, str] | None = None, payload: str | None = None) -> bytes:
    database = urllib.parse.quote(os.environ.get("CLICKHOUSE_DB", "ledgesec"), safe="")
    query = urllib.parse.quote(sql, safe="")
    parts = [f"database={database}", f"query={query}"]
    for key, value in (params or {}).items():
        parts.append(f"param_{urllib.parse.quote(key, safe='')}={urllib.parse.quote(value, safe='')}")
    url = os.environ["CLICKHOUSE_URL"].rstrip("/") + "/?" + "&".join(parts)
    user = os.environ.get("CLICKHOUSE_USER", "ledgesec")
    password = os.environ.get("CLICKHOUSE_PASSWORD", "")
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    data = b"" if payload is None else payload.encode()
    request = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {token}"})
    with urllib.request.urlopen(request, timeout=3) as response:
        return response.read()


def clickhouse_rows(sql: str, params: dict[str, str] | None = None) -> list[dict]:
    raw = clickhouse_call(sql, params)
    rows = []
    for line in raw.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows
