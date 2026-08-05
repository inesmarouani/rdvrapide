from __future__ import annotations

import datetime

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB

from app.db.session import Base


class PricingScenario(Base):
    """
    Un scénario de tarification unique et partagé (pas d'historique de
    versions pour l'instant — la ligne id=1 est mise à jour à chaque
    sauvegarde). params/tiers/nb_cabinets sont stockés en JSONB pour rester
    flexibles sans migration à chaque ajustement de la grille tarifaire.
    """

    __tablename__ = "pricing_scenarios"

    id = Column(Integer, primary_key=True, default=1)
    params = Column(JSONB, nullable=False, default=dict)
    tiers = Column(JSONB, nullable=False, default=list)
    nb_cabinets_par_tier = Column(JSONB, nullable=False, default=dict)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
