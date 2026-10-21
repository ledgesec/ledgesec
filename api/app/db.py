import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.access.models import Site, User
from app.edge.models import CertState


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


def ensure_users() -> None:
    if Site.__tablename__ != "sites" or CertState.__tablename__ != "cert_state":
        raise RuntimeError("postgres mapping does not match the schema")
    User.__table__.create(engine, checkfirst=True)

