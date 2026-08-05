# Construit depuis la RACINE du projet (contexte = .), pas depuis backend/,
# pour pouvoir embarquer le frontend statique dans la même image :
#   docker build -f backend/Dockerfile .
# C'est ce que fait docker-compose.yml automatiquement (build.context: .,
# build.dockerfile: backend/Dockerfile).

FROM python:3.12-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Dépendances d'abord (layer caché tant que pyproject.toml/uv.lock ne changent pas)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Code backend + frontend statique dans la même image = un seul service à déployer
COPY backend/ .
COPY frontend/src ./frontend_static
RUN uv sync --frozen --no-dev

EXPOSE 8000

# Forme shell pour permettre l'expansion de $PORT (ex. Render impose son
# propre port). Alembic s'exécute à chaque démarrage — sans effet si le
# schéma est déjà à jour.
CMD sh -c "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
