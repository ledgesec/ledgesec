import os

# Country is an ISO code from a local GeoLite2-Country file.
# The visitor request never calls out, and a missing file leaves the code empty.

_readers: dict[str, object] = {}


def country_of(ip: str) -> str:
    code = lookup_country(ip)
    if code is None:
        return ""
    text = str(code).strip().upper()
    if len(text) != 2 or not text.isalpha():
        return ""
    return text


def lookup_country(ip: str) -> str | None:
    reader = reader_for(os.environ.get("LEDGESEC_GEOIP_DB", ""))
    if reader is None:
        return None
    text = str(ip or "")
    text = text.removeprefix("::ffff:")
    if text in ("", "::"):
        return None
    get = getattr(reader, "get", None)
    if get is None:
        return None
    try:
        record = get(text)
    except (ValueError, OSError):
        return None
    if not isinstance(record, dict):
        return None
    country = record.get("country") or {}
    if not isinstance(country, dict):
        return None
    return str(country.get("iso_code") or "")


def reader_for(path: str):
    if path in _readers:
        return _readers[path]
    reader = None
    if path != "" and os.path.isfile(path):
        try:
            import maxminddb
        except ImportError:
            reader = None
        else:
            reader = maxminddb.open_database(path)
    _readers[path] = reader
    return reader
