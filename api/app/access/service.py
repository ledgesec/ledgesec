import json
import secrets

from sqlalchemy.orm import Session

from app.access.actor import Actor
from app.access.models import Host, HostSite
from app.access.passwords import check_password, hash_password, new_admin
from app.access.repository import (
    delete_host_row,
    find_host_site,
    find_user_by_email,
    get_user,
    host_id_taken,
    host_owned,
    hosts_present,
    insert_host,
    insert_host_site,
    insert_user,
    list_host_rows,
    list_host_site_rows,
    list_site_rows,
    list_user_rows,
    note_agent_version,
    save,
    site_flags,
    undo,
    write_enabled,
)
from app.access.sessions import read_user_id, sign_session
from app.codes import Code
from app.ids import EMAIL, SITE_ID, site_name
from app.observation.ingest import ingest_secret

AVAILABLE = {"nginx", "linux", "coolify"}
COLLECTORS = {"nginx", "dns", "linux", "apache", "coolify"}


class Unscoped(Exception):
    pass


def public_user(row) -> dict:
    return {"id": row.id, "email": row.email, "role": row.role, "site_id": row.site_id or ""}


def actor_from_token(db: Session, token: str) -> Actor | None:
    user_id = read_user_id(token)
    if user_id is None:
        return None
    row = get_user(db, user_id)
    if row is None:
        return None
    return Actor(row.id, row.email, row.role, row.site_id or "")


def sign_in(db: Session, email: str, password: str) -> tuple[dict, str]:
    row = find_user_by_email(db, email.strip().lower())
    if row is None or not check_password(password, row.password_hash):
        raise PermissionError(Code.BAD_LOGIN)
    return public_user(row), sign_session(row.id)


def list_users(db: Session) -> list[dict]:
    return [public_user(row) for row in list_user_rows(db)]


def create_user(db: Session, email: str, password: str, site_id: str) -> None:
    email = email.strip().lower()
    if not EMAIL.match(email) or len(password) < 12 or not SITE_ID.match(site_id):
        raise ValueError(Code.BAD_USER)
    insert_user(db, secrets.token_hex(8), email, hash_password(password), "user", site_id)
    try:
        save(db)
    except Exception:
        undo(db)
        raise


def create_admin(db: Session, email: str, password: str) -> None:
    user_id, email, digest = new_admin(email, password)
    if find_user_by_email(db, email) is not None:
        raise ValueError(Code.EXISTS)
    insert_user(db, user_id, email, digest, "admin", None)
    save(db)


def list_sites(db: Session) -> list[dict]:
    return [
        {
            "id": row.id,
            "domain": row.domain,
            "origin_url": row.origin_url,
            "dry_run": bool(row.dry_run),
        }
        for row in list_site_rows(db)
    ]


def journal_host_ids(db: Session, actor: Actor) -> list[str] | None:
    if actor.role == "admin":
        return None
    found = [row.id for row in list_host_rows(db, actor.id) if isinstance(row, Host) and SITE_ID.match(row.id)]
    if not found:
        raise Unscoped()
    return found


def host_owner(actor: Actor) -> str | None:
    if actor.role == "admin":
        return None
    return actor.id


def shows_ip(actor: Actor) -> bool:
    return actor.role == "admin"


def clean_label(value: str) -> str:
    text = " ".join(str(value or "").split())
    if text == "" or len(text) > 64:
        raise ValueError(Code.BAD_HOST)
    return text


def public_host(row: Host, sites: list[HostSite], owner_email: str = "", install_secret: str = "") -> dict:
    body = {
        "id": row.id,
        "label": row.label,
        "collector": row.collector,
        "agent_version": row.agent_version or "",
        "owner_email": owner_email,
        "sites": [{"name": site.name, "enabled": bool(site.enabled)} for site in sites],
    }
    if install_secret:
        body["ingest_secret"] = install_secret
    return body


def remember_agent(db: Session, host_id: str, version: str) -> None:
    if version == "":
        return
    note_agent_version(db, host_id, version)


