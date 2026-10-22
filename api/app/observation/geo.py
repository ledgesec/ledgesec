import os

# Country is an ISO code from a local MaxMind-format file.
# The visitor request never calls out, and a missing file leaves the code empty.
# DB-IP Country Lite, when that is the file, is used under CC BY 4.0: https://db-ip.com

DEFAULT_GEOIP_DB = "/data/geoip/country.mmdb"

_readers: dict[str, object] = {}


def geoip_path() -> str:
    chosen = os.environ.get("LEDGESEC_GEOIP_DB", "").strip()
    if chosen != "":
        return chosen
    if os.path.isfile(DEFAULT_GEOIP_DB):
        return DEFAULT_GEOIP_DB
    return ""


def country_of(ip: str) -> str:
    return _iso(lookup_country(ip))


def noted_country(stored: str, ip: str) -> str:
    code = _iso(stored)
    if code != "":
        return code
    return country_of(ip)


def tally_countries(stored: list[dict], pending: list[dict]) -> list[dict]:
    totals: dict[str, int] = {}
    for row in stored:
        _add(totals, noted_country(str(row.get("country") or ""), ""), int(row.get("count") or 0))
    for row in pending:
        _add(totals, country_of(str(row.get("ip") or "")), int(row.get("count") or 0))
    ranked = sorted(totals.items(), key=lambda item: (-item[1], item[0]))
    return [{"country": code, "count": count} for code, count in ranked]


def _add(totals: dict[str, int], code: str, count: int) -> None:
    if count <= 0 or code == "":
        return
    totals[code] = totals.get(code, 0) + count


def _iso(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip().upper()
    if len(text) != 2 or not text.isalpha():
        return ""
    return text


def lookup_country(ip: str) -> str | None:
    reader = reader_for(geoip_path())
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
