import hashlib
import hmac
import json
import os
import re
from datetime import UTC, datetime, timedelta

from app.codes import Code
from app.ids import SITE_ID, site_name
from app.observation.geo import country_of

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


def ingest_secret() -> str:
    return os.environ.get("LEDGESEC_INGEST_SECRET", "")


def batch_note(body: bytes) -> tuple[str, str]:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return "", ""
    host_id = str(parsed.get("site_id") or "")
    agent = str(parsed.get("agent") or "").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", agent):
        agent = ""
    return host_id, agent


def accept_batch(mac: str, body: bytes) -> list[str]:
    secret = ingest_secret()
    if secret == "":
        raise PermissionError(Code.INGEST_DISABLED)
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        raise PermissionError(Code.BAD_MAC)
    return event_lines(body)


def event_lines(body: bytes) -> list[str]:
    parsed = json.loads(body)
    site_id = parsed.get("site_id", "")
    if not SITE_ID.match(site_id):
        raise ValueError(Code.BAD_SITE)
    edge_id = parsed.get("edge_id") or "module"
    if not SITE_ID.match(edge_id):
        raise ValueError(Code.BAD_EDGE)
    events = parsed.get("events")
    if not isinstance(events, list) or len(events) == 0 or len(events) > MAX_EVENTS:
        raise ValueError(Code.BAD_EVENTS)
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
        name = site_name(str(event.get("host") or ""))
        if name == "":
            continue
        stamp = when.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        sampled = 1 if event.get("sampled") is True else 0
        stored = {
            "ts": stamp,
            "site_id": name,
            "host_id": site_id,
            "edge_id": edge_id,
            "decision": "allow",
            "reason": "observe",
            "policy_version": 1,
            "snapshot_gen": 0,
            "snapshot_age_ms": 0,
            "route_group": route_group,
            "path": path,
            "ip": to_ipv6(str(event.get("ip") or "")),
            "country": country_of(str(event.get("ip") or "")),
            "had_session": 0,
            "client_class": "",
            "ja4": "",
            "sampled": sampled,
            "request_time_ms": request_time_ms(event.get("request_time_ms")),
        }
        if event.get("routed") is False:
            stored["routed"] = False
        lines.append(json.dumps(stored, separators=(",", ":")))
    return lines


def request_time_ms(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        return 0
    try:
        number = int(value)
    except (TypeError, ValueError, OverflowError):
        return 0
    if number < 0:
        return 0
    return min(number, 4_294_967_295)
