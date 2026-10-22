from alembic import command
from alembic.script import ScriptDirectory
from sqlalchemy.engine import make_url

import app.access.models
import app.edge.models  # noqa: F401 — register cert_state before reading metadata
from app.db import BASELINE, alembic_config, database_url, should_stamp_baseline
from app.orm import Base


def test_metadata_is_the_postgres_tables():
    assert set(Base.metadata.tables) == {"sites", "users", "cert_state", "hosts", "host_sites"}
    users = Base.metadata.tables["users"]
    assert users.c.email.unique
    assert users.c.site_id.nullable
    cert = Base.metadata.tables["cert_state"]
    assert any(fk.column.table.name == "sites" for fk in cert.c.site_id.foreign_keys)


def test_password_with_a_space_survives_the_url(monkeypatch):
    monkeypatch.setenv("PGPASSWORD", "alpha beta")
    assert make_url(database_url()).password == "alpha beta"


def test_password_plus_is_not_read_as_a_space(monkeypatch):
    monkeypatch.setenv("PGPASSWORD", "a+b")
    assert make_url(database_url()).password == "a+b"


def test_stamp_only_an_existing_schema_without_a_version():
    assert should_stamp_baseline({"sites", "users", "cert_state"})
    assert not should_stamp_baseline({"sites", "users", "cert_state", "alembic_version"})
    assert not should_stamp_baseline(set())
    assert not should_stamp_baseline({"users"})


def test_head_revision_follows_the_baseline():
    script = ScriptDirectory.from_config(alembic_config())
    assert BASELINE == "0001"
    assert script.get_current_head() == "0004"


def test_offline_upgrade_creates_the_tables(capsys):
    command.upgrade(alembic_config(), "head", sql=True)
    sql = capsys.readouterr().out
    assert "CREATE TABLE sites" in sql
    assert "CREATE TABLE users" in sql
    assert "CREATE TABLE cert_state" in sql
    assert "CREATE TABLE hosts" in sql
    assert "CREATE TABLE host_sites" in sql
    assert "owner_id" in sql
    assert "agent_version" in sql
    assert "alembic_version" in sql
