"""Router de identidad del MVP.

`GET /api/v1/me` devuelve el usuario autenticado (via Bearer JWT de Supabase)
o el usuario demo si corre sin autenticacion.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from domain.models import User
from domain.schemas import MeResponse
from services.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["me"])

UserDep = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=MeResponse)
def me(user: UserDep) -> MeResponse:
    """Usuario actual autenticado o demo."""
    return MeResponse(user_id=user.id, email=user.email)
