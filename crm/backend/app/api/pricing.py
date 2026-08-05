from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.db.session import get_db
from app.models.pricing import PricingScenario
from app.schemas.pricing import PricingScenarioIn, PricingScenarioOut

router = APIRouter(prefix="/pricing", tags=["pricing"], dependencies=[Depends(require_auth)])

DEFAULT_PARAMS = {
    "forfaitTeleoperatrice": 1900,
    "capaciteMin": 5,
    "capaciteMax": 9,
    "chargesFixesMensuelles": 400,
    "tauxIS": 15,
    "remisePilote": 35,
}
DEFAULT_TIERS = [
    {"id": "t1", "nom": "Essentiel", "poids": 0.7, "prix": 89},
    {"id": "t2", "nom": "Standard", "poids": 1.0, "prix": 179},
    {"id": "t3", "nom": "Cabinet occupé", "poids": 1.6, "prix": 299},
]
DEFAULT_NB = {"t1": 3, "t2": 2, "t3": 1}


@router.get("", response_model=PricingScenarioOut)
def get_pricing(db: Session = Depends(get_db)):
    scenario = db.get(PricingScenario, 1)
    if not scenario:
        scenario = PricingScenario(
            id=1, params=DEFAULT_PARAMS, tiers=DEFAULT_TIERS, nb_cabinets_par_tier=DEFAULT_NB
        )
        db.add(scenario)
        db.commit()
        db.refresh(scenario)
    return scenario


@router.put("", response_model=PricingScenarioOut)
def update_pricing(body: PricingScenarioIn, db: Session = Depends(get_db)):
    scenario = db.get(PricingScenario, 1)
    if not scenario:
        scenario = PricingScenario(id=1)
        db.add(scenario)
    scenario.params = body.params
    scenario.tiers = body.tiers
    scenario.nb_cabinets_par_tier = body.nb_cabinets_par_tier
    db.commit()
    db.refresh(scenario)
    return scenario
