"""Router VTON: creacion de job (POST) y polling de estado (GET).

Contrato del frontend (`schemas/api/vton.ts`):

- POST /api/v1/vton/try-on  -> {job_id, status:'processing', estimated_time_seconds}
  Body multipart: `user_image` (archivo) + `outfit_id` (texto).
- GET  /api/v1/vton/status/{job_id} -> {job_id, status, result_url?, error_message?}
  El refine de Zod exige `result_url` no-nulo cuando status='completed'.
"""

from __future__ import annotations

import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from config import settings
from db.session import get_session
from domain.enums import VtonJobStatus, VtonStage
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob, new_uuid
from domain.schemas import (
    ShareLookResponse,
    VtonJobCreateResponse,
    VtonJobListItem,
    VtonJobListResponse,
    VtonJobStatusResponse,
)
from services import storage
from services.auth import get_current_user
from services.image_upload import read_validated_image
from services.vton import pipeline
from services.vton.share_tokens import generate_share_token, verify_share_token

router = APIRouter(prefix="/api/v1/vton", tags=["vton"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]

logger = logging.getLogger(__name__)


@router.post("/try-on", response_model=VtonJobCreateResponse)
async def create_try_on(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    user: UserDep,
    user_image: UploadFile | None = None,
    use_canonical: Annotated[bool, Form()] = False,
    outfit_id: Annotated[str | None, Form()] = None,
    garment_layers: Annotated[str | None, Form()] = None,
    steps: Annotated[int | None, Form()] = None,
    guidance: Annotated[float | None, Form()] = None,
    seed: Annotated[int | None, Form()] = None,
    layer_mode: Annotated[str | None, Form()] = None,
) -> VtonJobCreateResponse:
    """Crea un job de try-on, lo encola en Redis (ARQ) y devuelve su id.

    Acepta `outfit_id` (outfit ya recomendado) o `garment_layers` (lista JSON
    de {garment_id, position} del flujo multicapa). Si ninguno viene, 400.
    Permite opcionalmente hiperparámetros de inferencia (`steps`, `guidance`, `seed`, `layer_mode`).
    Permite `use_canonical=true` para reusar la foto canónica registrada por el usuario.
    Redis caido: el job corre igual en BackgroundTasks (fallback de demo,
    `services/queue.py` explica el orden).
    """
    if steps is not None and (steps < 10 or steps > 100):
        raise HTTPException(status_code=422, detail="steps debe estar entre 10 y 100")
    if guidance is not None and (guidance < 1.0 or guidance > 10.0):
        raise HTTPException(status_code=422, detail="guidance debe estar entre 1.0 y 10.0")
    if layer_mode is not None and layer_mode not in ("sequential", "from_original"):
        raise HTTPException(status_code=422, detail="layer_mode debe ser 'sequential' o 'from_original'")

    if use_canonical:
        if not user.canonical_consent or not user.canonical_photo_path:
            raise HTTPException(
                status_code=400,
                detail="El usuario no tiene una foto canónica configurada con consentimiento.",
            )
        rel_humano = user.canonical_photo_path
    elif user_image is not None:
        contenido, _image = read_validated_image(user_image, "user_image")
        from services.pose_check import validate_apose

        pose = validate_apose(contenido)
        if not pose.ok:
            raise HTTPException(status_code=422, detail=f"A-Pose invalida: {pose.reason}")
        rel_humano, _ = storage.save_image(contenido, f"humans/{user.id}")
    else:
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar user_image o especificar use_canonical=true",
        )

    # Resolver el outfit: outfit_id directo, o garment_layers -> outfit sintetico.
    if outfit_id:
        outfit = session.get(Outfit, outfit_id)
        if outfit is None:
            raise HTTPException(status_code=404, detail="outfit no existe")
        if outfit.user_id != user.id:
            raise HTTPException(status_code=403, detail="no autorizado para probar este outfit")
        n_capas = pipeline.outfit_layer_count(session, outfit_id)
        if n_capas == 0:
            raise HTTPException(status_code=404, detail="outfit no existe o sin prendas")
    elif garment_layers:
        outfit_id = _outfit_desde_layers(session, user.id, garment_layers)
        n_capas = pipeline.outfit_layer_count(session, outfit_id)
    else:
        raise HTTPException(status_code=400, detail="falta outfit_id o garment_layers")

    # Job en cola: nace pending (contrato) con stage QUEUED (spec 4.1.8).
    job = VtonJob(
        id=new_uuid(),
        user_id=user.id,
        outfit_id=outfit_id,
        status=VtonJobStatus.PENDING.value,
        stage=VtonStage.QUEUED.value,
    )
    session.add(job)
    session.commit()

    from services.queue import enqueue_vton_job

    enqueued = await enqueue_vton_job(
        job.id,
        rel_humano,
        steps=steps,
        guidance=guidance,
        seed=seed,
        layer_mode=layer_mode,
    )
    if not enqueued:
        # Fallback de demo (Redis caido): el mismo pipeline corre en el server
        # de FastAPI como siempre. Contrato publico identico.
        background_tasks.add_task(
            pipeline.run_job,
            job.id,
            rel_humano,
            num_inference_steps=steps,
            guidance_scale=guidance,
            seed=seed,
            layer_mode=layer_mode,
        )
    else:
        logger.info("job %s encolado en Redis", job.id)

    return VtonJobCreateResponse(
        job_id=job.id,
        status="processing",
        estimated_time_seconds=pipeline.estimated_seconds(n_capas),
    )


