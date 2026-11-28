"""Router de outfits: recomendacion (POST /api/v1/outfits/recommend)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import CATEGORY_TO_POSITION
from domain.models import (
    Garment,
    GarmentOwnership,
    Outfit,
    OutfitFeedback,
    OutfitGarment,
    OutfitUsageLog,
    User,
    new_uuid,
)
from domain.schemas import (
    ManualOutfitEvaluateRequest,
    OutfitFeedbackCreate,
    OutfitFeedbackOut,
    OutfitGarmentRef,
    OutfitOut,
    OutfitRecommendRequest,
    OutfitRecommendResponse,
    OutfitRemixRequest,
    OutfitUsageLogCreate,
    OutfitUsageLogOut,
    StylistAdviceRequest,
    StylistAdviceResponse,
)
from services.auth import DEMO_USER_EMAIL, get_current_user
from services.recommender.engine import evaluate_manual_combo, recommend_outfits, remix_outfit
from services.stylist import get_stylist_advice

router = APIRouter(prefix="/api/v1/outfits", tags=["outfits"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


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
        occasion=outfit.occasion,
        weather=outfit.weather,
        reason=outfit.reason,
    )


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(outfit_id: str, session: SessionDep, user: UserDep) -> OutfitOut:
    """Outfit por id (lo consume el Probador para mostrar las capas elegidas)."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")
    if outfit.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para consultar este outfit")
    return _outfit_a_schema(session, outfit)


@router.post("/{outfit_id}/feedback", response_model=OutfitFeedbackOut)
def submit_feedback(
    outfit_id: str,
    payload: OutfitFeedbackCreate,
    session: SessionDep,
    user: UserDep,
) -> OutfitFeedbackOut:
    """Registra feedback (like/dislike) del usuario sobre un outfit para personalizar el recomendador."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")
    if outfit.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para valorar este outfit")

    if outfit.user_id != user.id and user.email != DEMO_USER_EMAIL:
        raise HTTPException(status_code=403, detail="no autorizado para modificar este outfit")

    target_user_id = user.id if user.id == outfit.user_id else outfit.user_id
    feedback = (
        session.query(OutfitFeedback)
        .filter(
            OutfitFeedback.user_id == target_user_id,
            OutfitFeedback.outfit_id == outfit_id,
        )
        .first()
    )
    if feedback is None:
        feedback = OutfitFeedback(
            user_id=target_user_id,
            outfit_id=outfit_id,
            rating=payload.rating,
            feedback_type=payload.feedback_type or ("like" if payload.rating > 0 else "dislike"),
            notes=payload.notes,
        )
        session.add(feedback)
    else:
        feedback.rating = payload.rating
        feedback.feedback_type = payload.feedback_type or ("like" if payload.rating > 0 else "dislike")
        feedback.notes = payload.notes

    session.commit()
    session.refresh(feedback)
    return OutfitFeedbackOut(
        id=feedback.id,
        user_id=feedback.user_id,
        outfit_id=feedback.outfit_id,
        rating=feedback.rating,
        feedback_type=feedback.feedback_type,
        created_at=feedback.created_at,
    )


@router.get("/{outfit_id}/feedback", response_model=OutfitFeedbackOut | None)
def get_outfit_feedback(
    outfit_id: str,
    session: SessionDep,
    user: UserDep,
) -> OutfitFeedbackOut | None:
    """Obtiene el feedback registrado de un outfit."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")
    if outfit.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para consultar esta valoración")
    feedback = (
        session.query(OutfitFeedback)
        .filter(OutfitFeedback.outfit_id == outfit_id)
        .first()
    )
    if feedback is None:
        return None
    return OutfitFeedbackOut(
        id=feedback.id,
        user_id=feedback.user_id,
        outfit_id=feedback.outfit_id,
        rating=feedback.rating,
        feedback_type=feedback.feedback_type,
        created_at=feedback.created_at,
    )


