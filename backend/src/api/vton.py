"""Router VTON: creacion de job (POST) y polling de estado (GET).

Contrato del frontend (`schemas/api/vton.ts`):

- POST /api/v1/vton/try-on  -> {job_id, status:'processing', estimated_time_seconds}
  Body multipart: `user_image` (archivo) + `outfit_id` (texto).
- GET  /api/v1/vton/status/{job_id} -> {job_id, status, result_url?, error_message?}
  El refine de Zod exige `result_url` no-nulo cuando status='completed'.
"""

from __future__ import annotations

import io
import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import VtonJobStatus, VtonStage
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob, new_uuid
from domain.schemas import (
    VtonJobCreateResponse,
    VtonJobListItem,
    VtonJobListResponse,
    VtonJobStatusResponse,
)
from services import storage
from services.auth import get_current_user
from services.vton import pipeline

router = APIRouter(prefix="/api/v1/vton", tags=["vton"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]

logger = logging.getLogger(__name__)


@router.post("/try-on", response_model=VtonJobCreateResponse)
async def create_try_on(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    user: UserDep,
    user_image: Annotated[UploadFile | None, File()] = None,
    outfit_id: Annotated[str | None, Form()] = None,
    garment_layers: Annotated[str | None, Form()] = None,
) -> VtonJobCreateResponse:
    """Crea un job de try-on, lo encola en Redis (ARQ) y devuelve su id.

    Acepta `user_image` (foto puntual de un solo uso) o, si se omite, reutiliza
    la foto corporal por defecto guardada en `user.vton_photo_path`.
    Acepta `outfit_id` (outfit ya recomendado) o `garment_layers` (lista JSON
    de {garment_id, position} del flujo multicapa). Si ninguno viene, 400.
    """
    if user_image is not None:
        contenido = user_image.file.read()
        if not contenido:
            raise HTTPException(status_code=400, detail="user_image vacia")

        try:
            from PIL import Image, UnidentifiedImageError

            Image.open(io.BytesIO(contenido)).load()
        except UnidentifiedImageError as exc:
            raise HTTPException(status_code=400, detail="user_image no es imagen") from exc

        # Protocolo de entrada (4.1.5): la foto debe estar en A-Pose ANTES de
        # gastar GPU. Rechazo temprano con causa en detalle (frontend la muestra).
        from services.pose_check import validate_apose

        pose = validate_apose(contenido)
        if not pose.ok:
            raise HTTPException(status_code=422, detail=f"A-Pose invalida: {pose.reason}")
    else:
        default_path = getattr(user, "vton_photo_path", None)
        if not default_path:
            raise HTTPException(
                status_code=400,
                detail="Debes subir una foto o guardar tu foto por defecto en tu perfil.",
            )
        try:
            contenido = storage.read_bytes(default_path)
        except FileNotFoundError as exc:
            user.vton_photo_path = None
            session.commit()
            raise HTTPException(
                status_code=400,
                detail="Tu foto por defecto ya no esta disponible; subela nuevamente en tu perfil.",
            ) from exc

    # Resolver el outfit: outfit_id directo, o garment_layers -> outfit sintetico.
    if outfit_id:
        n_capas = pipeline.outfit_layer_count(session, outfit_id)
        if n_capas == 0:
            raise HTTPException(status_code=404, detail="outfit no existe o sin prendas")
    elif garment_layers:
        outfit_id = _outfit_desde_layers(session, user.id, garment_layers)
        n_capas = pipeline.outfit_layer_count(session, outfit_id)
    else:
        raise HTTPException(status_code=400, detail="falta outfit_id o garment_layers")

    rel_humano, _ = storage.save_image(contenido, "humans")

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

    enqueued = await enqueue_vton_job(job.id, rel_humano)
    if not enqueued:
        # Fallback de demo (Redis caido): el mismo pipeline corre en el server
        # de FastAPI como siempre. Contrato publico identico.
        background_tasks.add_task(pipeline.run_job, job.id, rel_humano)
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
        raise HTTPException(status_code=403, detail="no tienes permiso para consultar este job")

    result_url = None
    if job.status == VtonJobStatus.COMPLETED.value and job.result_path:
        result_url = storage.url_for(job.result_path)

    return VtonJobStatusResponse(
        job_id=job.id,
        status=VtonJobStatus(job.status),
        stage=job.stage,
        result_url=result_url,
        error_message=job.error_message,
    )


@router.get("/jobs", response_model=VtonJobListResponse)
def list_vton_jobs(
    session: SessionDep,
    user: UserDep,
    limit: int = 50,
) -> VtonJobListResponse:
    """Historial de jobs VTON del usuario autenticado (o demo en dev local).

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
