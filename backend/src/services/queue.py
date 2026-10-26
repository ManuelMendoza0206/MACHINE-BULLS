"""Encolado de jobs VTON en Redis via ARQ (spec 4.1.8).

El endpoint de try-on persiste el job en `pending`(stage=queued) y lo encola.
Este modulo es el unico que conoce ARQ; el resto del backend no sabe que ahi
esta la cola. El error de Redis NUNCA rompe la demo: si el enqueue no funciona
(devuelve False), el endpoint cae a `BackgroundTasks` con el mismo contrato
publico. En razon de orden: se prefiere disponibilidad sobre garantia de cola
en el MVP; el spec completo (worker unico obligatorio) es de la iteracion
con Docker (Etapa 2B), donde Redis es dependencia dura del backend.
"""

from __future__ import annotations

import asyncio
import logging

from arq import create_pool
from arq.connections import RedisSettings

from config import settings

logger = logging.getLogger(__name__)

# Redis local caido / inalcanzable: no queremos requests colgando esperando al
# socket. El enqueue entero (pool + job) se acota a este timeout.
_ENQUEUE_TIMEOUT_S = 3.0


async def enqueue_vton_job(job_id: str, human_image_path: str) -> bool:
    """Encola `run_vton_job`. False si Redis no responde (caller hace fallback)."""
    try:
        async with asyncio.timeout(_ENQUEUE_TIMEOUT_S):
            pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        try:
            async with asyncio.timeout(_ENQUEUE_TIMEOUT_S):
                await pool.enqueue_job("run_vton_job", job_id, human_image_path)
        finally:
            # cerrar el pool libera la conexion; el job ya esta en la lista
            await pool.close()
        return True
    except Exception as exc:  # noqa: BLE001 - Redis caido ES el escenario esperado
        logger.warning(
            "Redis no disponible (%s); fallando a BackgroundTasks para job %s",
            type(exc).__name__,
            job_id,
        )
        return False