@router.post("/recommend", response_model=OutfitRecommendResponse)
def recommend(
    req: OutfitRecommendRequest,
    session: SessionDep,
    user: UserDep,
) -> OutfitRecommendResponse:
    """Arma outfits con las prendas del usuario y los persiste rankeados."""
    if req.user_id is not None and req.user_id != user.id:
        raise HTTPException(status_code=403, detail="user_id no coincide con la sesión autenticada")

    # Prendas del usuario: las que tiene ownership (upload o capsule adoptada).
    garment_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == user.id)
    ]
    if req.available_garment_ids:
        permitidos = set(req.available_garment_ids)
        garment_ids = [g for g in garment_ids if g in permitidos]
    if not garment_ids:
        raise HTTPException(status_code=400, detail="el usuario no tiene prendas")

    prendas = session.query(Garment).filter(Garment.id.in_(garment_ids)).all()
    dicts = [_a_dict(g) for g in prendas]

    # Cargar historial de feedback del usuario para personalizar recomendaciones
    user_feedbacks = (
        session.query(OutfitFeedback)
        .filter(OutfitFeedback.user_id == user.id)
        .all()
    )
    disliked_combinations: list[set[str]] = []
    preferred_aesthetics: list[str] = []
    for fb in user_feedbacks:
        if fb.rating < 0:
            sub_ids = {
                og.garment_id
                for og in session.query(OutfitGarment).filter(OutfitGarment.outfit_id == fb.outfit_id).all()
            }
            if sub_ids:
                disliked_combinations.append(sub_ids)
        elif fb.rating > 0:
            outfit_rel = session.get(Outfit, fb.outfit_id)
            if outfit_rel and outfit_rel.aesthetic:
                preferred_aesthetics.append(outfit_rel.aesthetic)

    crudos = recommend_outfits(
        dicts,
        target_aesthetic=req.target_aesthetic,
        disliked_combinations=disliked_combinations,
        preferred_aesthetics=preferred_aesthetics,
        occasion=req.occasion,
        weather=req.weather,
    )

    outfits: list[OutfitOut] = []
    for crudo in crudos:
        outfit = Outfit(
            id=new_uuid(),
            user_id=user.id,
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
                occasion=outfit.occasion,
                weather=outfit.weather,
                reason=outfit.reason,
            )
        )
    session.commit()
    return OutfitRecommendResponse(outfits=outfits)


@router.post("/remix", response_model=OutfitRecommendResponse)
def remix(
    req: OutfitRemixRequest,
    session: SessionDep,
    user: UserDep,
) -> OutfitRecommendResponse:
    """Genera alternativas de outfit manteniendo ancladas las piezas indicadas en pinned_garment_ids."""
    if req.user_id is not None and req.user_id != user.id:
        raise HTTPException(status_code=403, detail="user_id no coincide con la sesión autenticada")

    garment_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == user.id)
    ]
    if not garment_ids:
        raise HTTPException(status_code=400, detail="el usuario no tiene prendas")

    prendas = session.query(Garment).filter(Garment.id.in_(garment_ids)).all()
    dicts = [_a_dict(g) for g in prendas]

    user_feedbacks = (
        session.query(OutfitFeedback)
        .filter(OutfitFeedback.user_id == user.id)
        .all()
    )
    disliked_combinations: list[set[str]] = []
    preferred_aesthetics: list[str] = []
    for fb in user_feedbacks:
        if fb.rating < 0:
            sub_ids = {
                og.garment_id
                for og in session.query(OutfitGarment).filter(OutfitGarment.outfit_id == fb.outfit_id).all()
            }
            if sub_ids:
                disliked_combinations.append(sub_ids)
        elif fb.rating > 0:
            outfit_rel = session.get(Outfit, fb.outfit_id)
            if outfit_rel and outfit_rel.aesthetic:
                preferred_aesthetics.append(outfit_rel.aesthetic)

    crudos = remix_outfit(
        dicts,
        pinned_garment_ids=req.pinned_garment_ids,
        target_aesthetic=req.target_aesthetic,
        disliked_combinations=disliked_combinations,
        preferred_aesthetics=preferred_aesthetics,
        occasion=req.occasion,
        weather=req.weather,
    )

    outfits: list[OutfitOut] = []
    for crudo in crudos:
        outfit = Outfit(
            id=new_uuid(),
            user_id=user.id,
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
                occasion=outfit.occasion,
                weather=outfit.weather,
                reason=outfit.reason,
            )
        )
    session.commit()
    return OutfitRecommendResponse(outfits=outfits)


@router.post("/evaluate-manual", response_model=OutfitOut)
def evaluate_manual_outfit(
    req: ManualOutfitEvaluateRequest,
    session: SessionDep,
    user: UserDep,
) -> OutfitOut:
    """Evalúa en vivo una combinación elegida manualmente por el usuario y la persiste."""
    unique_ids = list(dict.fromkeys(req.garment_ids))
    prendas = session.query(Garment).filter(Garment.id.in_(unique_ids)).all()
    garments_by_id = {g.id: g for g in prendas}

    for gid in unique_ids:
        prenda = garments_by_id.get(gid)
        if prenda is None:
            raise HTTPException(status_code=404, detail=f"prenda {gid} no existe")
        if (
            prenda.owner_id is not None
            and prenda.owner_id != user.id
            and user.email != DEMO_USER_EMAIL
        ):
            raise HTTPException(status_code=403, detail="no autorizado para usar esta prenda")

    dicts = []
    for gid in unique_ids:
        d = _a_dict(garments_by_id[gid])
        if d.get("position") is None:
            d["position"] = "top"
        dicts.append(d)

    evaluado = evaluate_manual_combo(dicts, occasion=req.occasion, weather=req.weather)
    outfit = Outfit(
        id=new_uuid(),
        user_id=user.id,
        aesthetic=evaluado["aesthetic"],
        chromatic_score=evaluado["chromatic_score"],
        embedding_score=evaluado["embedding_score"],
        occasion=evaluado.get("occasion"),
        weather=evaluado.get("weather"),
        reason=evaluado.get("reason"),
    )
    session.add(outfit)
    for i, g in enumerate(evaluado["garments"]):
        session.add(
            OutfitGarment(
                outfit_id=outfit.id,
                garment_id=g["id"],
                position=g["position"],
                layer_index=i,
            )
        )
    session.commit()

    return OutfitOut(
        outfit_id=outfit.id,
        aesthetic=outfit.aesthetic,
        garments=[
            OutfitGarmentRef(garment_id=g["id"], position=g["position"])
            for g in evaluado["garments"]
        ],
        chromatic_score=outfit.chromatic_score,
        embedding_score=outfit.embedding_score,
        occasion=outfit.occasion,
        weather=outfit.weather,
        reason=outfit.reason,
    )