def assign_host(db: Session, actor: Actor, label: str, collector: str, owner_id: str) -> dict:
    if actor.role == "admin":
        if not SITE_ID.match(owner_id or ""):
            raise ValueError(Code.BAD_OWNER)
        owner = get_user(db, owner_id)
        if owner is None:
            raise LookupError(Code.UNKNOWN_USER)
        chosen = owner.id
    else:
        chosen = actor.id
    created = create_host(db, label, collector, chosen)
    if actor.role != "admin":
        created["ingest_secret"] = ingest_secret()
    return created


def create_host(db: Session, label: str, collector: str, owner_id: str) -> dict:
    label = clean_label(label)
    if collector not in COLLECTORS:
        raise ValueError(Code.BAD_HOST)
    if collector not in AVAILABLE:
        raise ValueError(Code.UNAVAILABLE)
    ident = ""
    for _ in range(5):
        candidate = secrets.token_hex(4)
        if not host_id_taken(db, candidate):
            ident = candidate
            break
    if ident == "" or not SITE_ID.match(owner_id):
        raise ValueError(Code.BAD_HOST)
    row = insert_host(db, ident, label, collector, owner_id)
    save(db)
    return public_host(row, [])


def remove_host(db: Session, host_id: str, owner_id: str | None = None) -> None:
    if not SITE_ID.match(host_id):
        raise ValueError(Code.BAD_HOST)
    if not delete_host_row(db, host_id, owner_id):
        raise LookupError(Code.MISSING)


def hosts_for(db: Session, actor: Actor) -> list[dict]:
    return list_hosts(db, host_owner(actor), reveal_install=actor.role != "admin")


def list_hosts(db: Session, owner_id: str | None = None, reveal_install: bool = False) -> list[dict]:
    emails = {row.id: row.email for row in list_user_rows(db)}
    hosts = list_host_rows(db, owner_id)
    grouped: dict[str, list[HostSite]] = {row.id: [] for row in hosts}
    for site in list_host_site_rows(db):
        if site.host_id in grouped:
            grouped[site.host_id].append(site)
    secret = ingest_secret() if reveal_install else ""
    return [public_host(row, grouped[row.id], emails.get(row.owner_id or "", ""), secret) for row in hosts]


def set_site_enabled(db: Session, host_id: str, name: str, enabled: bool, owner_id: str | None = None) -> None:
    name = site_name(name)
    if not SITE_ID.match(host_id) or name == "":
        raise ValueError(Code.BAD_SITE)
    if owner_id is not None and not host_owned(db, host_id, owner_id):
        raise LookupError(Code.MISSING)
    row = find_host_site(db, host_id, name)
    if row is None:
        raise LookupError(Code.MISSING)
    write_enabled(db, row, enabled)


def _journal_line(row: dict, name: str) -> str:
    stored = dict(row)
    stored.pop("routed", None)
    stored["site_id"] = name
    return json.dumps(stored, separators=(",", ":"))


def split_monitored(
    rows: list[dict],
    hosts: set[str],
    sites: dict[tuple[str, str], bool],
) -> tuple[list[str], list[tuple[str, str]]]:
    flags = dict(sites)
    fresh: list[tuple[str, str]] = []
    kept: list[str] = []
    pending: list[tuple[dict, str, str]] = []
    for row in rows:
        host_id = str(row.get("host_id") or "")
        if host_id not in hosts:
            raise ValueError(Code.UNKNOWN_HOST)
        name = site_name(str(row.get("site_id") or ""))
        if name == "":
            continue
        pending.append((row, host_id, name))
    opened = {(host_id, name) for row, host_id, name in pending if row.get("routed") is not False}
    seen: set[tuple[str, str]] = set()
    for row, host_id, name in pending:
        key = (host_id, name)
        if key not in flags:
            if key not in opened:
                kept.append(_journal_line(row, name))
                continue
            flags[key] = True
            if key not in seen:
                fresh.append(key)
                seen.add(key)
        if not flags[key]:
            continue
        kept.append(_journal_line(row, name))
    return kept, fresh


def filter_monitored(db: Session, lines: list[str]) -> list[str]:
    if not lines:
        return []
    rows = [json.loads(line) for line in lines]
    host_ids = {str(row.get("host_id") or "") for row in rows}
    kept, fresh = split_monitored(rows, hosts_present(db, host_ids), site_flags(db, host_ids))
    for host_id, name in fresh:
        insert_host_site(db, host_id, name)
    if fresh:
        save(db)
    return kept
