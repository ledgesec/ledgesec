import hashlib
import hmac
import json
import os
import re
from datetime import UTC, datetime, timedelta

from app.ids import SITE_ID

IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
IPV6 = re.compile(r"^[0-9A-Fa-f:.]{2,64}$")
MAX_EVENTS = 1000
INGEST_BODY_LIMIT = 1024 * 1024


def to_ipv6(ip: str) -> str:
    if IPV4.match(ip):
        return "::ffff:" + ip
    if IPV6.match(ip) and "::" in ip:
        return ip
    return "::"


def accept_batch(mac: str, body: bytes) -> list[str]:
    secret = os.environ.get("LEDGESEC_INGEST_SECRET", "")
    if secret == "":
        raise PermissionError("ingest_disabled")
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        raise PermissionError("bad_mac")
    return event_lines(body)


def event_lines(body: bytes) -> list[str]:
    parsed = json.loads(body)
    site_id = parsed.get("site_id", "")
    if not SITE_ID.match(site_id):
        raise ValueError("bad_site")
    edge_id = parsed.get("edge_id") or "module"
    if not SITE_ID.match(edge_id):
        raise ValueError("bad_edge")
    events = parsed.get("events")
    if not isinstance(events, list) or len(events) == 0 or len(events) > MAX_EVENTS:
        raise ValueError("bad_events")
    now = datetime.now(UTC)
    lines = []
    for event in events:
        ts_ms = int(event["ts"])
        when = datetime.fromtimestamp(ts_ms / 1000, UTC)
        if when < now - timedelta(days=2) or when > now + timedelta(hours=1):
            continue
        path = str(event.get("path") or "/")
        path = path.split("?", 1)[0].replace("\n", "").replace("\r", "")
        if path == "" or len(path) > 160:
            continue
        route_group = event.get("route_group")
        if route_group not in ("document", "asset", "api"):
            route_group = "document"
        stamp = when.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        sampled = 1 if event.get("sampled") is True else 0
        lines.append(
            json.dumps(
                {
                    "ts": stamp,
                    "site_id": site_id,
                    "edge_id": edge_id,
                    "decision": "allow",
                    "reason": "observe",
                    "policy_version": 1,
                    "snapshot_gen": 0,
                    "snapshot_age_ms": 0,
                    "route_group": route_group,
                    "path": path,
                    "ip": to_ipv6(str(event.get("ip") or "")),
                    "had_session": 0,
                    "client_class": "",
                    "ja4": "",
                    "sampled": sampled,
                },
                separators=(",", ":"),
            )
        )
    return lines
