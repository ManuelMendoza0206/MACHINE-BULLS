"""Router de outfits: recomendacion (POST /api/v1/outfits/recommend)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import CATEGORY_TO_POSITION
from domain.models import Garment, GarmentOwnership, Outfit, OutfitGarment, User, new_uuid
from domain.schemas import (
    OutfitGarmentRef,
    OutfitOut,
    OutfitRecommendRequest,
    OutfitRecommendResponse,
)
from services.recommender.engine import recommend_outfits

router = APIRouter(prefix="/api/v1/outfits", tags=["outfits"])

SessionDep = Annotated[Session, Depends(get_session)]


def _outfit_a_schema(session: Session, outfit: Outfit) -> OutfitOut:
    """Serializa un Outfit persistido con sus prendas (referencias, por layer)."""
    filas = (
        session.query(OutfitGarment).filter(OutfitGarment.outfit_id == outfit.id).all()
    )
    filas.sort(key=lambda f: f.layer_index)
    return OutfitOut(
        outfit_id=outfit.id,
        aesthetic=outfit.aesthetic,
        garments=[
            OutfitGarmentRef(garment_id=f.garment_id, position=f.position) for f in filas
        ],
        chromatic_score=outfit.chromatic_score,
        embedding_score=outfit.embedding_score,
    )


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(outfit_id: str, session: SessionDep) -> OutfitOut:
    """Outfit por id (lo consume el Probador para mostrar las capas elegidas)."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")
    return _outfit_a_schema(session, outfit)


@router.post("/recommend", response_model=OutfitRecommendResponse)
def recommend(
    req: OutfitRecommendRequest,
    session: SessionDep,
) -> OutfitRecommendResponse:
    """Arma outfits con las prendas del usuario y los persiste rankeados."""
    user = session.get(User, req.user_id)
    if user is None:
        # El frontend manda el user_id de Supabase; en el MVP todavia no hay
        # sync de usuarios, asi que si no existe devolvemos 404 para que el
        # error sea visible en vez de un resultado vacio silencioso.
        raise HTTPException(status_code=404, detail="user_id no existe en el backend")

    # Prendas del usuario: las que tiene ownership (upload o capsule adoptada).
    garment_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == req.user_id)
    ]
    if req.available_garment_ids:
        permitidos = set(req.available_garment_ids)
        garment_ids = [g for g in garment_ids if g in permitidos]
    if not garment_ids:
        raise HTTPException(status_code=400, detail="el usuario no tiene prendas")

    prendas = session.query(Garment).filter(Garment.id.in_(garment_ids)).all()
    dicts = [_a_dict(g) for g in prendas]
    crudos = recommend_outfits(dicts, target_aesthetic=req.target_aesthetic)

    outfits: list[OutfitOut] = []
    for crudo in crudos:
        outfit = Outfit(
            id=new_uuid(),
            user_id=req.user_id,
            aesthetic=crudo["aesthetic"],
            chromatic_score=crudo["chromatic_score"],
            embedding_score=crudo["embedding_score"],
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
        outfits.append(
            OutfitOut(
                outfit_id=outfit.id,
                aesthetic=outfit.aesthetic,
                garments=[
                    OutfitGarmentRef(garment_id=g["id"], position=g["position"])
                    for g in crudo["garments"]
                ],
                chromatic_score=outfit.chromatic_score,
                embedding_score=outfit.embedding_score,
            )
        )
    session.commit()
    return OutfitRecommendResponse(outfits=outfits)


def _a_dict(g: Garment) -> dict:
    """Convierte un Garment al dict que espera el motor de recomendacion."""
    posicion = g.position
    if posicion is None and g.category in CATEGORY_TO_POSITION:
        mapped = CATEGORY_TO_POSITION[g.category]
        posicion = mapped.value if mapped else None
    aesthetic = g.top_aesthetics[0]["aesthetic"] if g.top_aesthetics else "casual"
    return {
        "id": g.id,
        "position": posicion,
        "colors": g.dominant_colors,
        "embedding": g.embedding,
        "aesthetic": aesthetic,
    }
