import hmac
import os
import re
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from sqlalchemy.orm import Session

from app.access.actor import Actor
from app.access.models import User


def session_secret() -> str:
    return os.environ.get("LEDGESEC_SESSION_SECRET", "")


def sign_session(user_id: str) -> str:
    secret = session_secret()
    if secret == "":
        raise PermissionError("session_unconfigured")
    exp = int((datetime.now(UTC) + timedelta(hours=12)).timestamp())
    message = f"v1.{user_id}.{exp}"
    mac = hmac.new(secret.encode(), message.encode(), sha256).hexdigest()
    return f"{message}.{mac}"


def read_user_id(token: str) -> str | None:
    secret = session_secret()
    if secret == "" or not token or token.count(".") != 3:
        return None
    version, user_id, exp, mac = token.split(".", 3)
    if version != "v1" or not re.fullmatch(r"[0-9a-f]{16}", user_id):
        return None
    message = f"v1.{user_id}.{exp}"
    expected = hmac.new(secret.encode(), message.encode(), sha256).hexdigest()
    if not hmac.compare_digest(expected, mac):
        return None
    try:
        if int(exp) < int(datetime.now(UTC).timestamp()):
            return None
    except ValueError:
        return None
    return user_id


def open_session(token: str, db: Session) -> Actor | None:
    user_id = read_user_id(token)
    if user_id is None:
        return None
    row = db.get(User, user_id)
    if row is None:
        return None
    return Actor(row.id, row.email, row.role, row.site_id or "")


def session_cookie(token: str, *, clear: bool = False) -> str:
    if clear:
        return "ledgesec_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure"
    return f"ledgesec_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200; Secure"
