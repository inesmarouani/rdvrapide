from __future__ import annotations

import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PricingScenarioIn(BaseModel):
    params: dict[str, Any]
    tiers: list[dict[str, Any]]
    nb_cabinets_par_tier: dict[str, Any]


class PricingScenarioOut(PricingScenarioIn):
    model_config = ConfigDict(from_attributes=True)
    updated_at: datetime.datetime | None = None
