from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict


class PostCreate(BaseModel):
    date: datetime.date
    plateforme: str
    pilier: str
    contenu: str
    impressions: int = 0
    likes: int = 0
    commentaires: int = 0
    partages: int = 0


class PostOut(PostCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    taux_engagement: float = 0.0
