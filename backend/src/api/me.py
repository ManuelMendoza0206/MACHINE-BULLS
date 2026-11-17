"""Router de identidad del MVP.

`GET /api/v1/me` devuelve el usuario autenticado (via Bearer JWT de Supabase)
o el usuario demo si corre sin autenticacion.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from domain.models import User
from domain.schemas import MeResponse
from services import storage
from services.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["me"])

UserDep = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=MeResponse)
def me(user: UserDep) -> MeResponse:
    """Usuario actual autenticado o demo."""
    return MeResponse(user_id=user.id, email=user.email)


@router.post("/me/purge-photos")
@router.post("/auth/purge-photos")
def purge_user_photos(user: UserDep) -> dict:
    """Purga inmediata de fotos temporales de pose y silueta por privacidad."""
    eliminados = storage.purge_all_human_photos()
    return {
        "status": "ok",
        "purged_count": len(eliminados),
        "message": "Fotos temporales purgadas correctamente por solicitud de privacidad.",
    }
