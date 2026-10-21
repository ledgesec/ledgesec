import os
from pathlib import Path
from urllib.parse import quote_plus

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker


def database_url() -> str:
    user = quote_plus(os.environ.get("PGUSER", "ledgesec"))
    password = quote_plus(os.environ.get("PGPASSWORD", ""))
    host = os.environ.get("PGHOST", "127.0.0.1")
    port = os.environ.get("PGPORT", "5432")
    name = os.environ.get("PGDATABASE", "ledgesec")
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{name}"


engine = create_engine(database_url(), pool_pre_ping=True, connect_args={"connect_timeout": 2})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def postgres_ready() -> None:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


BASELINE = "0001"
ROOT = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", database_url().replace("%", "%%"))
    return cfg


def should_stamp_baseline(table_names: set[str]) -> bool:
    present = {"sites", "users", "cert_state"} <= table_names
    return present and "alembic_version" not in table_names


def migrate() -> None:
    cfg = alembic_config()
    with engine.connect() as connection:
        names = set(inspect(connection).get_table_names())
    if should_stamp_baseline(names):
        command.stamp(cfg, BASELINE)
    command.upgrade(cfg, "head")

