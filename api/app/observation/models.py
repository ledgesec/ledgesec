from datetime import datetime

from sqlalchemy import Boolean, DateTime, Text, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.orm import Base


class ProbePattern(Base):
    __tablename__ = "probe_rules"
    __table_args__ = (UniqueConstraint("kind", "pattern"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
