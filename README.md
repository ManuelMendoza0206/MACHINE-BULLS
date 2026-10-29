# MACHINE-BULLS — Monorepo StyleMe

![StyleSync](https://img.shields.io/badge/StyleSync-IA-2563eb?style=flat-square) ![Tests](https://img.shields.io/badge/tests-81%2F81-styleme-10b981?style=flat-square) ![Stack](https://img.shields.io/badge/Next.js%20%7C%20FastAPI%20%7C%20PyTorch-06b6d4?style=flat-square)

**StyleMe** es el MVP de try-on virtual multicapa: el persona (uploaded or demo) se viste con **1 a 6 prendas en capas generadas secuencialmente** (inferiores → superiores → exterior), nunca compositado gráfico: cada capa es una inferencia diffusion CatVTON condicionada sobre la capa anterior.

```
MACHINE-BULLS/
├── frontend/          # Next.js + React + Tailwind (ver frontend/README.md)
│   └── src/           # App Router, features/, lib/, schemas/
├── backend/           # FastAPI + SQLAlchemy + pgvector (ver backend/README.md)
│   └── src/           # domain/, api/, services/, db/, ml/
├── infra/             # docker-compose.yml + .env (modo demo) + smoke.sh
├── sample_data/       # muestras curadas para el smoke y el demo
├── docs/              # plan-base, context/, architecture/
└── openspec/          # SDD specs (frontend/ + backend/)
```

## 🏗️ Ver arquitectura interactiva

**[→ Abrir el visor interactivo (C4+) — diagramas ACTUALES del sistema](docs/architecture/diagrams/viewer.html)**

Cinco diagramas que reflejan lo que existe en el repo hoy (no roadmap):

| Diagrama | Qué muestra (real, verificable en código) |
| :--- | :--- |
| 🧰 [Stack](docs/architecture/svgs/stack.svg) | Contenedores (compose) + CatVTON nativo en el GPU del host vía `host.docker.internal` |
| 🔄 [Pipeline](docs/architecture/svgs/pipeline.svg) | Ciclo de vida real del job: `VtonStage` (encolado → validación → capas generadas secuencialmente) |
| 📸 [Protocolo de Entrada](docs/architecture/svgs/protocol.svg) | Cliente: blur (varianza laplaciana); servidor: A-Pose con MediaPipe |
| 🧪 [Pruebas](docs/architecture/svgs/testing.svg) | Pirámide real: 81 pytest, e2e de browser, smoke 7 pasos con GPU |
| 🚀 [Despliegue](docs/architecture/svgs/deployment.svg) | 4 modos de provider + fallback a BackgroundTasks si Redis cae |

```bash
start docs/architecture/diagrams/viewer.html    # Windows
open  docs/architecture/diagrams/viewer.html    # macOS
xdg-open docs/architecture/diagrams/viewer.html # Linux
```

## Quick start — demo completa (Stack compose)

```bash
# 1) Server de inferencia CatVTON, NATIVO en el host (fuera del Docker):
#    usa el venv del repo CatVTON con torch CUDA (la 4070 no pasa al contenedor)
cd E:\MACHINEBULLS\CatVTON && venv\Scripts\python.exe server.py   # :7861

# 2) Stack: db + redis + backend + worker + frontend (orden saludable via healthchecks)
docker compose -f infra/docker-compose.yml up -d --build

# 3) Demo reproducible de punta a punta (7 pasos, incluye job multicapa real):
bash infra/smoke.sh           # Git Bash en Windows; python: fallback py -> venv
#    → SMOKE OK provider=catvton, outfit=ed63636a..., (3 capas)

# 4) Frontend en :3000, API en :8000, resultado del job en /media (URL absoluta)
```

El `infra/.env` commiteado define el modo demo: `VTON_PROVIDER=catvton` +
`VTON_HTTP_URL=http://host.docker.internal:7861/tryon`. Otros modos
(`mock` / VM http / Replicate) en [Despliegue](docs/architecture/svgs/deployment.svg).

## Quick start — desarrollo

```bash
# Frontend
cd frontend && npm ci && npm run dev      # http://localhost:3000
npm run verify                            # typecheck + lint + test + build
npm run test:e2e                          # Playwright (webServer propio en :3100)

# Backend (root venv para dev local)
cd backend
uv sync                                   # deps por uv.lock (reproducible)
uvicorn main:app --reload --app-dir src   # http://localhost:8000
arq services.vton.worker.WorkerSettings   # worker de la cola (desde backend/src)
pytest tests/ -q                          # 81 tests (unit + integracion + fallback)
```

Componente inteligente (clasificador zero-shot CLIP + validación A-Pose + VTON
diffusion por capas): cómo correr entrenamiento/evaluación en
[`backend/src/ml/README.md`](backend/src/ml/README.md).

## Resultados experimentales

Evaluación zero-shot de CLIP sobre el conjunto curado de prendas reales,
con el CLI del repo (`backend/src/ml/metrics/zero_shot.py`) — reproducible:

```bash
cd backend/src
python -m ml.metrics.zero_shot --fotos ../../sample_data/clip_grueso \
  --etiquetas ../../sample_data/clip_labels_curado.csv \
  --nivel CATEGORIA --salida ../../sample_data/clip_eval_curado.json
```

| Métrica | Valor | Nota |
|---|---|---|
| n / categorías | 9 / {top, dress, bottom} | fotos reales (dataset demo CatVTON + crop de jeans) |
| accuracy top-1 | **0.889** (8/9) | ensemble de 3 plantillas |
| IC95% (Wilson) | [0.565, 0.980] | N pequeño → intervalo amplio |
| F1 macro | 0.630 | una de las confusiones le pega al recall de dress |
| objetivo (plan-base 9.1) 0.82 | **no confirmable aún** | el IC95% entra bajo el objetivo: con N=9 no se puede afirmar |
| ensemble vs prompt único | base 9/9, ensemble 8/9 (Δ −0.111) | McNemar p=1.0: sin diferencia significativa; el módulo recomienda el prompt más simple |

Interpretación honesta: el **pipeline de métricas funciona y las etiquetas
manuales existen**, pero la evaluación estadística contra el objetivo del
proyecto requiere las imágenes del dataset etiquetado completo (30 pares ya
catalogados en `sample_data/clip_labels_grueso.csv` — sus fotos viven en el
dataset PolyVore, no en el repo). Pendiente del sprint de datos: bajarlas y
re-evaluar; entretanto los números de run del modelo en producción están en
los logs del worker (duración/capa) y el smoke completo 7/7.

Raw: [`sample_data/clip_eval_curado.json`](sample_data/clip_eval_curado.json).

Constitution: `.speckit/constitution.md` — PR required, 1 reviewer, declarar IA.
