import base64
import json
import re

from app.codes import Code

PAGE = 500
FIND_LIMIT = 200
_TS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$")
_IP = re.compile(r"^[0-9A-Fa-f:.]*$")
_NAME = re.compile(r"^[^\x00-\x1f]{0,253}$")


def page_cursors(first: str | None, last: str | None, *, more: bool, started: bool, direction: str) -> tuple[str | None, str | None]:
    if first is None or last is None:
        return None, None
    if direction == "prev":
        return last, first if more else None
    return last if more else None, first if started else None


def encode_event_cursor(row: dict) -> str:
    return _pack(
        {
            "k": "e",
            "t": str(row.get("ts") or ""),
            "site": str(row.get("site_id") or ""),
            "edge": str(row.get("edge_id") or ""),
            "path": str(row.get("path") or ""),
            "ip": str(row.get("ip") or ""),
        }
    )


def encode_address_cursor(count: int, ip: str) -> str:
    return _pack({"k": "a", "n": int(count), "ip": ip})


def decode_event_cursor(token: str) -> dict:
    data = _unpack(token)
    if data.get("k") != "e":
        raise ValueError(Code.BAD_CURSOR)
    ts = str(data.get("t") or "")
    site = str(data.get("site") or "")
    edge = str(data.get("edge") or "")
    path = str(data.get("path") or "")
    ip = str(data.get("ip") or "")
    if not _TS.match(ts) or not _NAME.match(site) or not _NAME.match(edge) or len(path) > 1024 or not _IP.match(ip):
        raise ValueError(Code.BAD_CURSOR)
    return {"t": ts, "site": site, "edge": edge, "path": path, "ip": ip}


def decode_address_cursor(token: str) -> dict:
    data = _unpack(token)
    if data.get("k") != "a":
        raise ValueError(Code.BAD_CURSOR)
    count = data.get("n")
    ip = str(data.get("ip") or "")
    if not isinstance(count, int) or isinstance(count, bool) or count < 0 or not _IP.match(ip) or ip == "":
        raise ValueError(Code.BAD_CURSOR)
    return {"n": count, "ip": ip}


def _pack(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unpack(token: str) -> dict:
    if token == "" or len(token) > 2048:
        raise ValueError(Code.BAD_CURSOR)
    pad = "=" * (-len(token) % 4)
    try:
        data = json.loads(base64.urlsafe_b64decode(token + pad))
    except (ValueError, json.JSONDecodeError):
        raise ValueError(Code.BAD_CURSOR) from None
    if isinstance(data, dict):
        return data
    raise ValueError(Code.BAD_CURSOR)
