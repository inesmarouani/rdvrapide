from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    date: datetime.date
    type: str
    titre: str
    notes: str = ""


class EventOut(EventCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
