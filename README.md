# MACHINE-BULLS — Monorepo StyleMe

```
MACHINE-BULLS/
├── frontend/          # Next.js 16 + React 19 + Tailwind v4 (ver frontend/README.md)
│   └── src/           # App Router, features/, lib/, schemas/
├── backend/           # FastAPI + SQLAlchemy + pgvector (ver backend/README.md)
│   └── src/           # domain/, schemas/, api/, services/, db/
├── docs/              # plan-base, frontend-plan, clickup
└── openspec/          # SDD specs (frontend/ + backend/)
```

## Quick start

```bash
# Frontend
cd frontend && npm ci && npm run dev   # http://localhost:3000
npm run verify   # typecheck + lint + test + build

# Backend
cd backend && pip install -r requirements.txt  # o pyproject.toml
uvicorn src.main:app --reload
```

Constitution: `.speckit/constitution.md` — PR required, 1 reviewer, declarar IA.
