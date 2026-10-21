from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm import Base


class CertState(Base):
    __tablename__ = "cert_state"

    site_id: Mapped[str] = mapped_column(Text, ForeignKey("sites.id"), primary_key=True)
    status: Mapped[str] = mapped_column(Text)
    not_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
