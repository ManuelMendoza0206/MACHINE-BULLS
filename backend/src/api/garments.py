"""Router de prendas: upload, listing y adopcion de capsule (G1/G4).

Endpoints que el frontend ya llama:

- POST /api/v1/garments/upload
- GET  /api/v1/garments/capsule
- POST /api/v1/garments/capsule/{garment_id}/adopt
"""

from __future__ import annotations

import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import OwnershipSource
from domain.models import Garment, GarmentOwnership, User, new_uuid
from domain.schemas import (
    CapsuleCatalogResponse,
    DominantColor,
    GarmentSummary,
    GarmentUploadResponse,
)
from services import storage
from services.auth import DEMO_USER_EMAIL, get_current_user, get_demo_user
from services.garment_analysis.analyzer import analyze_garment
from services.garment_analysis.background_remover import remove_background

__all__ = ["DEMO_USER_EMAIL", "get_current_user", "get_demo_user", "router"]

router = APIRouter(prefix="/api/v1/garments", tags=["garments"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.post("/upload", response_model=GarmentUploadResponse)
def upload_garment(
    file: UploadFile,
    session: SessionDep,
    user: UserDep,
) -> GarmentUploadResponse:
    """Analiza una prenda subida: CLIP (categoria + estetica) + colores."""
    contenido = file.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="archivo vacio")

    try:
        from PIL import Image, UnidentifiedImageError

        imagen = Image.open(io.BytesIO(contenido))
        imagen.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="archivo no es una imagen") from exc

    # Remocion de fondo textil (u2net_cloth_seg)
    imagen_procesada = remove_background(imagen)
    buf_proc = io.BytesIO()
    imagen_procesada.save(buf_proc, format="PNG")
    proc_bytes = buf_proc.getvalue()

    analisis = analyze_garment(imagen_procesada)

    rel_orig, _ = storage.save_image(contenido, "garments")
    rel_proc, _ = storage.save_image(proc_bytes, "garments")

    garment = Garment(
        id=new_uuid(),
        owner_id=user.id,
        category=analisis["category"],
        position=analisis["position"],
        image_path=rel_orig,
        processed_image_path=rel_proc,
        dominant_colors=analisis["dominant_colors"],
        top_aesthetics=analisis["top_aesthetics"],
        embedding=analisis["embedding"],
    )
    session.add(garment)
    # Subir ya es ser dueno: source='upload' (el adopt es para capsule).
    session.add(
        GarmentOwnership(
            id=new_uuid(),
            user_id=user.id,
            garment_id=garment.id,
            source=OwnershipSource.UPLOAD.value,
        )
    )
    session.commit()
    session.refresh(garment)

    return GarmentUploadResponse(
        garment_id=garment.id,
        category=garment.category,
        position=garment.position,
        top_aesthetics=garment.top_aesthetics,
        dominant_colors=[DominantColor.model_validate(c) for c in garment.dominant_colors],
        processed_image_url=storage.url_for(garment.processed_image_path),
    )


@router.get("/capsule", response_model=CapsuleCatalogResponse)
def list_capsule(
    session: SessionDep,
) -> CapsuleCatalogResponse:
    """Prendas disponibles: el catalogo completo (upload ya crea ownership)."""
    get_demo_user(session)  # asegura que exista el usuario demo
    catalogo = session.query(Garment).order_by(Garment.created_at.desc()).all()

    resumen: list[GarmentSummary] = []
    # El listing muestra todo el catalogo (el adopt marca pertenencia). En el
    # MVP la capsule es el catalogo completo: las propias ya estan adoptadas de
    # fabrica (upload crea ownership). El frontend distingue el estado con el
    # 409 del adopt, no con el listing.
    for g in catalogo:
        resumen.append(
            GarmentSummary(
                id=g.id,
                processed_image_url=storage.url_for(g.processed_image_path),
                category=g.category,
                dominant_aesthetic=_dominant_aesthetic(g),
                position=g.position,
            )
        )
    return CapsuleCatalogResponse(garments=resumen)


def _dominant_aesthetic(g: Garment) -> str:
    if g.top_aesthetics:
        return g.top_aesthetics[0]["aesthetic"]
    return "casual"


@router.post("/capsule/{garment_id}/adopt")
def adopt_capsule_garment(
    garment_id: str,
    session: SessionDep,
    user: UserDep,
) -> dict:
    """Adopta una prenda de capsule. 409 si ya era tuya (idempotente en efecto)."""
    garment = session.get(Garment, garment_id)
    if garment is None:
        raise HTTPException(status_code=404, detail="prenda no existe")

    existente = (
        session.query(GarmentOwnership)
        .filter(GarmentOwnership.user_id == user.id, GarmentOwnership.garment_id == garment_id)
        .first()
    )
    if existente is not None:
        raise HTTPException(status_code=409, detail="prenda ya adoptada")

    session.add(
        GarmentOwnership(
            id=new_uuid(),
            user_id=user.id,
            garment_id=garment_id,
            source=OwnershipSource.CAPSULE.value,
        )
    )
    session.commit()
    return {}
