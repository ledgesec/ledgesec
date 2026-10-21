import hmac
from datetime import UTC, datetime
from hashlib import sha256

import pytest

from app.access.sessions import read_user_id, session_cookie, sign_session

SECRET = "session-secret"
USER_ID = "ab" * 8


def test_sign_and_read(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    token = sign_session(USER_ID)
    assert read_user_id(token) == USER_ID
    flipped = ("0" if token[-1] != "0" else "1")
    assert read_user_id(token[:-1] + flipped) is None


def test_expired_token_is_closed(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    exp = int(datetime.now(UTC).timestamp()) - 10
    message = f"v1.{USER_ID}.{exp}"
    mac = hmac.new(SECRET.encode(), message.encode(), sha256).hexdigest()
    assert read_user_id(f"{message}.{mac}") is None


def test_bad_expiry_is_closed(monkeypatch):
    monkeypatch.setenv("LEDGESEC_SESSION_SECRET", SECRET)
    message = f"v1.{USER_ID}.nope"
    mac = hmac.new(SECRET.encode(), message.encode(), sha256).hexdigest()
    assert read_user_id(f"{message}.{mac}") is None


def test_missing_secret_cannot_sign(monkeypatch):
    monkeypatch.delenv("LEDGESEC_SESSION_SECRET", raising=False)
    with pytest.raises(PermissionError, match="session_unconfigured"):
        sign_session(USER_ID)
    assert read_user_id("v1." + USER_ID + ".1." + ("ab" * 32)) is None


def test_cookie_clears_with_the_same_name():
    assert session_cookie("abc").startswith("ledgesec_session=abc;")
    assert "Max-Age=43200" in session_cookie("abc")
    assert session_cookie("", clear=True).startswith("ledgesec_session=;")
    assert "Max-Age=0" in session_cookie("", clear=True)
