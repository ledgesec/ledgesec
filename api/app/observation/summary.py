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
    time_ms: int = 0
    max_ms: int = 0


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


SLOW_PATHS = 12
MARKER_PATHS = 24


def slow_paths(timing: dict[str, list[int]]) -> list[dict]:
    ranked = []
    for path, (count, time_ms, max_ms) in timing.items():
        if count <= 0 or time_ms <= 0 or path == "":
            continue
        ranked.append((path, count, round(time_ms / count), max_ms))
    ranked.sort(key=lambda item: (-item[2], -item[1], item[0]))
    chosen = []
    for path, count, avg_ms, max_ms in ranked[:SLOW_PATHS]:
        marker = classify(path)
        chosen.append(
            {
                "path": path,
                "label": marker.label if marker else "",
                "requests": count,
                "avg_ms": avg_ms,
                "max_ms": max_ms,
            }
        )
    return chosen


def probe_counts(rows: list[CountRow]) -> tuple[list[str], dict[str, tuple[int, str]]]:
    names: list[str] = []
    found: dict[str, tuple[int, str]] = {}
    for row in rows:
        if row.count <= 0 or row.path == "":
            continue
        current = found.get(row.path)
        if current is not None:
            found[row.path] = (current[0] + row.count, current[1])
            continue
        marker = classify(row.path)
        if marker is None:
            continue
        found[row.path] = (row.count, marker.label)
        names.append(row.path)
    return names, found


def summarize(rows: list[CountRow], now: datetime | None = None) -> dict:
    requests = 0
    probes = 0
    sites: set[str] = set()
    edges: dict[str, list[int]] = {}
    by_site: dict[str, list[int]] = {}
    hours: dict[str, list[int]] = {}
    by_path: dict[str, int] = {}
    labels: dict[str, str] = {}
    timing: dict[str, list[int]] = {}
    for row in rows:
        if row.count <= 0:
            continue
        requests += row.count
        sites.add(row.site_id)
        edge = edges.setdefault(row.edge_id, [0, 0])
        edge[0] += row.count
        site = by_site.setdefault(row.site_id, [0, 0])
        site[0] += row.count
        clock = timing.setdefault(row.path, [0, 0, 0])
        clock[0] += row.count
        clock[1] += row.time_ms
        clock[2] = max(clock[2], row.max_ms)
        key = normalize_hour(row.hour)
        bucket = hours.setdefault(key, [0, 0])
        bucket[0] += row.count
        marker = classify(row.path)
        if marker is not None:
            probes += row.count
            bucket[1] += row.count
            edge[1] += row.count
            site[1] += row.count
            by_path[row.path] = by_path.get(row.path, 0) + row.count
            labels[row.path] = marker.label
    ranked = sorted(by_path.items(), key=lambda item: (-item[1], item[0]))[:MARKER_PATHS]
    return {
        "window": "24h",
        "requests": requests,
        "probes": probes,
        "sites": len(sites),
        "edges": [
            {"id": edge_id, "requests": counts[0], "probes": counts[1]}
            for edge_id, counts in sorted(edges.items(), key=lambda item: (-item[1][0], item[0]))
        ],
        "by_site": [
            {"name": name, "requests": counts[0], "probes": counts[1]}
            for name, counts in sorted(by_site.items(), key=lambda item: (-item[1][0], item[0]))
            if name and counts[0] > 0
        ],
        "hours": fill_hours({key: (value[0], value[1]) for key, value in hours.items()}, now),
        "markers": [{"path": path, "label": labels[path], "count": count} for path, count in ranked],
        "slow": slow_paths(timing),
    }


def summarize_parts(
    rollups: list[CountRow],
    markers: dict[str, tuple[int, str]],
    probes: list[CountRow],
    slow: list[CountRow],
    now: datetime | None = None,
) -> dict:
    requests = 0
    sites: set[str] = set()
    edges: dict[str, list[int]] = {}
    by_site: dict[str, list[int]] = {}
    hours: dict[str, list[int]] = {}
    for row in rollups:
        if row.count <= 0:
            continue
        requests += row.count
        sites.add(row.site_id)
        edge = edges.setdefault(row.edge_id, [0, 0])
        edge[0] += row.count
        site = by_site.setdefault(row.site_id, [0, 0])
        site[0] += row.count
        bucket = hours.setdefault(normalize_hour(row.hour), [0, 0])
        bucket[0] += row.count
    probes_total = 0
    for row in probes:
        if row.count <= 0:
            continue
        probes_total += row.count
        bucket = hours.setdefault(normalize_hour(row.hour), [0, 0])
        bucket[1] += row.count
        edge = edges.setdefault(row.edge_id, [0, 0])
        edge[1] += row.count
        site = by_site.setdefault(row.site_id, [0, 0])
        site[1] += row.count
    ranked = sorted(markers.items(), key=lambda item: (-item[1][0], item[0]))[:MARKER_PATHS]
    timing: dict[str, list[int]] = {}
    for row in slow:
        if row.count <= 0:
            continue
        clock = timing.setdefault(row.path, [0, 0, 0])
        clock[0] += row.count
        clock[1] += row.time_ms
        clock[2] = max(clock[2], row.max_ms)
    return {
        "window": "24h",
        "requests": requests,
        "probes": probes_total,
        "sites": len(sites),
        "edges": [
            {"id": edge_id, "requests": counts[0], "probes": counts[1]}
            for edge_id, counts in sorted(edges.items(), key=lambda item: (-item[1][0], item[0]))
        ],
        "by_site": [
            {"name": name, "requests": counts[0], "probes": counts[1]}
            for name, counts in sorted(by_site.items(), key=lambda item: (-item[1][0], item[0]))
            if name and counts[0] > 0
        ],
        "hours": fill_hours({key: (value[0], value[1]) for key, value in hours.items()}, now),
        "markers": [{"path": path, "label": label, "count": count} for path, (count, label) in ranked],
        "slow": slow_paths(timing),
    }


def with_rates(body: dict, rates: list[dict], countries: list[dict]) -> dict:
    total = 0
    domains = []
    for row in rates:
        count = int(row.get("count") or 0)
        name = str(row.get("site_id") or "")
        if count <= 0 or name == "":
            continue
        total += count
        domains.append({"name": name, "requests": count, "rps": round(count / 60, 3)})
    domains.sort(key=lambda item: (-item["rps"], item["name"]))
    places = []
    for row in countries:
        code = str(row.get("country") or "").upper()
        count = int(row.get("count") or 0)
        if count <= 0 or len(code) != 2 or not code.isalpha():
            continue
        places.append({"code": code, "requests": count})
    places.sort(key=lambda item: (-item["requests"], item["code"]))
    body["rps"] = round(total / 60, 3)
    body["domains"] = domains
    body["countries"] = places
    return body
