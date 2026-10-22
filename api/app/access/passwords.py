import base64
import hashlib
import hmac
import secrets

from app.codes import Code
from app.ids import EMAIL


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210000)
    return "pbkdf2$210000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def check_password(password: str, stored: str) -> bool:
    try:
        kind, rounds, salt_b64, digest_b64 = stored.split("$", 3)
        if kind != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def new_admin(email: str, password: str) -> tuple[str, str, str]:
    email = str(email or "").strip().lower()
    password = str(password or "")
    if not EMAIL.match(email) or len(password) < 12:
        raise ValueError(Code.BAD_ADMIN)
    return secrets.token_hex(8), email, hash_password(password)
