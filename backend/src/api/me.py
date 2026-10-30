"""Router de identidad del MVP.

`GET /api/v1/me` devuelve el usuario con el que el backend persiste todo
(prendas, outfits, jobs). El MVP no valida JWT: el frontend no manda
`Authorization`, asi que aca se expone la identidad en vez de esconderla.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.garments import get_demo_user
from db.session import SessionLocal
from domain.schemas import MeResponse

router = APIRouter(prefix="/api/v1", tags=["me"])


@router.get("/me", response_model=MeResponse)
def me() -> MeResponse:
    """Usuario demo del backend (se crea en el primer request si falta)."""
    session = SessionLocal()
    try:
        user = get_demo_user(session)
        return MeResponse(user_id=user.id, email=user.email)
    finally:
        session.close()
