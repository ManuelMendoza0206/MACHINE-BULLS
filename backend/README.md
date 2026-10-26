# StyleMe Backend — `backend/src`

FastAPI + SQLAlchemy + Alembic + Supabase (Postgres + pgvector). Consumed by `frontend/` via `NEXT_PUBLIC_API_BASE_URL`.

## Layout (hexagonal / feature-sliced)

```
backend/src/
├── domain/           # SQLAlchemy models: User, Garment, GarmentOwnership, Outfit, OutfitGarment, VTONJob
├── schemas/          # Pydantic schemas (mirror frontend Zod in frontend/src/schemas/api/)
├── api/              # FastAPI routers: /garments, /outfits, /vton, /capsule
├── services/         # garment-analysis (CLIP), recommender, vton pipeline
└── db/               # Alembic migrations, triggers (on_auth_user_created)
```

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --port 8000
```

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
