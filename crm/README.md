# RdvRapide — Pilotage communication & CRM

Application de pilotage de la stratégie de communication (posts, performance
par pilier de contenu) et CRM du pipeline de leads (cabinets pilotes).

## Architecture

```
rdvrapide/
├── backend/                 # API FastAPI + sert le frontend en production
│   ├── app/
│   │   ├── main.py           # point d'entrée : routers API + fichiers statiques
│   │   ├── core/
│   │   │   ├── config.py     # configuration (pydantic-settings, lit .env)
│   │   │   └── security.py   # mot de passe partagé + jetons de session
│   │   ├── db/session.py     # connexion PostgreSQL (SQLAlchemy)
│   │   ├── models/           # Post, Lead, LeadNote, LeadRelance, Event, PricingScenario
│   │   ├── schemas/          # schémas Pydantic (validation entrée/sortie)
│   │   └── api/               # routers : auth, posts, leads, events, analyze, pricing
│   ├── alembic/               # migrations de schéma versionnées
│   ├── tests/
│   ├── pyproject.toml         # dépendances (géré par uv)
│   ├── uv.lock                 # lockfile — build 100% reproductible
│   └── Dockerfile              # construit depuis la racine du projet (voir plus bas)
├── frontend/src/               # HTML/JS/CSS statique — zéro build step
├── docker-compose.yml          # orchestration : db + app (un seul service applicatif)
└── .env.example
```

**Architecture volontairement simple :** en développement, `backend/` et `frontend/` restent deux dossiers séparés (facile à faire évoluer indépendamment). En production, le `Dockerfile` du backend copie le frontend statique dans son image et FastAPI le sert directement — **un seul service à déployer et à héberger**, pas de CORS entre deux origines, pas de synchronisation d'URL entre deux hébergeurs différents.

Le backend continue de fonctionner seul (API pure) si besoin — le montage du frontend est conditionnel : `app/main.py` ne sert les fichiers statiques que si le dossier `frontend_static` existe (créé uniquement par le `Dockerfile`).

## Démarrage avec Docker (recommandé)

Prérequis : [Docker](https://www.docker.com/products/docker-desktop/) installé.

```bash
cp .env.example .env
# édite .env : APP_PASSWORD et SECRET_KEY sont obligatoires (voir plus haut)

docker compose up --build
```

- Application (frontend + API) : http://localhost:8080
- Doc interactive de l'API : http://localhost:8080/docs
- PostgreSQL exposé sur le port 5433 (utile pour se connecter avec un client SQL)

Les migrations Alembic s'exécutent automatiquement au démarrage (`alembic upgrade head` avant de lancer uvicorn) — la base est toujours à jour sans étape manuelle.

Pour tout arrêter et repartir de zéro (⚠️ supprime les données) :
```bash
docker compose down -v
```

## Développement local sans Docker

Prérequis : Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/), un PostgreSQL accessible.

```bash
cd backend
cp .env.example .env   # renseigne DATABASE_URL vers ton Postgres local

uv sync                 # installe les dépendances dans .venv, selon uv.lock
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Le frontend est un simple dossier statique — sers-le avec n'importe quel
serveur de fichiers pendant le développement :
```bash
cd frontend/src
python3 -m http.server 8080
```
Édite `frontend/src/config.js` pour pointer `API_BASE_URL` vers
`http://localhost:8000/api` (pas de proxy nginx en local sans Docker).

## Migrations

Après toute modification d'un modèle dans `app/models/` :
```bash
cd backend
uv run alembic revision --autogenerate -m "description du changement"
uv run alembic upgrade head
```
Vérifie toujours le fichier généré dans `alembic/versions/` avant de
l'appliquer — l'autogenerate ne détecte pas tout (renommages de colonnes,
etc.).

## Tests

```bash
cd backend
uv run pytest
```

## Qualité de code

```bash
cd backend
uv run ruff check .
```

## Analyse IA (optionnel)

Le bouton "Analyser avec Claude" du tableau de bord envoie un **résumé
agrégé** (statistiques, jamais les coordonnées des leads) à l'API Anthropic.
Renseigne `ANTHROPIC_API_KEY` dans `.env` pour l'activer.

## Sauvegarder / restaurer les données

