"""
Authentification simple par mot de passe partagé.

Adaptée à un usage solo / petite équipe (pas de comptes utilisateurs
individuels) : un seul mot de passe protège toute l'application, ce qui
est le strict nécessaire pour qu'un hébergement gratuit (donc avec une URL
publique) ne rende pas les données des leads accessibles à n'importe qui
qui tomberait sur le lien.

Le jeton est un token signé (pas chiffré) contenant juste une date
d'expiration — il ne stocke aucune donnée sensible, seule sa signature
(basée sur SECRET_KEY) empêche de le falsifier.
"""

from __future__ import annotations

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_serializer = URLSafeTimedSerializer(settings.secret_key, salt="rdvrapide-session")


def verify_password(candidate: str) -> bool:
    """Compare le mot de passe fourni au mot de passe configuré.

    Le mot de passe de référence n'est pas stocké haché dans la config (il
    vient d'une variable d'environnement en clair), donc une comparaison à
    temps constant simple suffit ici ; bcrypt serait utile si on stockait
    un hash côté base, ce qui n'est pas le cas dans ce modèle mono-mot de
    passe.
    """
    import hmac

    return hmac.compare_digest(candidate, settings.app_password)


def create_session_token() -> str:
    return _serializer.dumps({"ok": True})


def verify_session_token(token: str) -> bool:
    try:
        _serializer.loads(token, max_age=settings.session_ttl_days * 24 * 3600)
        return True
    except (BadSignature, SignatureExpired):
        return False
