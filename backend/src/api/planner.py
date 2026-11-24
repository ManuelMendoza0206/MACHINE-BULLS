"""Router de planificación de vestimenta (Outfit Planner).

Permite agendar qué ponerse en fechas futuras, consultar la agenda semanal/mensual
y confirmar el uso real del outfit (cerrando el ciclo con OutfitUsageLog y estado de lavandería).
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.session import get_session
from domain.enums import GarmentStatus, OutfitPlanStatus
from domain.models import (
    Garment,
    GarmentOwnership,
    Outfit,
    OutfitPlan,
    OutfitUsageLog,
    User,
    new_uuid,
)
from domain.schemas import (
    DailyOutfitPlan,
    OutfitPlanConfirmResponse,
    OutfitPlanCreate,
    OutfitPlanResponse,
    PackedGarmentSummary,
    PackingPlanRequest,
    PackingPlanResponse,
)
from services import storage
from services.auth import get_current_user

router = APIRouter(prefix="/api/v1/planner", tags=["planner"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


def _plan_a_response(plan: OutfitPlan) -> OutfitPlanResponse:
    """Convierte la entidad OutfitPlan al schema público."""
    return OutfitPlanResponse(
        id=plan.id,
        user_id=plan.user_id,
        planned_date=plan.planned_date.isoformat(),
        garment_ids=list(plan.garment_ids or []),
        outfit_id=plan.outfit_id,
        occasion=plan.occasion,
        notes=plan.notes,
        status=plan.status,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("", response_model=list[OutfitPlanResponse])
def get_plans(
    session: SessionDep,
    user: UserDep,
    start_date: str | None = Query(None, description="Fecha inicio YYYY-MM-DD"),
    end_date: str | None = Query(None, description="Fecha fin YYYY-MM-DD"),
) -> list[OutfitPlanResponse]:
    """Obtiene los planes de vestimenta del usuario autenticado en un rango de fechas."""
    query = session.query(OutfitPlan).filter(OutfitPlan.user_id == user.id)

    if start_date:
        try:
            d_start = date.fromisoformat(start_date)
            query = query.filter(OutfitPlan.planned_date >= d_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date debe tener formato YYYY-MM-DD")

    if end_date:
        try:
            d_end = date.fromisoformat(end_date)
            query = query.filter(OutfitPlan.planned_date <= d_end)
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date debe tener formato YYYY-MM-DD")

    planes = query.order_by(OutfitPlan.planned_date.asc(), OutfitPlan.created_at.asc()).all()
    return [_plan_a_response(p) for p in planes]


@router.post("", response_model=OutfitPlanResponse, status_code=201)
def create_plan(
    payload: OutfitPlanCreate,
    session: SessionDep,
    user: UserDep,
) -> OutfitPlanResponse:
    """Agenda un conjunto de prendas para vestir en una fecha determinada."""
    try:
        f_plan = date.fromisoformat(payload.planned_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="planned_date debe tener formato YYYY-MM-DD")

    # Si se asocia un outfit_id, verificar existencia
    if payload.outfit_id:
        outfit = session.get(Outfit, payload.outfit_id)
        if outfit is None:
            raise HTTPException(status_code=404, detail="el outfit asociado no existe")

    # Verificar que las prendas existan
    garments = session.query(Garment).filter(Garment.id.in_(payload.garment_ids)).all()
    if len(garments) != len(set(payload.garment_ids)):
        raise HTTPException(status_code=400, detail="una o más prendas especificadas no existen")

    plan = OutfitPlan(
        id=new_uuid(),
        user_id=user.id,
        outfit_id=payload.outfit_id,
        garment_ids=payload.garment_ids,
        planned_date=f_plan,
        occasion=payload.occasion,
        notes=payload.notes,
        status=OutfitPlanStatus.PLANNED.value,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return _plan_a_response(plan)


@router.patch("/{plan_id}/confirm", response_model=OutfitPlanConfirmResponse)
def confirm_plan_usage(
    plan_id: str,
    session: SessionDep,
    user: UserDep,
    send_to_laundry: bool = Query(
        False, description="Si es True, cambia el estado de las prendas a LAUNDRY"
    ),
) -> OutfitPlanConfirmResponse:
    """Confirma que el plan agendado fue efectivamente vestido.

    Registra el uso en OutfitUsageLog (impactando analíticas y Cost per Wear)
    y opcionalmente traslada las prendas al estado 'LAUNDRY'.
    """
    plan = session.get(OutfitPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="el plan no existe")
    if plan.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para modificar este plan")

    plan.status = OutfitPlanStatus.COMPLETED.value
    plan.updated_at = datetime.now(UTC)

    usage_logged = False
    # Registrar en OutfitUsageLog si hay outfit_id
    if plan.outfit_id:
        existente = (
            session.query(OutfitUsageLog)
            .filter(
                OutfitUsageLog.user_id == user.id,
                OutfitUsageLog.outfit_id == plan.outfit_id,
                OutfitUsageLog.worn_date == plan.planned_date,
            )
            .first()
        )
        if existente is None:
            log = OutfitUsageLog(
                id=new_uuid(),
                user_id=user.id,
                outfit_id=plan.outfit_id,
                worn_date=plan.planned_date,
            )
            session.add(log)
            usage_logged = True

    # Traslado opcional a lavandería
    laundry_updated: list[str] = []
    if send_to_laundry and plan.garment_ids:
        prendas = session.query(Garment).filter(Garment.id.in_(plan.garment_ids)).all()
        for p in prendas:
            p.status = GarmentStatus.LAUNDRY.value
            laundry_updated.append(p.id)

    session.commit()
    session.refresh(plan)

    return OutfitPlanConfirmResponse(
        plan=_plan_a_response(plan),
        usage_logged=usage_logged,
        garments_marked_laundry=laundry_updated,
    )


@router.delete("/{plan_id}")
def cancel_or_delete_plan(
    plan_id: str,
    session: SessionDep,
    user: UserDep,
) -> dict:
    """Cancela o elimina un plan de la agenda."""
    plan = session.get(OutfitPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="el plan no existe")
    if plan.user_id != user.id:
        raise HTTPException(status_code=403, detail="no autorizado para eliminar este plan")

    session.delete(plan)
    session.commit()
    return {"deleted": True, "id": plan_id}


@router.post("/packing", response_model=PackingPlanResponse)
def create_packing_plan(
    payload: PackingPlanRequest,
    session: SessionDep,
    user: UserDep,
) -> PackingPlanResponse:
    """Genera una cápsula de viaje optimizada y la planificación de outfits por día."""
    owned_ids = [
        row.garment_id
        for row in session.query(GarmentOwnership).filter(GarmentOwnership.user_id == user.id).all()
    ]
    if not owned_ids:
        raise HTTPException(status_code=400, detail="no tienes prendas en tu guardarropa para armar una maleta")

    garments = (
        session.query(Garment)
        .filter(
            Garment.id.in_(owned_ids),
            Garment.is_candidate.is_(False),
            Garment.status == GarmentStatus.AVAILABLE.value,
        )
        .all()
    )

    tops = [g for g in garments if g.position == "top"]
    bottoms = [g for g in garments if g.position == "bottom"]
    dresses = [g for g in garments if g.position == "dress"]
    outers = [g for g in garments if g.position == "outerwear"]
    shoes = [g for g in garments if g.position == "footwear"]
    bags = [g for g in garments if g.position == "bag"]

    has_split_outfit = bool(tops and bottoms)
    if not has_split_outfit and not dresses:
        raise HTTPException(
            status_code=400,
            detail="Se requiere al menos una prenda superior e inferior, o un vestido, para armar la maleta",
        )

    days = max(1, min(14, payload.days))

    # Reglas de selección de cápsula minimalista según días, clima y vestidos disponibles
    dress_target = min(len(dresses), max(1, days // 2)) if dresses and not has_split_outfit else (
        min(len(dresses), max(1, days // 3)) if dresses else 0
    )
    if not has_split_outfit:
        dress_target = min(len(dresses), days)

    split_days = max(0, days - dress_target) if has_split_outfit else 0
    top_count = min(len(tops), split_days) if has_split_outfit and split_days > 0 else 0
    bottom_count = min(len(bottoms), max(1, (split_days + 1) // 2)) if top_count > 0 else 0

    outer_count = 0
    if payload.weather == "cold":
        outer_count = min(len(outers), 2 if days > 3 else 1)
    elif payload.weather == "mild" and outers or payload.weather == "warm" and outers and days >= 5:
        outer_count = 1

    shoes_count = min(len(shoes), 2 if days >= 4 else (1 if shoes else 0))
    bags_count = 1 if bags else 0

    selected_tops = tops[:top_count]
    selected_bottoms = bottoms[:bottom_count]
    selected_dresses = dresses[:dress_target]
    selected_outers = outers[:outer_count]
    selected_shoes = shoes[:shoes_count]
    selected_bags = bags[:bags_count]

    packed_garments_all = (
        selected_tops
        + selected_bottoms
        + selected_dresses
        + selected_outers
        + selected_shoes
        + selected_bags
    )
    packed_summaries = [
        PackedGarmentSummary(
            id=g.id,
            category=g.category,
            position=g.position,
            processed_image_url=storage.url_for(g.processed_image_path),
        )
        for g in packed_garments_all
    ]

    daily_plans: list[DailyOutfitPlan] = []
    for d in range(1, days + 1):
        if selected_dresses and (not has_split_outfit or d <= len(selected_dresses)):
            dr = selected_dresses[(d - 1) % len(selected_dresses)]
            g_ids = [dr.id]
            partes_motivo = [f"Día {d}: {dr.subcategory or dr.category}"]
        else:
            split_idx = d - 1 - (len(selected_dresses) if has_split_outfit else 0)
            t = selected_tops[split_idx % len(selected_tops)]
            b = selected_bottoms[split_idx % len(selected_bottoms)]
            g_ids = [t.id, b.id]
            partes_motivo = [f"Día {d}: {t.subcategory or t.category} con {b.subcategory or b.category}"]

        if selected_outers:
            out = selected_outers[(d - 1) % len(selected_outers)]
            g_ids.append(out.id)
            partes_motivo.append(f"capa de abrigo ({out.subcategory or out.category})")

        if selected_shoes:
            sh = selected_shoes[(d - 1) % len(selected_shoes)]
            g_ids.append(sh.id)

        if selected_bags:
            g_ids.append(selected_bags[0].id)

        daily_plans.append(
            DailyOutfitPlan(
                day=d,
                garment_ids=g_ids,
                reason=" + ".join(partes_motivo),
            )
        )

    split_combos = len(selected_tops) * len(selected_bottoms) * max(1, len(selected_outers))
    dress_combos = len(selected_dresses) * (len(selected_outers) + 1 if selected_outers else 1)
    combinations_count = split_combos + dress_combos
    tip = (
        f"Con solo {len(packed_garments_all)} prendas logras {combinations_count} combinaciones posibles. "
        "Enrolla las prendas en lugar de doblarlas para optimizar espacio y evitar arrugas en tu equipaje."
    )

    return PackingPlanResponse(
        days=days,
        weather=payload.weather,
        packed_garments=packed_summaries,
        daily_plans=daily_plans,
        total_items_count=len(packed_garments_all),
        combinations_unlocked_count=combinations_count,
        tip=tip,
    )
