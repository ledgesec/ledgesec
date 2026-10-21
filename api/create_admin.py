#!/usr/bin/env python3
"""Insert one admin into Postgres. The password is asked, not stored in the environment."""

import getpass
import sys

from sqlalchemy import select

from app.access.models import User
from app.access.passwords import new_admin
from app.db import SessionLocal, migrate


def read_password():
    if sys.stdin.isatty():
        return getpass.getpass("password: ")
    return sys.stdin.readline().rstrip("\n")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: python create_admin.py EMAIL")
    try:
        user_id, email, digest = new_admin(sys.argv[1], read_password())
    except ValueError:
        raise SystemExit("email or password was refused")
    migrate()
    with SessionLocal() as session:
        existing = session.scalar(select(User.id).where(User.email == email))
        if existing is not None:
            raise SystemExit("that email is already in the database")
        session.add(User(id=user_id, email=email, password_hash=digest, role="admin"))
        session.commit()
    print("admin written")


if __name__ == "__main__":
    main()
