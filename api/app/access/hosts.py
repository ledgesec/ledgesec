import json
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access.models import Host, HostSite
from app.ids import SITE_ID, site_name

AVAILABLE = {"nginx"}
COLLECTORS = {"nginx", "dns", "linux", "apache"}


def clean_label(value: str) -> str:
    text = " ".join(str(value or "").split())
    if text == "" or len(text) > 64:
        raise ValueError("bad_host")
    return text


def public_host(row: Host, sites: list[HostSite]) -> dict:
    return {
        "id": row.id,
        "label": row.label,
        "collector": row.collector,
        "sites": [{"name": site.name, "enabled": bool(site.enabled)} for site in sites],
    }


def create_host(db: Session, label: str, collector: str, owner_id: str) -> dict:
    label = clean_label(label)
    if collector not in COLLECTORS:
        raise ValueError("bad_host")
    if collector not in AVAILABLE:
        raise ValueError("unavailable")
    ident = ""
    for _ in range(5):
        candidate = secrets.token_hex(4)
        if db.scalar(select(Host.id).where(Host.id == candidate)) is None:
            ident = candidate
            break
    if ident == "" or not SITE_ID.match(owner_id):
        raise ValueError("bad_host")
    row = Host(id=ident, label=label, collector=collector, owner_id=owner_id)
    db.add(row)
    db.commit()
    return public_host(row, [])


def list_hosts(db: Session, owner_id: str | None = None) -> list[dict]:
    query = select(Host).order_by(Host.label, Host.id)
    if owner_id is not None:
        query = query.where(Host.owner_id == owner_id)
    hosts = db.scalars(query).all()
    sites = db.scalars(select(HostSite).order_by(HostSite.name)).all()
    grouped: dict[str, list[HostSite]] = {row.id: [] for row in hosts}
    for site in sites:
        if site.host_id in grouped:
            grouped[site.host_id].append(site)
    return [public_host(row, grouped[row.id]) for row in hosts]


def set_site_enabled(db: Session, host_id: str, name: str, enabled: bool, owner_id: str | None = None) -> None:
    name = site_name(name)
    if not SITE_ID.match(host_id) or name == "":
        raise ValueError("bad_site")
    if owner_id is not None:
        owned = db.scalar(select(Host.id).where(Host.id == host_id, Host.owner_id == owner_id))
        if owned is None:
            raise LookupError("missing")
    row = db.scalar(select(HostSite).where(HostSite.host_id == host_id, HostSite.name == name))
    if row is None:
        raise LookupError("missing")
    row.enabled = bool(enabled)
    db.commit()


def split_monitored(
    rows: list[dict],
    hosts: set[str],
    sites: dict[tuple[str, str], bool],
) -> tuple[list[str], list[tuple[str, str]]]:
    flags = dict(sites)
    fresh: list[tuple[str, str]] = []
    kept: list[str] = []
    for row in rows:
        host_id = str(row.get("host_id") or "")
        if host_id not in hosts:
            raise ValueError("unknown_host")
        name = site_name(str(row.get("site_id") or ""))
        if name == "":
            continue
        key = (host_id, name)
        if key not in flags:
            flags[key] = True
            fresh.append(key)
        if not flags[key]:
            continue
        stored = dict(row)
        stored["site_id"] = name
        kept.append(json.dumps(stored, separators=(",", ":")))
    return kept, fresh


def filter_monitored(db: Session, lines: list[str]) -> list[str]:
    if not lines:
        return []
    rows = [json.loads(line) for line in lines]
    host_ids = {str(row.get("host_id") or "") for row in rows}
    present = set(db.scalars(select(Host.id).where(Host.id.in_(host_ids))).all())
    known = {
        (site.host_id, site.name): bool(site.enabled)
        for site in db.scalars(select(HostSite).where(HostSite.host_id.in_(host_ids))).all()
    }
    kept, fresh = split_monitored(rows, present, known)
    for host_id, name in fresh:
        db.add(HostSite(host_id=host_id, name=name, enabled=True))
    if fresh:
        db.commit()
    return kept
