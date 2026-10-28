import html
import json
import os
import re
import time
import urllib.error
import urllib.request

from pydantic import BaseModel, ValidationError, field_validator

from app.codes import Code
from app.errors import ApiError

NAME_MAX = 80
HOST_MAX = 253
MESSAGE_MAX = 2000
EMAIL_MAX = 254
INTEREST_MAX = 40
CONTACT_BODY_LIMIT = 8192
CONTACT_LIMIT = 5
CONTACT_WINDOW = 3600
TELEGRAM_TIMEOUT = 15
TOKEN_ENV = "TELEGRAM_BOT_TOKEN"
CHAT_ENV = "TELEGRAM_CHAT_ID"

_seen: dict[str, list[float]] = {}


class ContactNote(BaseModel):
    name: str
    email: str
    host: str = ""
    message: str
    interest: str = ""

    @field_validator("name", "email", "host", "message", "interest", mode="before")
    @classmethod
    def strip(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("expected a string")  # noqa: TRY004 — pydantic turns ValueError into a rejected body
        return value.strip()

    @field_validator("name")
    @classmethod
    def name_ok(cls, value: str) -> str:
        if not value or len(value) > NAME_MAX:
            raise ValueError
        return value

    @field_validator("email")
    @classmethod
    def email_ok(cls, value: str) -> str:
        if len(value) > EMAIL_MAX or " " in value or value.count("@") != 1:
            raise ValueError
        local, domain = value.split("@")
        if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError
        return value

    @field_validator("host")
    @classmethod
    def host_ok(cls, value: str) -> str:
        if len(value) > HOST_MAX or any(char.isspace() for char in value):
            raise ValueError
        return value

    @field_validator("interest")
    @classmethod
    def interest_ok(cls, value: str) -> str:
        if not value:
            return ""
        if len(value) > INTEREST_MAX or re.fullmatch(r"[a-z0-9-]+", value) is None:
            raise ValueError
        return value

    @field_validator("message")
    @classmethod
    def message_ok(cls, value: str) -> str:
        if not value or len(value) > MESSAGE_MAX:
            raise ValueError
        return value


def clear_contacts() -> None:
    _seen.clear()


def parse_note(raw: bytes) -> ContactNote:
    try:
        return ContactNote.model_validate_json(raw)
    except ValidationError as exc:
        raise ApiError(400, Code.BAD_BODY) from exc


def admit_contact(ip: str, now: float | None = None) -> None:
    moment = time.time() if now is None else now
    recent = [stamp for stamp in _seen.get(ip, []) if moment - stamp < CONTACT_WINDOW]
    if len(recent) >= CONTACT_LIMIT:
        _seen[ip] = recent
        raise ApiError(429, Code.BUSY)
    recent.append(moment)
    _seen[ip] = recent


def format_note(note: ContactNote) -> str:
    lines = [
        "[ledgesec.com]",
        "<b>Demo</b>",
        f"<b>Name:</b> {html.escape(note.name)}",
        f"<b>Email:</b> {html.escape(note.email)}",
    ]
    if note.host:
        lines.append(f"<b>Host:</b> {html.escape(note.host)}")
    if note.interest:
        lines.append(f"<b>Interest:</b> {html.escape(note.interest)}")
    lines.append(f"<b>Message:</b> {html.escape(note.message)}")
    return "\n".join(lines)


def post_telegram(text: str) -> None:
    token = os.environ.get(TOKEN_ENV, "")
    chat = os.environ.get(CHAT_ENV, "")
    if not token or not chat:
        raise ApiError(503, Code.UNAVAILABLE)
    payload = json.dumps({"chat_id": chat, "text": text, "parse_mode": "HTML"}).encode()
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TELEGRAM_TIMEOUT) as response:
            if response.status != 200:
                raise ApiError(503, Code.UNAVAILABLE)
    except ApiError:
        raise
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ApiError(503, Code.UNAVAILABLE) from exc