@router.get("/status/{job_id}", response_model=VtonJobStatusResponse)
def job_status(job_id: str, session: SessionDep, user: UserDep) -> VtonJobStatusResponse:
    """Estado del job. completed incluye result_url absoluto (lo exige Zod)."""
    job = session.get(VtonJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job no existe")
    if job.user_id != user.id:
        raise HTTPException(status_code=404, detail="job no existe")

    result_url = None
    if job.status == VtonJobStatus.COMPLETED.value and job.result_path:
        result_url = storage.url_for(job.result_path)

    return VtonJobStatusResponse(
        job_id=job.id,
        status=VtonJobStatus(job.status),
        result_url=result_url,
        error_message=job.error_message,
    )


@router.get("/jobs", response_model=VtonJobListResponse)
def list_vton_jobs(session: SessionDep, user: UserDep, limit: int = 50) -> VtonJobListResponse:
    """Historial de jobs VTON del usuario demo (G3).

    Ordenados por fecha de creación desc (más recientes primero).
    """
    query = (
        session.query(VtonJob)
        .filter(VtonJob.user_id == user.id)
        .order_by(VtonJob.created_at.desc())
    )
    total = query.count()
    db_jobs = query.limit(limit).all()

    items = []
    for j in db_jobs:
        result_url = None
        if j.status == VtonJobStatus.COMPLETED.value and j.result_path:
            result_url = storage.url_for(j.result_path)
        items.append(
            VtonJobListItem(
                job_id=j.id,
                outfit_id=j.outfit_id,
                status=VtonJobStatus(j.status),
                stage=j.stage,
                result_url=result_url,
                error_message=j.error_message,
                created_at=j.created_at,
            )
        )

    return VtonJobListResponse(jobs=items, total=total)


@router.post("/{job_id}/share", response_model=ShareLookResponse)
def share_look(job_id: str, session: SessionDep, user: UserDep) -> ShareLookResponse:
    """Genera un enlace público firmado y temporal para compartir el look."""
    job = session.get(VtonJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job VTON no encontrado")
    if job.user_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado para compartir este look")
    if job.status != VtonJobStatus.COMPLETED.value or not job.result_path:
        raise HTTPException(status_code=400, detail="El trabajo VTON no ha finalizado exitosamente")

    token = generate_share_token(job.id, user.id, ttl_hours=24)
    share_url = f"{settings.public_base_url.rstrip('/')}/api/v1/vton/shared/{token}"
    return ShareLookResponse(
        job_id=job.id,
        share_token=token,
        share_url=share_url,
        expires_in_hours=24,
    )


@router.get("/shared/{token}")
def get_shared_look(token: str, session: SessionDep) -> Response:
    """Endpoint público para acceder a la imagen de un look compartido mediante token firmado."""
    payload = verify_share_token(token)
    job = session.get(VtonJob, payload["job_id"])
    if job is None or job.user_id != payload.get("user_id") or not job.result_path:
        raise HTTPException(status_code=404, detail="Look no disponible")

    image_bytes = storage.read_bytes(job.result_path)
    return Response(
        content=image_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{job_id}/download")
def download_look(job_id: str, session: SessionDep, user: UserDep) -> Response:
    """Descarga directa del resultado del look con cabeceras attachment protegidas."""
    job = session.get(VtonJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job VTON no encontrado")
    if job.user_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado para descargar este look")
    if job.status != VtonJobStatus.COMPLETED.value or not job.result_path:
        raise HTTPException(status_code=400, detail="El trabajo VTON no ha finalizado exitosamente")

    image_bytes = storage.read_bytes(job.result_path)
    filename = f"styleme-look-{job.id[:8]}.jpg"
    return Response(
        content=image_bytes,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


def _outfit_desde_layers(session: Session, user_id: str, garment_layers_json: str) -> str:
    """Crea un Outfit temporal a partir de garment_layers JSON del frontend."""
    try:
        layers = json.loads(garment_layers_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="garment_layers no es JSON valido") from exc

    if not isinstance(layers, list) or not layers:
        raise HTTPException(status_code=400, detail="garment_layers debe ser lista no vacia")

    outfit = Outfit(id=new_uuid(), user_id=user_id, aesthetic="custom")
    session.add(outfit)
    for i, layer in enumerate(layers):
        gid = layer.get("garment_id")
        posicion = layer.get("position", "top")
        prenda = session.get(Garment, gid)
        if prenda is None:
            raise HTTPException(status_code=404, detail=f"prenda {gid} no existe")
        if prenda.owner_id != user_id:
            from domain.models import GarmentOwnership

            ownership = session.query(GarmentOwnership).filter_by(
                user_id=user_id, garment_id=gid
            ).first()
            if ownership is None:
                raise HTTPException(status_code=403, detail="no autorizado para usar esta prenda")
        session.add(
            OutfitGarment(
                outfit_id=outfit.id,
                garment_id=gid,
                position=posicion,
                layer_index=i,
            )
        )
    session.commit()
    return outfit.id