@router.post("/{outfit_id}/wear", response_model=OutfitUsageLogOut)
def record_outfit_wear(
    outfit_id: str,
    session: SessionDep,
    user: UserDep,
    payload: OutfitUsageLogCreate | None = None,
) -> OutfitUsageLogOut:
    """Registra un outfit como usado en una fecha (por defecto hoy). Idempotente por dia."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")
    if outfit.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para registrar este outfit")

    fecha_uso = datetime.now(UTC).date()
    if payload and payload.worn_date:
        try:
            fecha_uso = date.fromisoformat(payload.worn_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="formato de fecha invalido (esperado YYYY-MM-DD)")

    existente = (
        session.query(OutfitUsageLog)
        .filter(
            OutfitUsageLog.user_id == user.id,
            OutfitUsageLog.outfit_id == outfit_id,
            OutfitUsageLog.worn_date == fecha_uso,
        )
        .first()
    )
    if existente is not None:
        return OutfitUsageLogOut(
            id=existente.id,
            user_id=existente.user_id,
            outfit_id=existente.outfit_id,
            worn_date=existente.worn_date.isoformat(),
            created_at=existente.created_at,
        )

    nuevo_log = OutfitUsageLog(
        id=new_uuid(),
        user_id=user.id,
        outfit_id=outfit_id,
        worn_date=fecha_uso,
    )
    session.add(nuevo_log)
    session.commit()
    session.refresh(nuevo_log)
    return OutfitUsageLogOut(
        id=nuevo_log.id,
        user_id=nuevo_log.user_id,
        outfit_id=nuevo_log.outfit_id,
        worn_date=nuevo_log.worn_date.isoformat(),
        created_at=nuevo_log.created_at,
    )


@router.get("/history/usage", response_model=list[OutfitUsageLogOut])
def get_usage_history(
    session: SessionDep,
    user: UserDep,
) -> list[OutfitUsageLogOut]:
    """Historial cronologico de outfits usados por el usuario."""
    logs = (
        session.query(OutfitUsageLog)
        .filter(OutfitUsageLog.user_id == user.id)
        .order_by(OutfitUsageLog.worn_date.desc(), OutfitUsageLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        OutfitUsageLogOut(
            id=l.id,
            user_id=l.user_id,
            outfit_id=l.outfit_id,
            worn_date=l.worn_date.isoformat(),
            created_at=l.created_at,
        )
        for l in logs
    ]


@router.post("/{outfit_id}/stylist-advice", response_model=StylistAdviceResponse)
def get_outfit_stylist_advice(
    outfit_id: str,
    session: SessionDep,
    user: UserDep,
    payload: StylistAdviceRequest | None = None,
) -> StylistAdviceResponse:
    """Devuelve asesoramiento estilistico detallado (Azure OpenAI o fallback experto local)."""
    outfit = session.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit no existe")

    if outfit.user_id != user.id and user.email != DEMO_USER_EMAIL:
        raise HTTPException(status_code=403, detail="no autorizado para consultar este outfit")

    filas = (
        session.query(OutfitGarment, Garment)
        .join(Garment, Garment.id == OutfitGarment.garment_id)
        .filter(OutfitGarment.outfit_id == outfit_id)
        .order_by(OutfitGarment.layer_index.asc())
        .all()
    )
    garment_dicts = [
        {
            "category": g.category,
            "subcategory": getattr(g, "subcategory", None),
            "position": og.position,
            "pattern": getattr(g, "pattern", None),
            "dominant_colors": g.dominant_colors,
            "aesthetic": g.top_aesthetics[0]["aesthetic"] if g.top_aesthetics else outfit.aesthetic,
        }
        for og, g in filas
    ]

    effective_occasion = (
        payload.occasion if payload and payload.occasion else outfit.occasion
    )
    effective_weather = (
        payload.weather if payload and payload.weather else outfit.weather
    )
    user_note = payload.user_note if payload else None

    return get_stylist_advice(
        outfit_id=outfit.id,
        aesthetic=outfit.aesthetic,
        garments=garment_dicts,
        chromatic_score=outfit.chromatic_score,
        embedding_score=outfit.embedding_score,
        occasion=effective_occasion,
        weather=effective_weather,
        reason=outfit.reason,
        user_note=user_note,
    )


def _a_dict(g: Garment) -> dict:
    """Convierte un Garment al dict que espera el motor de recomendacion."""
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
        "status": getattr(g, "status", "AVAILABLE"),
        "pattern": getattr(g, "pattern", None),
    }
