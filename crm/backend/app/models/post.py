from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Column, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=_uuid)
    date = Column(Date, nullable=False)
    plateforme = Column(String, nullable=False)
    pilier = Column(String, nullable=False)
    contenu = Column(Text, nullable=False)
    impressions = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    commentaires = Column(Integer, default=0)
    partages = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    leads = relationship("Lead", back_populates="source_post")

    @property
    def taux_engagement(self) -> float:
        interactions = (self.likes or 0) + (self.commentaires or 0) + (self.partages or 0)
        if not self.impressions:
            return 0.0
        return round((interactions / self.impressions) * 100, 2)
