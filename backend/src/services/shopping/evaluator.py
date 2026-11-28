"""Evaluador de compras inteligentes ("Before You Buy") para StyleMe.

Permite subir la foto de una prenda que el usuario esta evaluando comprar en una
tienda o catalogo online y analiza:
1. Redundancia de armario: similitud coseno >= 0.82 con prendas existentes en la misma categoria.
2. Utilidad marginal: cuantas prendas del closet combina y cuantos outfits nuevos desbloquea.
3. Permite adopcion permanente o prueba virtual inmediata en el probador CatVTON.
"""

from __future__ import annotations

import io
import math
from typing import Any

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from domain.enums import CATEGORY_TO_POSITION, OwnershipSource
from domain.models import Garment, GarmentOwnership, Outfit, OutfitGarment, new_uuid
from domain.schemas import (
    DominantColor,
    GarmentUploadResponse,
    OutfitGarmentRef,
    OutfitOut,
    SmartShoppingEvaluateResponse,
    SmartShoppingRedundancy,
)
from services import storage
from services.garment_analysis.analyzer import analyze_garment
from services.garment_analysis.background_remover import remove_background
from services.recommender.engine import recommend_outfits


def cosine_similarity(v1: list[float] | None, v2: list[float] | None) -> float:
    """Calcula similitud coseno entre dos vectores 128-D."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


def garment_to_dict(g: Garment) -> dict[str, Any]:
    """Serializa un Garment al formato esperado por el motor de recomendacion."""
    posicion = g.position
    if posicion is None and g.category in CATEGORY_TO_POSITION:
        mapped = CATEGORY_TO_POSITION[g.category]
        posicion = mapped.value if mapped else None
    aesthetic = g.top_aesthetics[0]["aesthetic"] if g.top_aesthetics else "casual"
    return {
        "id": g.id,
        "category": g.category,
        "subcategory": getattr(g, "subcategory", None),
        "position": posicion,
        "colors": g.dominant_colors,
        "embedding": g.embedding,
        "aesthetic": aesthetic,
        "pattern": getattr(g, "pattern", None),
    }


def evaluate_prospective_garment(
    session: Session,
    user_id: str,
    image_bytes: bytes,
) -> SmartShoppingEvaluateResponse:
    """Evalua una prenda candidata de tienda antes de comprarla."""
    if not image_bytes:
        raise HTTPException(status_code=400, detail="archivo vacio")

    try:
        imagen = Image.open(io.BytesIO(image_bytes))
        imagen.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="archivo no es una imagen valida") from exc

    # 1. Remocion de fondo y analisis de prenda
    imagen_procesada = remove_background(imagen)
    buf_proc = io.BytesIO()
    imagen_procesada.save(buf_proc, format="PNG")
    proc_bytes = buf_proc.getvalue()

    analisis = analyze_garment(imagen_procesada)

    rel_orig, _ = storage.save_image(image_bytes, "garments")
    rel_proc, _ = storage.save_image(proc_bytes, "garments")

    # Guardar como prenda candidata (is_candidate = True, sin GarmentOwnership todavia)
    candidate = Garment(
        id=new_uuid(),
        owner_id=user_id,
        category=analisis["category"],
        subcategory=analisis.get("subcategory"),
        position=analisis["position"],
        pattern=analisis.get("pattern"),
        image_path=rel_orig,
        processed_image_path=rel_proc,
        dominant_colors=analisis["dominant_colors"],
        top_aesthetics=analisis["top_aesthetics"],
        embedding=analisis["embedding"],
        is_candidate=True,
    )
    session.add(candidate)
    session.commit()
    session.refresh(candidate)

    # 2. Cargar prendas actuales del usuario en el armario
    owned_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == user_id).all()
    ]
    user_garments: list[Garment] = []
    if owned_ids:
        user_garments = (
            session.query(Garment)
            .filter(Garment.id.in_(owned_ids), Garment.is_candidate.is_(False))
            .all()
        )

    # 3. Deteccion de redundancia con prendas existentes de la misma categoria
    max_sim = 0.0
    redundant_garment: Garment | None = None
    if candidate.embedding:
        same_category_garments = [
            g for g in user_garments if g.category == candidate.category and g.embedding
        ]
        for g in same_category_garments:
            sim = cosine_similarity(candidate.embedding, g.embedding)
            if sim > max_sim:
                max_sim = sim
                redundant_garment = g

    is_redundant = max_sim >= 0.82
    if is_redundant and redundant_garment:
        sim_pct = round(max_sim * 100)
        redundancy = SmartShoppingRedundancy(
            is_redundant=True,
            similar_garment_id=redundant_garment.id,
            similarity=round(max_sim, 2),
            message=(
                f"Ya tienes una prenda muy similar ({redundant_garment.category}) en tu clóset "
                f"con un {sim_pct}% de coincidencia estética. Considera si realmente necesitas otra similar."
            ),
        )
    else:
        redundancy = SmartShoppingRedundancy(
            is_redundant=False,
            similar_garment_id=None,
            similarity=round(max_sim, 2) if max_sim > 0 else 0.0,
            message="Aporta variedad: no tienes prendas muy similares registradas en esta categoría.",
        )

    # 4. Analisis combinatorio de utilidad marginal (outfits que desbloquea)
    candidate_dict = garment_to_dict(candidate)
    user_dicts = [garment_to_dict(g) for g in user_garments]
    all_dicts = user_dicts + [candidate_dict]

    todos_los_combos = recommend_outfits(all_dicts, limit=20)
    # Filtrar solo los outfits donde participa la prenda candidata
    combos_con_candidata = [
        o for o in todos_los_combos if any(g["id"] == candidate.id for g in o["garments"])
    ]

    partner_ids = {
        g["id"]
        for o in combos_con_candidata
        for g in o["garments"]
        if g["id"] != candidate.id
    }
    compatible_garments_count = len(partner_ids)
    potential_outfits_count = len(combos_con_candidata)

    # Persistir los mejores outfits potenciales para poder previsualizarlos o probarlos en VTON
    persisted_outfits: list[OutfitOut] = []
    for crudo in combos_con_candidata[:6]:
        outfit = Outfit(
            id=new_uuid(),
            user_id=user_id,
            aesthetic=crudo["aesthetic"],
            chromatic_score=crudo["chromatic_score"],
            embedding_score=crudo["embedding_score"],
            occasion=crudo.get("occasion"),
            weather=crudo.get("weather"),
            reason=crudo.get("reason"),
        )
        session.add(outfit)
        for i, g in enumerate(crudo["garments"]):
            session.add(
                OutfitGarment(
                    outfit_id=outfit.id,
                    garment_id=g["id"],
                    position=g["position"],
                    layer_index=i,
                )
            )
        persisted_outfits.append(
            OutfitOut(
                outfit_id=outfit.id,
                aesthetic=outfit.aesthetic,
                garments=[
                    OutfitGarmentRef(garment_id=g["id"], position=g["position"])
                    for g in crudo["garments"]
                ],
                chromatic_score=outfit.chromatic_score,
                embedding_score=outfit.embedding_score,
                occasion=outfit.occasion,
                weather=outfit.weather,
                reason=outfit.reason,
            )
        )
    session.commit()

    # 5. Dictamen final de compra
    if is_redundant:
        verdict = (
            "Precaución: Ya tienes una prenda equivalente en tu clóset. "
            "Evalúa si su compra aporta suficiente valor antes de pagar."
        )
    elif potential_outfits_count >= 3:
        verdict = (
            f"Compra recomendada: Se combina con {compatible_garments_count} prenda(s) de tu clóset "
            f"y desbloquea {potential_outfits_count} outfit(s) nuevo(s)."
        )
    elif potential_outfits_count > 0:
        verdict = (
            f"Compra moderada: Desbloquea {potential_outfits_count} outfit(s), "
            "pero su combinabilidad con tu clóset actual es limitada."
        )
    else:
        verdict = (
            "Compra no prioritaria: No forma combinaciones viables con las prendas actuales de tu guardarropa."
        )

    formatted_aesthetics = [
        {
            "aesthetic": a["aesthetic"],
            "confidence": a.get("confidence") if "confidence" in a else a.get("score", 0.0),
        }
        for a in (candidate.top_aesthetics or [])
    ]

    candidate_summary = GarmentUploadResponse(
        garment_id=candidate.id,
        category=candidate.category,
        subcategory=getattr(candidate, "subcategory", None),
        position=candidate.position,
        top_aesthetics=formatted_aesthetics,
        dominant_colors=[DominantColor.model_validate(c) for c in candidate.dominant_colors],
        processed_image_url=storage.url_for(candidate.processed_image_path),
        pattern=getattr(candidate, "pattern", None),
    )

    return SmartShoppingEvaluateResponse(
        candidate_garment=candidate_summary,
        compatible_garments_count=compatible_garments_count,
        potential_outfits_count=potential_outfits_count,
        redundancy=redundancy,
        verdict=verdict,
        potential_outfits=persisted_outfits,
    )


def adopt_candidate_garment(session: Session, user_id: str, garment_id: str) -> Garment:
    """Transfiere la prenda candidata al guardarropa definitivo del usuario."""
    garment = session.get(Garment, garment_id)
    if garment is None:
        raise HTTPException(status_code=404, detail="prenda no existe")
    if garment.owner_id != user_id or not garment.is_candidate:
        raise HTTPException(status_code=404, detail="prenda candidata no existe")

    # Verificar si ya pertenece al usuario
    existing_ownership = (
        session.query(GarmentOwnership)
        .filter(GarmentOwnership.user_id == user_id, GarmentOwnership.garment_id == garment_id)
        .first()
    )

    garment.is_candidate = False
    if existing_ownership is None:
        session.add(
            GarmentOwnership(
                id=new_uuid(),
                user_id=user_id,
                garment_id=garment_id,
                source=OwnershipSource.UPLOAD.value,
            )
        )

    session.commit()
    session.refresh(garment)
    return garment
