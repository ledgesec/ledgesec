from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.orm import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text)
    site_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Host(Base):
    __tablename__ = "hosts"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    label: Mapped[str] = mapped_column(Text)
    collector: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class HostSite(Base):
    __tablename__ = "host_sites"

    host_id: Mapped[str] = mapped_column(Text, ForeignKey("hosts.id", ondelete="CASCADE"), primary_key=True)
    name: Mapped[str] = mapped_column(Text, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    domain: Mapped[str] = mapped_column(Text, unique=True)
    origin_url: Mapped[str] = mapped_column(Text)
    origin_host: Mapped[str] = mapped_column(Text)
    origin_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    verify_origin_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    dry_run: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
