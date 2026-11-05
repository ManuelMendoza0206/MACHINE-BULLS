"""App FastAPI del MVP: arranca DB, CORS, routers y media estatica.

Arranque local:

    cd backend && uv run uvicorn main:app --reload --port 8000

`pythonpath = ["src"]` en pyproject hace que los imports (`config`, `db`,
`domain`, `services`, `api`) resuelvan desde `src/`. La app vive en la raiz de
`src/` para que `main:app` funcione sin paquete intermedio.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api import garments, me, outfits, vton
from config import settings
from db.session import init_db
from domain.exceptions import EXCEPTION_STATUS_MAP, StyleMeException
from middleware.rate_limit import RateLimitMiddleware

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="StyleMe MVP API",
    version="0.1.0",
    description="Backend del MVP: analisis CLIP, recomendador cromatico y VTON real.",
)

# 1. Rate Limit Middleware: protege endpoints de mutacion costosa (B5 / api-gateway spec §2.3)
app.add_middleware(
    RateLimitMiddleware,
    limits={
        "/garments/upload": "20/minute",
        "/vton/try-on": "10/minute",
    },
)

# 2. CORS Middleware: orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StyleMeException)
async def handle_styleme_exception(request: Request, exc: StyleMeException) -> JSONResponse:
    """Mapea excepciones de dominio a codigos HTTP conformes (spec §2.2)."""
    status_code = EXCEPTION_STATUS_MAP.get(type(exc), 500)
    return JSONResponse(
        status_code=status_code,
        content={"error": exc.__class__.__name__, "message": str(exc)},
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
