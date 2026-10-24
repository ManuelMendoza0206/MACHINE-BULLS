"""App FastAPI del MVP: arranca DB, CORS, routers y media estatica.

Arranque local:

    cd backend && uv run uvicorn main:app --reload --port 8000

`pythonpath = ["src"]` en pyproject hace que los imports (`config`, `db`,
`domain`, `services`, `api`) resuelvan desde `src/`. La app vive en la raiz de
`src/` para que `main:app` funcione sin paquete intermedio.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import garments, me, outfits, vton
from config import settings
from db.session import init_db

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="StyleMe MVP API",
    version="0.1.0",
    description="Backend del MVP: analisis CLIP, recomendador cromatico y VTON real.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(garments.router)
app.include_router(me.router)
app.include_router(outfits.router)
app.include_router(vton.router)

# Imagenes servidas desde el disco local (reemplazo barato de Cloudinary).
settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.on_event("startup")
def _startup() -> None:
    """Crea tablas al arrancar (SQLite). En Postgres lo hace Alembic."""
    init_db()


@app.get("/health")
def health() -> dict:
    """Healthcheck para la demo y para el compose."""
    return {"status": "ok", "vton_provider": settings.vton_provider}
