from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=_uuid)
    cabinet = Column(String, nullable=False)
    contact = Column(String, default="")
    email = Column(String, default="")
    telephone = Column(String, default="")
    statut = Column(String, default="Nouveau")
    ville = Column(String, default="")
    volume_appels_semaine = Column(String, default="")
    source_post_id = Column(String, ForeignKey("posts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    source_post = relationship("Post", back_populates="leads")
    notes = relationship(
        "LeadNote", back_populates="lead", cascade="all, delete-orphan", order_by="LeadNote.created_at.desc()"
    )
    relances = relationship(
        "LeadRelance", back_populates="lead", cascade="all, delete-orphan", order_by="LeadRelance.date_prevue"
    )


class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(String, primary_key=True, default=_uuid)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)
    contenu = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lead = relationship("Lead", back_populates="notes")


class LeadRelance(Base):
    __tablename__ = "lead_relances"

    id = Column(String, primary_key=True, default=_uuid)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)
    titre = Column(String, nullable=False)
    date_prevue = Column(Date, nullable=False)
    fait = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lead = relationship("Lead", back_populates="relances")
