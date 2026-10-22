#!/usr/bin/env python3
"""Insert one admin into Postgres. The password is asked, not stored in the environment."""

import getpass
import sys

from app.access.passwords import new_admin
from app.access.service import create_admin
from app.db import SessionLocal, migrate


def read_password():
    if sys.stdin.isatty():
        return getpass.getpass("password: ")
    return sys.stdin.readline().rstrip("\n")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: python create_admin.py EMAIL")
    password = read_password()
    try:
        new_admin(sys.argv[1], password)
    except ValueError:
        raise SystemExit("email or password was refused")
    migrate()
    with SessionLocal() as session:
        try:
            create_admin(session, sys.argv[1], password)
        except ValueError as exc:
            if str(exc) == "exists":
                raise SystemExit("that email is already in the database")
            raise SystemExit("email or password was refused")
    print("admin written")


if __name__ == "__main__":
    main()
