# StyleMe Backend — `backend/src`

FastAPI + SQLAlchemy + SQL versionado para Postgres/pgvector. Consumed by `frontend/` via `NEXT_PUBLIC_API_BASE_URL`.

## Layout (hexagonal / feature-sliced)

```
backend/src/
├── domain/           # SQLAlchemy models: User, Garment, GarmentOwnership, Outfit, OutfitGarment, VTONJob
├── domain/schemas.py # Pydantic schemas (mirror frontend Zod in frontend/src/schemas/api/)
├── api/              # FastAPI routers: /garments, /outfits, /vton, /capsule
├── services/         # garment-analysis (CLIP), recommender, vton pipeline
└── db/               # Engine y sesiones; el DDL vive en migrations/*.sql
```

## Quick start

```bash
cd backend
uv sync                                   # deps reproducibles desde uv.lock
uvicorn main:app --reload --app-dir src   # http://localhost:8000

# Para una base Postgres local, aplicar SQL versionado antes de iniciar:
# DB_MODE=local DATABASE_URL=postgresql+psycopg://... uv run python scripts/apply_migrations.py
```

Nota: `source` root del repo también sirve para tests (`backend\tests`). SQLite
se conserva para la ejecución nativa de demo. En Postgres, la API exige que el
runner haya creado `schema_migrations`; no hace `create_all` ni ALTERs implícitos.
El stack completo (Postgres+Redis+migraciones+backend+worker+frontend) sale con
`docker compose -f infra/docker-compose.yml up -d --build` (raíz del repo).

Compose usa Postgres local por defecto. Para Supabase, define `DATABASE_URL` y
`DB_MODE=supabase` en el archivo de entorno que pases con `--env-file`; usa una
URL con esquema `postgresql+psycopg://` o `postgresql://`. El contenedor local
de Postgres sigue iniciándose en este modo, aunque la app se conecte a Supabase.

Contracts: `docs/context/plan-base.md` §11 + `openspec/specs/backend/domain-and-database/spec.md`

## Cola de jobs VTON (ARQ, spec 4.1.8)

El endpoint de try-on persiste el job (`pending`, stage `queued`) y lo encola
en Redis; el worker lo consume y corre el pipeline (GPU serial). Si Redis no
responde, el endpoint cae a `BackgroundTasks` y la demo sigue igual.

```bash
# backend + redis (redis puede ser el del compose)
docker compose -f infra/docker-compose.yml up -d redis
# worker en dev (desde backend/src, con venv activo):
arq services.vton.worker.WorkerSettings
```

Config: `REDIS_URL` (default `redis://localhost:6379/0`). Estados finos en
`VtonJob.stage` (`queued → validating → generating|layering → uploading →
completed|failed`); el status público (`pending|processing|completed|failed`)
se deriva vía `STAGE_TO_STATUS` — el contrato del frontend no cambia.
