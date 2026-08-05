from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict


class LeadCreate(BaseModel):
    cabinet: str
    contact: str = ""
    email: str = ""
    telephone: str = ""
    statut: str = "Nouveau"
    ville: str = ""
    volume_appels_semaine: str = ""
    source_post_id: str | None = None


class LeadUpdate(BaseModel):
    cabinet: str | None = None
    contact: str | None = None
    email: str | None = None
    telephone: str | None = None
    statut: str | None = None
    ville: str | None = None
    volume_appels_semaine: str | None = None
    source_post_id: str | None = None


class LeadNoteCreate(BaseModel):
    contenu: str


class LeadNoteOut(LeadNoteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime.datetime


class LeadRelanceCreate(BaseModel):
    titre: str
    date_prevue: datetime.date


class LeadRelanceOut(LeadRelanceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    fait: bool


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cabinet: str
    contact: str
    email: str
    telephone: str
    statut: str
    ville: str
    volume_appels_semaine: str
    source_post_id: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    notes: list[LeadNoteOut] = []
    relances: list[LeadRelanceOut] = []
