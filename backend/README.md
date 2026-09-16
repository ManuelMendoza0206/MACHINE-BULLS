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
