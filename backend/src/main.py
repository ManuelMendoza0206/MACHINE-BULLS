"""App FastAPI del MVP: arranca DB, CORS, routers y media estatica.

Arranque local:

    cd backend && uv run uvicorn main:app --reload --port 8000

`pythonpath = ["src"]` en pyproject hace que los imports (`config`, `db`,
`domain`, `services`, `api`) resuelvan desde `src/`. La app vive en la raiz de
`src/` para que `main:app` funcione sin paquete intermedio.
"""

from __future__ import annotations

import logging
import sys
import asyncio
from pathlib import Path

# Asegura que src/ esté en sys.path tanto si uvicorn se invoca como src.main:app,
# con --app-dir src, o desde el contenedor Docker.
_SRC_DIR = Path(__file__).resolve().parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api import garments, me, outfits, planner, shopping, vton
from config import settings
from db.session import init_db
from domain.exceptions import EXCEPTION_STATUS_MAP, StyleMeException
from middleware.metrics import MetricsMiddleware, metrics_router
from middleware.rate_limit import RateLimitMiddleware
from services import storage

logging.basicConfig(level=logging.INFO)
_media_cleanup_task: asyncio.Task | None = None

app = FastAPI(
    title="StyleMe MVP API",
    version="0.1.0",
    description="Backend del MVP: analisis CLIP, recomendador cromatico y VTON real.",
)

# 1. Metrics Middleware: computa latencias, percentiles y alertas SLO (86e302a5f, 86e302a61)
app.add_middleware(MetricsMiddleware)

# 2. Rate Limit Middleware: protege endpoints de mutacion costosa (B5 / api-gateway spec §2.3)
app.add_middleware(
    RateLimitMiddleware,
    limits={
        "/garments/upload": "20/minute",
        "/shopping/evaluate": "20/minute",
        "/vton/try-on": "10/minute",
    },
    redis_url=settings.redis_url,
    trusted_proxy_ips=settings.trusted_proxy_ips,
)

# 3. CORS Middleware: orígenes permitidos (soporta cualquier puerto localhost/127.0.0.1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
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
app.include_router(planner.router)
app.include_router(shopping.router)
app.include_router(vton.router)
app.include_router(metrics_router)

# Imagenes servidas desde el disco local (reemplazo barato de Cloudinary).
settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.on_event("startup")
def _startup() -> None:
    """Inicializa SQLite, valida migraciones Postgres y programa la purga de fotos."""
    global _media_cleanup_task
    init_db()
    storage.purge_expired_human_photos(max_age_hours=settings.human_photo_retention_hours)
    _media_cleanup_task = asyncio.get_running_loop().create_task(_periodic_media_cleanup())


async def _periodic_media_cleanup() -> None:
    """Repite la retención mientras el proceso siga vivo (no solo al reiniciar)."""
    while True:
        await asyncio.sleep(settings.human_photo_purge_interval_seconds)
        await asyncio.to_thread(
            storage.purge_expired_human_photos,
            max_age_hours=settings.human_photo_retention_hours,
        )


@app.on_event("shutdown")
async def _shutdown() -> None:
    global _media_cleanup_task
    if _media_cleanup_task is not None:
        _media_cleanup_task.cancel()
        try:
            await _media_cleanup_task
        except asyncio.CancelledError:
            pass
        _media_cleanup_task = None


@app.get("/health")
def health() -> dict:
    """Healthcheck para la demo y para el compose."""
    return {"status": "ok", "vton_provider": settings.vton_provider}
