from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access.models import Host, HostSite, Site, User


def save(db: Session) -> None:
    db.commit()


def undo(db: Session) -> None:
    db.rollback()


def get_user(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def list_user_rows(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.email)).all())


def insert_user(db: Session, user_id: str, email: str, password_hash: str, role: str, site_id: str | None) -> None:
    db.add(User(id=user_id, email=email, password_hash=password_hash, role=role, site_id=site_id))


def list_site_rows(db: Session) -> list[Site]:
    return list(db.scalars(select(Site).order_by(Site.domain)).all())


def host_id_taken(db: Session, host_id: str) -> bool:
    return db.scalar(select(Host.id).where(Host.id == host_id)) is not None


def delete_host_row(db: Session, host_id: str, owner_id: str | None) -> bool:
    query = select(Host).where(Host.id == host_id)
    if owner_id is not None:
        query = query.where(Host.owner_id == owner_id)
    row = db.scalar(query)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def note_agent_version(db: Session, host_id: str, version: str) -> None:
    row = db.scalar(select(Host).where(Host.id == host_id))
    if not isinstance(row, Host) or row.agent_version == version:
        return
    row.agent_version = version
    db.commit()


def insert_host(db: Session, host_id: str, label: str, collector: str, owner_id: str) -> Host:
    row = Host(id=host_id, label=label, collector=collector, owner_id=owner_id)
    db.add(row)
    return row


def list_host_rows(db: Session, owner_id: str | None) -> list[Host]:
    query = select(Host).order_by(Host.label, Host.id)
    if owner_id is not None:
        query = query.where(Host.owner_id == owner_id)
    return list(db.scalars(query).all())


def list_host_site_rows(db: Session) -> list[HostSite]:
    return list(db.scalars(select(HostSite).order_by(HostSite.name)).all())


def host_owned(db: Session, host_id: str, owner_id: str) -> bool:
    found = db.scalar(select(Host.id).where(Host.id == host_id, Host.owner_id == owner_id))
    return found is not None


def find_host_site(db: Session, host_id: str, name: str) -> HostSite | None:
    return db.scalar(select(HostSite).where(HostSite.host_id == host_id, HostSite.name == name))


def write_enabled(db: Session, row: HostSite, enabled: bool) -> None:
    row.enabled = bool(enabled)
    db.commit()


def hosts_present(db: Session, host_ids: set[str]) -> set[str]:
    rows = db.scalars(select(Host.id).where(Host.id.in_(host_ids))).all()
    return set(rows)


def site_flags(db: Session, host_ids: set[str]) -> dict[tuple[str, str], bool]:
    rows = db.scalars(select(HostSite).where(HostSite.host_id.in_(host_ids))).all()
    return {(site.host_id, site.name): bool(site.enabled) for site in rows}


def insert_host_site(db: Session, host_id: str, name: str) -> None:
    db.add(HostSite(host_id=host_id, name=name, enabled=True))
