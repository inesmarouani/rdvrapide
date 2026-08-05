from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.core.config import settings
from app.db.session import get_db
from app.models.lead import Lead
from app.models.post import Post

router = APIRouter(prefix="/analyze", tags=["analyze"], dependencies=[Depends(require_auth)])


@router.post("")
def analyze(db: Session = Depends(get_db)):
    if not settings.anthropic_api_key:
        raise HTTPException(400, "ANTHROPIC_API_KEY manquante. Renseigne-la dans le fichier .env.")

    posts = db.query(Post).all()
    leads = db.query(Lead).all()

    par_pilier: dict[str, list[float]] = {}
    for p in posts:
        par_pilier.setdefault(p.pilier, []).append(p.taux_engagement)
    performance_pilier = [
        {"pilier": k, "engagement_moyen_pct": round(sum(v) / len(v), 1), "nb_posts": len(v)}
        for k, v in par_pilier.items()
    ]

    par_statut: dict[str, int] = {}
    for l in leads:
        par_statut[l.statut] = par_statut.get(l.statut, 0) + 1
    convertis = par_statut.get("Converti", 0)
    taux_conversion = round((convertis / len(leads)) * 100, 1) if leads else 0

    resume = {
        "nombre_posts": len(posts),
        "engagement_moyen_pct": round(sum(p.taux_engagement for p in posts) / len(posts), 1) if posts else 0,
        "performance_par_pilier": performance_pilier,
        "nombre_leads": len(leads),
        "repartition_statuts_leads": par_statut,
        "taux_conversion_pct": taux_conversion,
    }

    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": (
                "Tu es consultant en stratégie de communication B2B pour RdvRapide, un SaaS de "
                "secrétariat médical qui cible des cabinets médicaux et cherche à recruter des "
                "cabinets pilotes (pas encore de démo produit, agent IA en développement, "
                "téléopératrices humaines pour le moment).\n\n"
                f"Données du mois (JSON) :\n{resume}\n\n"
                "Donne une recommandation courte et actionnable en français (250 mots max) : "
                "1) ce qui marche et doit être renforcé, 2) ce qui doit être ajusté ou arrêté, "
                "3) une action concrète pour la semaine prochaine. Sois direct, pas de généralités."
            ),
        }],
    )
    texte = "".join(block.text for block in message.content if block.type == "text")
    return {"recommandation": texte, "resume": resume}
