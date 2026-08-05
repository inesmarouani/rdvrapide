"""
RdvRapide — API de pilotage communication & CRM leads.

Sert l'API sous /api. Si le dossier frontend_static existe (copié par le
Dockerfile de production), sert aussi le frontend en tant que fichiers
statiques — un seul service à déployer plutôt que deux. En développement
local sans Docker, ce dossier n'existe pas : le frontend continue d'être
servi séparément (voir README), l'API fonctionne à l'identique dans les
deux cas.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analyze, auth, events, leads, posts, pricing
from app.core.config import settings

app = FastAPI(title="RdvRapide API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(pricing.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.environment}


# --- Frontend (optionnel — seulement si présent, voir Dockerfile) ---------
_FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend_static")
if os.path.isdir(_FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend")
