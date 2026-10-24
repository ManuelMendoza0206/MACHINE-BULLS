"""Pipeline de jobs VTON (B4).

El flujo del MVP:

1. `create_job` persiste el job en `processing` y devuelve el id (el frontend
   arranca a hacer polling inmediatamente; contrato: status de creacion es
   siempre 'processing').
2. El endpoint lanza `run_job` en un thread de FastAPI `BackgroundTasks` (no
   asyncio: el proveedor Replicate es sincrono y PIL tambien).
3. `run_job` itera las capas del outfit de abajo hacia arriba, encadenando la
   salida de cada try-on como entrada de la siguiente (asi el resultado final
   trae todas las prendas). Guarda cada resultado en storage y actualiza el
   job.

IDM-VTON no soporta footwear ni bag: esas capas se skipean con log. Si el
outfit quedara sin capas soportables, el job falla con mensaje claro.
"""

from __future__ import annotations

import logging
import traceback

from db.session import SessionLocal
from domain.enums import VtonJobStatus
from domain.models import Garment, Outfit, OutfitGarment, VtonJob
from services import storage
from services.vton.provider import VtonInferenceProvider, build_provider

logger = logging.getLogger(__name__)

# Posiciones que IDM-VTON puede aplicar (equivalente a VTON_CATEGORY keys).
_SOPORTADAS = {"top", "bottom", "dress", "outerwear"}


def run_job(job_id: str, human_image_path: str) -> None:
    """Ejecuta el try-on encadenado de todas las capas del job. Corre en background."""
    provider = build_provider()
    session = SessionLocal()
    try:
        job = session.get(VtonJob, job_id)
        if job is None:
            logger.error("VTON job %s no existe", job_id)
            return

        try:
            resultado_path = _procesar(session, job, human_image_path, provider)
            job.result_path = resultado_path
            job.status = VtonJobStatus.COMPLETED.value
        except Exception as exc:  # noqa: BLE001 - el fallo va al job, no revienta el server
            logger.error("VTON job %s fallo: %s\n%s", job_id, exc, traceback.format_exc())
            job.status = VtonJobStatus.FAILED.value
            job.error_message = str(exc)[:1000]
        session.commit()
    finally:
        session.close()


def _procesar(session, job: VtonJob, human_image_path: str, provider: VtonInferenceProvider) -> str:
    """Corre las capas encadenadas y devuelve el path relativo del resultado."""
    capas = _capas_del_job(session, job)
    if not capas:
        raise ValueError(
            "el outfit no tiene prendas que IDM-VTON pueda aplicar "
            "(solo soporta top/bottom/dress/outerwear; footwear y bag se omiten)"
        )

    humano = storage.absolute_path(human_image_path).read_bytes()
    resultado = humano
    for i, (garment, posicion) in enumerate(capas):
        categoria = _categoria_vton(posicion)
        prenda_bytes = storage.absolute_path(garment.processed_image_path).read_bytes()
        descripcion = _descripcion(garment)
        logger.info(
            "VTON job %s: capa %d/%d (%s -> %s) con %s",
            job.id, i + 1, len(capas), posicion, categoria, provider.name,
        )
        resultado = provider.try_on(
            human_image=resultado,
            garment_image=prenda_bytes,
            garment_description=descripcion,
            category=categoria,
        )

    relativo, _url = storage.save_image(resultado, "vton")
    return relativo


def _capas_del_job(session, job: VtonJob) -> list[tuple[Garment, str]]:
    """Prendas del outfit ordenadas de abajo hacia arriba, solo soportables."""
    if not job.outfit_id:
        return []
    filas = (
        session.query(OutfitGarment, Garment)
        .join(Garment, Garment.id == OutfitGarment.garment_id)
        .filter(OutfitGarment.outfit_id == job.outfit_id)
        .all()
    )
    orden = {"bottom": 0, "top": 1, "outerwear": 2, "dress": 1}
    filas = [f for f in filas if f[0].position in _SOPORTADAS]
    filas.sort(key=lambda f: orden.get(f[0].position, 9))
    return [(g, og.position) for og, g in filas]


def _categoria_vton(posicion: str) -> str:
    from domain.enums import VTON_CATEGORY

    return VTON_CATEGORY.get(posicion, "upper")


def _descripcion(garment: Garment) -> str:
    """Descripcion de prenda para el modelo: color dominante + categoria."""
    color = "clothing"
    if garment.dominant_colors:
        color = _color_name(garment.dominant_colors[0])
    return f"a {color} {garment.category}"


def _color_name(color: dict) -> str:
    """Nombre grueso del color desde HSV, para el prompt del modelo."""
    h, s, v = color.get("h", 0), color.get("s", 0), color.get("v", 100)
    if s < 20:
        return "black" if v < 30 else ("white" if v > 80 else "gray")
    if h < 15 or h >= 345:
        return "red"
    if h < 45:
        return "orange"
    if h < 70:
        return "yellow"
    if h < 160:
        return "green"
    if h < 200:
        return "cyan"
    if h < 260:
        return "blue"
    if h < 300:
        return "purple"
    return "pink"


def estimated_seconds(n_layers: int) -> float:
    """Tiempo estimado para la respuesta de creacion del job."""
    from services.vton.provider import ESTIMATED_SECONDS_PER_LAYER

    return max(1.0, ESTIMATED_SECONDS_PER_LAYER * max(1, n_layers))


def outfit_layer_count(session, outfit_id: str) -> int:
    """Cuantas capas aplicables tiene el outfit (para estimated_time)."""
    filas = (
        session.query(OutfitGarment.position)
        .filter(OutfitGarment.outfit_id == outfit_id)
        .all()
    )
    return sum(1 for (p,) in filas if p in _SOPORTADAS)


def get_outfit(session, outfit_id: str) -> Outfit | None:
    return session.get(Outfit, outfit_id)
