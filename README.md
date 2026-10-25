# MACHINE-BULLS — Monorepo StyleMe

![StyleSync](https://img.shields.io/badge/StyleSync-IA-2563eb?style=flat-square) ![Diagrams](https://img.shields.io/badge/C4%2B-Diagrams-7c3aed?style=flat-square) ![Stack](https://img.shields.io/badge/Next.js%20%7C%20FastAPI%20%7C%20PyTorch-06b6d4?style=flat-square)

```
MACHINE-BULLS/
├── frontend/          # Next.js 16 + React 19 + Tailwind v4
│   └── src/           # App Router, features/, lib/, schemas/
├── backend/           # FastAPI + SQLAlchemy + MLflow (ver backend/README.md)
│   └── src/           # domain/, schemas/, api/, services/, db/, ml/
├── notebooks/         # 01 baseline · 02 EDA · 03 CLIP zero-shot (código ML/Data)
├── docs/              # plan-base, clickup, adr, architecture/
└── openspec/          # SDD specs (frontend/ + backend/)
```

## 🏗️ Ver arquitectura interactiva

**[→ Abrir el visor interactivo de arquitectura (C4+)](docs/architecture/diagrams/viewer.html)**

Seis diagramas navegables del sistema completo — MLOps, infraestructura híbrida, calidad,
frontend, protocolo de entrada de imágenes y ciclo de vida del modelo:

| Diagrama | Qué muestra |
| :--- | :--- |
| 🔧 [MLOps](docs/architecture/svgs/mlops.svg) | Reproducibilidad 100%: Git → DVC → Docker → Model Registry |
| ☁️ [Infra Híbrida](docs/architecture/svgs/hybrid.svg) | RTX 4070 local (dev) + H100/A100 cloud (producción) |
| 📊 [Calidad](docs/architecture/svgs/quality.svg) | 85% identity, 80% fidelity, <60s latencia, <1% error |
| 🖥️ [Frontend](docs/architecture/svgs/frontend.svg) | Next.js App Router, Zustand, TanStack Query, WebSocket |
| 📸 [Protocolo de Entrada](docs/architecture/svgs/protocol.svg) | A-Pose obligatoria, fondo neutro, 512×512px mínimo |
| 🔄 [Ciclo de Vida](docs/architecture/svgs/lifecycle.svg) | Dev → Train → Eval → Gate → Production |

Sin dependencias ni build — es HTML/CSS/JS puro, ábrelo directo en el navegador:

```bash
# Windows / macOS / Linux — o simplemente doble-click al archivo
start docs/architecture/diagrams/viewer.html    # Windows
open docs/architecture/diagrams/viewer.html     # macOS
xdg-open docs/architecture/diagrams/viewer.html # Linux
```

Documentación completa: [`docs/architecture/diagrams/README.md`](docs/architecture/diagrams/README.md).

## Quick start

```bash
# Frontend
cd frontend && npm ci && npm run dev   # http://localhost:3000
npm run verify                          # typecheck + lint + test + build

# Backend (existe repository: no hay requirements.txt, usa pyproject)
cd backend
pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8000

# Notebooks (ML/Data, deps livianas del repo)
pip install -r requirements.txt
```

ClickUp (equipo): reconciliación del tablero con
`node scripts/clickup/sync-sprint-1.mjs` — credencial local, nunca versionada.

Constitution: `.speckit/constitution.md` — PR required, 1 reviewer, declarar IA.
