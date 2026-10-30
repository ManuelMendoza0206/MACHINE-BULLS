"""ARQ worker: consumidor de jobs VTON del queue de Redis (spec 4.1.8).

Corre en proceso aparte (servicio `worker` en compose de la Etapa 2B, o
`arq services.vton.worker.WorkerSettings` desde backend/src en dev) y
ejecuta el pipeline sincronico existente:

    run_vton_job(ctx, job_id, human_image_path)  ->  pipeline.run_job(...)

El pipeline es sync (PIL + provider HTTP + SQLite) y corre en un thread del
loop (asyncio.to_thread); max_jobs=1 mantiene la serialidad que la GPU exige.
"""

from __future__ import annotations

import asyncio
import logging

from arq.connections import RedisSettings

from config import settings

logger = logging.getLogger(__name__)


async def run_vton_job(ctx: dict, job_id: str, human_image_path: str) -> str:
    """Job de ARQ: despacha el pipeline sync a un thread y reporta el fin."""

    def _pipeline_sync() -> str:
        from services.vton import pipeline

        pipeline.run_job(job_id, human_image_path)
        return job_id

    logger.info("worker: corriendo job VTON %s (human=%s)", job_id, human_image_path)
    # to_thread: PIL/httpx/sqlalchemy bloquean; el loop queda libre para health.
    return await asyncio.to_thread(_pipeline_sync)


async def startup(ctx: dict) -> None:  # pragma: no cover - solo logging
    logger.info("worker arriba; redis=%s", settings.redis_url)


class WorkerSettings:
    """Config del worker ARQ (convencion de la libreria)."""

    functions = [run_vton_job]  # noqa: RUF012
    on_startup = startup
    redis_settings = RedisSettings.from_dsn(settings.redis_url)

    # GPU serial: un solo job a la vez (precondicion del Layer Manager).
    max_jobs = 1
    # Un try-on puede tardar capas x timeout del provider; generous.
    job_timeout = max(900, int(settings.vton_http_timeout_s) * 4)
    max_tries = 2  # un reintento antes de dejar el job como fallido
