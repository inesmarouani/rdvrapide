from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Column, Date, DateTime, String, Text

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=_uuid)
    date = Column(Date, nullable=False)
    type = Column(String, nullable=False)
    titre = Column(String, nullable=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