```bash
# Sauvegarde
docker compose exec db pg_dump -U rdvrapide rdvrapide > backup.sql

# Restauration
docker compose exec -T db psql -U rdvrapide rdvrapide < backup.sql
```

## Accès privé — obligatoire dès que tu héberges en ligne

L'application est protégée par un **mot de passe partagé** (`APP_PASSWORD`). Sans lui, `docker compose up` refuse de démarrer — c'est volontaire : impossible d'exposer l'app en ligne sans y avoir pensé.

Ce que ça protège : toutes les routes de l'API (`/api/posts`, `/api/leads`, `/api/pricing`, etc.) exigent un jeton obtenu via `/api/auth/login`, valable 14 jours. Le frontend affiche un écran de connexion tant que ce jeton n'est pas présent.

Ce que ça ne protège pas : c'est un mot de passe **unique partagé**, pas des comptes individuels — adapté à un usage solo ou petite équipe de confiance, pas à un produit ouvert à des clients externes. Si un jour des cabinets doivent se connecter eux-mêmes, il faudra un vrai système de comptes.

**Génère `SECRET_KEY` avant tout déploiement** :
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Héberger gratuitement (Neon + Render — un seul service)

Combo testé et à jour en 2026, sans carte bancaire requise, données privées grâce au mot de passe ci-dessus. Grâce à l'architecture fusionnée (frontend servi par le backend), **il n'y a qu'un seul service web à créer sur Render**, plus la base sur Neon.

**Pourquoi ce combo et pas Render tout-en-un :** le PostgreSQL gratuit de Render est **supprimé après 30 jours** — inutilisable pour des données de leads qu'on veut garder. Neon, lui, est gratuit en permanence (pas un essai), avec mise en veille automatique après inactivité mais aucune suppression de données.

### 1. Base de données — Neon
1. Crée un compte sur [neon.tech](https://neon.tech) (gratuit, sans CB).
2. Crée un projet → copie la chaîne de connexion fournie (commence par `postgresql://...`).
3. Adapte-la au format attendu par ce projet : remplace `postgresql://` par `postgresql+psycopg://` en début de chaîne.

### 2. Application (frontend + backend) — Render (Web Service)
1. Pousse ce projet sur un dépôt GitHub (privé si tu préfères — Render gère les deux gratuitement).
2. Sur [render.com](https://render.com), crée un **Web Service**, connecte le dépôt.
3. Configuration du service :
   - **Root Directory** : laisse vide (racine du dépôt) — le `Dockerfile` référencé est `backend/Dockerfile`, et il a besoin du dossier `frontend/` à côté pour fonctionner.
   - **Dockerfile Path** : `backend/Dockerfile`
   - Render détecte le reste automatiquement.
4. Renseigne les variables d'environnement dans le dashboard Render :
   - `DATABASE_URL` → la chaîne Neon adaptée à l'étape 1
   - `APP_PASSWORD`, `SECRET_KEY` → tes valeurs générées, jamais celles par défaut
   - `ANTHROPIC_API_KEY` → optionnel
5. Render assigne le port via la variable `PORT` — déjà géré par le `Dockerfile`, rien à faire.

⚠️ Le service gratuit **se met en veille après 15 minutes d'inactivité** et met 30 à 60 secondes à se réveiller au prochain accès. Pour un usage interne ponctuel (toi qui consultes le CRM en journée), c'est un désagrément mineur, pas un blocage.

### Résultat
Une seule URL publique (donc gratuite) pour tout — frontend et API confondus — mais dont les données restent inaccessibles sans le mot de passe. Coût mensuel : 0 €, tant que tu restes sous les limites gratuites (largement suffisantes pour un usage solo/petite équipe : 0,5 Go de base de données, 750h/mois de calcul).

## Aller vers un environnement de production réel

Cette configuration Docker Compose convient à un usage petite équipe /
auto-hébergé. Pour une mise en production plus large :
- Remplacer les mots de passe par défaut dans `.env`.
- Mettre PostgreSQL derrière un service managé (RDS, Cloud SQL, etc.) plutôt que le conteneur `db`.
- Ajouter HTTPS devant nginx (Caddy, Traefik, ou un load balancer managé).
- Passer les secrets (clé Anthropic, mot de passe DB) par un gestionnaire de secrets plutôt qu'un fichier `.env`.
