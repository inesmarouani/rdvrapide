from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/rdvrapide"
    anthropic_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost"]
    environment: str = "development"

    # --- Accès privé ---------------------------------------------------
    # Un seul mot de passe partagé protège toute l'application (adapté à un
    # usage solo / petite équipe). Change absolument APP_PASSWORD et
    # SECRET_KEY avant tout hébergement public — les valeurs par défaut ne
    # sont là que pour permettre de démarrer en local sans configuration.
    app_password: str = "change-moi"
    secret_key: str = "change-moi-aussi-cle-longue-et-aleatoire"
    session_ttl_days: int = 14


settings = Settings()
