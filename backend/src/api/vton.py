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
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from api.garments import DEMO_USER_EMAIL
from db.session import get_session
from domain.enums import VtonJobStatus
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob, new_uuid
from domain.schemas import VtonJobCreateResponse, VtonJobStatusResponse
from services import storage
from services.vton import pipeline

router = APIRouter(prefix="/api/v1/vton", tags=["vton"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/try-on", response_model=VtonJobCreateResponse)
def create_try_on(
    background_tasks: BackgroundTasks,
    user_image: UploadFile,
    session: SessionDep,
    outfit_id: Annotated[str | None, Form()] = None,
    garment_layers: Annotated[str | None, Form()] = None,
) -> VtonJobCreateResponse:
    """Crea un job de try-on asincrono y lo lanza en background.

    Acepta `outfit_id` (outfit ya recomendado) o `garment_layers` (lista JSON
    de {garment_id, position} del flujo multicapa). Si ninguno viene, 400.
    """
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

    user = session.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if user is None:
        raise HTTPException(status_code=400, detail="no hay usuario demo; sube una prenda primero")

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

    job = VtonJob(
        id=new_uuid(),
        user_id=user.id,
        outfit_id=outfit_id,
        status=VtonJobStatus.PROCESSING.value,
    )
    session.add(job)
    session.commit()

    background_tasks.add_task(pipeline.run_job, job.id, rel_humano)

    return VtonJobCreateResponse(
        job_id=job.id,
        status="processing",
        estimated_time_seconds=pipeline.estimated_seconds(n_capas),
    )


@router.get("/status/{job_id}", response_model=VtonJobStatusResponse)
def job_status(job_id: str, session: SessionDep) -> VtonJobStatusResponse:
    """Estado del job. completed incluye result_url absoluto (lo exige Zod)."""
    job = session.get(VtonJob, job_id)
    if job is None:
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
