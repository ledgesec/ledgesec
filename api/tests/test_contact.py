import json

from fastapi.testclient import TestClient

from app.codes import Code
from app.contact.service import CONTACT_LIMIT, clear_contacts, format_note, parse_note
from app.main import create_app

NOTE = {
    "name": "Ada",
    "email": "ada@shop.example",
    "host": "shop.example",
    "message": "Nginx on one machine.",
}


def setup_function() -> None:
    clear_contacts()


def test_a_note_escapes_markup() -> None:
    note = parse_note(
        json.dumps({**NOTE, "name": "<b>Ada</b>", "message": "a < c"}).encode(),
    )
    text = format_note(note)
    assert "<b>Ada</b>" not in text
    assert "&lt;b&gt;Ada&lt;/b&gt;" in text
    assert "shop.example" in text


def test_interest_names_the_pain() -> None:
    named = parse_note(json.dumps({**NOTE, "interest": "notice"}).encode())
    assert "notice" in format_note(named)
    client = TestClient(create_app(prepare=False))
    response = client.post("/v1/contact", json={**NOTE, "interest": "<b>"})
    assert response.status_code == 400
    assert response.json()["error"] == Code.BAD_BODY


def test_a_blank_note_is_rejected() -> None:
    client = TestClient(create_app(prepare=False))
    response = client.post("/v1/contact", json={**NOTE, "email": "ada"})
    assert response.status_code == 400
    assert response.json()["error"] == Code.BAD_BODY


def test_contact_sends_when_telegram_is_configured(monkeypatch) -> None:
    sent: dict[str, str] = {}

    def fake(text: str) -> None:
        sent["text"] = text

    monkeypatch.setattr("app.http.contact.post_telegram", fake)
    client = TestClient(create_app(prepare=False))
    response = client.post("/v1/contact", json=NOTE)
    assert response.status_code == 200
    assert response.json()["sent"] is True
    assert "Ada" in sent["text"]
    assert "token" not in response.text


def test_contact_is_unavailable_without_telegram(monkeypatch) -> None:
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT_ID", raising=False)
    client = TestClient(create_app(prepare=False))
    response = client.post("/v1/contact", json=NOTE)
    assert response.status_code == 503
    assert response.json()["error"] == Code.UNAVAILABLE


def test_contact_slows_a_repeat_sender(monkeypatch) -> None:
    monkeypatch.setattr("app.http.contact.post_telegram", lambda _text: None)
    client = TestClient(create_app(prepare=False))
    for _ in range(CONTACT_LIMIT):
        assert client.post("/v1/contact", json=NOTE).status_code == 200
    response = client.post("/v1/contact", json=NOTE)
    assert response.status_code == 429
    assert response.json()["error"] == Code.BUSY
