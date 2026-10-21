import pytest

from app.access.passwords import check_password, new_admin


def test_stores_a_checkable_hash():
    user_id, email, digest = new_admin("Admin@Example.com", "correct horse battery")
    assert email == "admin@example.com"
    assert len(user_id) == 16
    assert check_password("correct horse battery", digest)
    assert not check_password("wrong horse battery", digest)


def test_refuses_a_short_password():
    with pytest.raises(ValueError):
        new_admin("admin@example.com", "short-pass")


def test_refuses_a_bad_email():
    with pytest.raises(ValueError):
        new_admin("not-an-email", "correct horse battery")
