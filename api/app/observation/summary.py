from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.observation.markers import classify


@dataclass(frozen=True)
class CountRow:
    path: str
    hour: str
    edge_id: str
    site_id: str
    count: int


def normalize_hour(value: str) -> str:
    text = str(value).strip().replace("T", " ")
    if len(text) >= 13 and text[4] == "-" and text[7] == "-" and text[10] == " ":
        return text[:13] + ":00:00"
    return text


def fill_hours(found: dict[str, tuple[int, int]], now: datetime | None = None) -> list[dict]:
    stamp = (now or datetime.now(UTC)).replace(minute=0, second=0, microsecond=0)
    hours = []
    for ago in range(23, -1, -1):
        key = (stamp - timedelta(hours=ago)).strftime("%Y-%m-%d %H:00:00")
        requests, probes = found.get(key, (0, 0))
        hours.append({"hour": key, "requests": requests, "probes": probes})
    return hours


def summarize(rows: list[CountRow], now: datetime | None = None) -> dict:
    requests = 0
    probes = 0
    sites: set[str] = set()
    edges: dict[str, int] = {}
    hours: dict[str, list[int]] = {}
    by_path: dict[str, int] = {}
    labels: dict[str, str] = {}
    for row in rows:
        if row.count <= 0:
            continue
        requests += row.count
        sites.add(row.site_id)
        edges[row.edge_id] = edges.get(row.edge_id, 0) + row.count
        key = normalize_hour(row.hour)
        bucket = hours.setdefault(key, [0, 0])
        bucket[0] += row.count
        marker = classify(row.path)
        if marker is not None:
            probes += row.count
            bucket[1] += row.count
            by_path[row.path] = by_path.get(row.path, 0) + row.count
            labels[row.path] = marker.label
    ranked = sorted(by_path.items(), key=lambda item: (-item[1], item[0]))[:8]
    return {
        "window": "24h",
        "requests": requests,
        "probes": probes,
        "sites": len(sites),
        "edges": [
            {"id": edge_id, "requests": count}
            for edge_id, count in sorted(edges.items(), key=lambda item: (-item[1], item[0]))
        ],
        "hours": fill_hours({key: (value[0], value[1]) for key, value in hours.items()}, now),
        "markers": [{"path": path, "label": labels[path], "count": count} for path, count in ranked],
    }
