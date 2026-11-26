"""Router de prendas: upload, listing y adopcion de capsule (G1/G4).

Endpoints que el frontend ya llama:

- POST /api/v1/garments/upload
- GET  /api/v1/garments/capsule
- POST /api/v1/garments/capsule/{garment_id}/adopt
"""

from __future__ import annotations

import io
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import OwnershipSource
from domain.models import (
    Garment,
    GarmentOwnership,
    OutfitGarment,
    OutfitUsageLog,
    User,
    new_uuid,
)
from domain.schemas import (
    CapsuleCatalogResponse,
    DominantColor,
    GarmentStatusUpdate,
    GarmentSummary,
    GarmentUploadResponse,
    WardrobeAnalyticsResponse,
)
from services import storage
from services.auth import DEMO_USER_EMAIL, get_current_user, get_demo_user
from services.garment_analysis.analyzer import analyze_garment
from services.garment_analysis.background_remover import remove_background
from services.image_upload import read_validated_image

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
    contenido, imagen = read_validated_image(file, "archivo")

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
    user: UserDep,
) -> CapsuleCatalogResponse:
    """Prendas disponibles para el usuario: catalogo capsule + sus prendas propias."""
    catalogo = (
        session.query(Garment)
        .filter(
            Garment.is_candidate.is_(False),
            or_(Garment.owner_id.is_(None), Garment.owner_id == user.id),
        )
        .order_by(Garment.created_at.desc())
        .all()
    )

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
                status=getattr(g, "status", "AVAILABLE"),
            )
        )
    return CapsuleCatalogResponse(garments=resumen)


@router.patch("/{garment_id}/status", response_model=GarmentSummary)
def update_garment_status(
    garment_id: str,
    payload: GarmentStatusUpdate,
    session: SessionDep,
    user: UserDep,
) -> GarmentSummary:
    """Actualiza el estado de disponibilidad de una prenda (AVAILABLE, LAUNDRY, REPAIR, INACTIVE)."""
    garment = session.get(Garment, garment_id)
    if garment is None:
        raise HTTPException(status_code=404, detail="prenda no existe")
    if garment.owner_id != user.id:
        raise HTTPException(status_code=403, detail="no tienes permiso para modificar esta prenda")

    allowed = {"AVAILABLE", "LAUNDRY", "REPAIR", "INACTIVE"}
    new_status = payload.status.upper()
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Estado invalido: {payload.status}. Permitidos: {list(allowed)}",
        )

    garment.status = new_status
    session.commit()
    session.refresh(garment)

    return GarmentSummary(
        id=garment.id,
        processed_image_url=storage.url_for(garment.processed_image_path),
        category=garment.category,
        dominant_aesthetic=_dominant_aesthetic(garment),
        position=garment.position,
        status=garment.status,
    )


def _dominant_aesthetic(g: Garment) -> str:
    if g.top_aesthetics:
        return g.top_aesthetics[0]["aesthetic"]
    return "casual"


@router.get("/analytics", response_model=WardrobeAnalyticsResponse)
def get_wardrobe_analytics(
    session: SessionDep,
    user: UserDep,
) -> WardrobeAnalyticsResponse:
    """Calcula metricas reales de salud, utilizacion y brechas del guardarropa."""
    owned_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == user.id).all()
    ]
    garments = (
        session.query(Garment)
        .filter(Garment.id.in_(owned_ids), Garment.is_candidate.is_(False))
        .all()
    ) if owned_ids else []

    total_garments = len(garments)
    if total_garments == 0:
        return WardrobeAnalyticsResponse(
            total_garments=0,
            utilization_rate=0.0,
            most_worn_garments=[],
            unworn_garments=[],
            wardrobe_gaps=["Aún no tienes prendas en tu clóset. Sube tus primeras prendas para empezar."],
        )

    usage_logs = (
        session.query(OutfitUsageLog)
        .filter(OutfitUsageLog.user_id == user.id)
        .all()
    )
    used_outfit_ids = [log.outfit_id for log in usage_logs]

    garment_wear_counts: dict[str, int] = {g.id: 0 for g in garments}
    if used_outfit_ids:
        outfit_garments = (
            session.query(OutfitGarment)
            .filter(OutfitGarment.outfit_id.in_(used_outfit_ids))
            .all()
        )
        for og in outfit_garments:
            if og.garment_id in garment_wear_counts:
                garment_wear_counts[og.garment_id] += 1

    worn_garments_count = sum(1 for c in garment_wear_counts.values() if c > 0)
    utilization_rate = round((worn_garments_count / total_garments) * 100.0, 1)

    garment_map = {g.id: g for g in garments}
    sorted_by_wear = sorted(garment_wear_counts.items(), key=lambda x: -x[1])

    most_worn: list[dict[str, Any]] = []
    for g_id, count in sorted_by_wear[:3]:
        if count > 0 and g_id in garment_map:
            gm = garment_map[g_id]
            most_worn.append({
                "id": gm.id,
                "category": gm.category,
                "position": gm.position,
                "image_url": storage.url_for(gm.processed_image_path),
                "wear_count": count,
            })

    unworn: list[dict[str, Any]] = []
    for g_id, count in sorted_by_wear:
        if count == 0 and g_id in garment_map:
            gm = garment_map[g_id]
            unworn.append({
                "id": gm.id,
                "category": gm.category,
                "position": gm.position,
                "image_url": storage.url_for(gm.processed_image_path),
                "wear_count": 0,
            })

    positions_present = {g.position for g in garments if g.position}
    categories_present = {g.category.lower() for g in garments if g.category}

    gaps: list[str] = []
    if "outerwear" not in positions_present:
        gaps.append("Falta una prenda de abrigo (chaqueta o campera) para clima frío.")
    if "footwear" not in positions_present:
        gaps.append("Falta calzado registrado para completar outfits de forma integral.")
    if "bottom" not in positions_present:
        gaps.append("Faltan prendas inferiores (pantalones o faldas) para combinaciones completas.")
    elif sum(1 for g in garments if g.position == "bottom") < 2:
        gaps.append("Tu guardarropa ganaría versatilidad con mayor variedad de prendas inferiores.")

    if not any("shirt" in c or "camisa" in c or "blouse" in c for c in categories_present):
        gaps.append("Falta una camisa o prenda formal superior para eventos elegantes o de trabajo.")

    if not gaps:
        gaps.append("¡Tu guardarropa está equilibrado! Tienes cubiertas las categorías esenciales.")

    return WardrobeAnalyticsResponse(
        total_garments=total_garments,
        utilization_rate=utilization_rate,
        most_worn_garments=most_worn,
        unworn_garments=unworn[:5],
        wardrobe_gaps=gaps,
    )


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
    if garment.owner_id is not None and garment.owner_id != user.id:
        raise HTTPException(status_code=403, detail="no tienes permiso para modificar esta prenda")

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
