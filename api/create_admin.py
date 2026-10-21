#!/usr/bin/env python3
"""Insert one admin into Postgres. The password is asked, not stored in the environment."""

import getpass
import sys

from server import new_admin, pg


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
    with pg() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone() is not None:
                raise SystemExit("that email is already in the database")
            cur.execute(
                "INSERT INTO users (id, email, password_hash, role, site_id) VALUES (%s, %s, %s, 'admin', NULL)",
                (user_id, email, digest),
            )
        conn.commit()
    print("admin written")


if __name__ == "__main__":
    main()
