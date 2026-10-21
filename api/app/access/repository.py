import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access.models import Site, User
from app.access.passwords import hash_password
from app.ids import EMAIL, SITE_ID


def public_user(row: User) -> dict:
    return {"id": row.id, "email": row.email, "role": row.role, "site_id": row.site_id or ""}


def find_user(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def list_users(db: Session) -> list[dict]:
    rows = db.scalars(select(User).order_by(User.email)).all()
    return [public_user(row) for row in rows]


def create_user(db: Session, email: str, password: str, site_id: str) -> None:
    email = email.strip().lower()
    if not EMAIL.match(email) or len(password) < 12 or not SITE_ID.match(site_id):
        raise ValueError("bad_user")
    db.add(
        User(
            id=secrets.token_hex(8),
            email=email,
            password_hash=hash_password(password),
            role="user",
            site_id=site_id,
        )
    )
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def list_sites(db: Session) -> list[dict]:
    rows = db.scalars(select(Site).order_by(Site.domain)).all()
    return [
        {
            "id": row.id,
            "domain": row.domain,
            "origin_url": row.origin_url,
            "dry_run": bool(row.dry_run),
        }
        for row in rows
    ]
