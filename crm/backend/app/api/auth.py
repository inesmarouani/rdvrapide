from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.core.security import create_session_token, verify_password, verify_session_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    if not verify_password(body.password):
        raise HTTPException(401, "Mot de passe incorrect")
    return LoginResponse(token=create_session_token())


def require_auth(authorization: str | None = Header(default=None)) -> None:
    """Dépendance FastAPI à ajouter sur toute route à protéger.

    Attend un header `Authorization: Bearer <token>` obtenu via /auth/login.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentification requise")
    token = authorization.removeprefix("Bearer ").strip()
    if not verify_session_token(token):
        raise HTTPException(401, "Session invalide ou expirée")
