"""Router de identidad del MVP.

`GET /api/v1/me` devuelve el usuario autenticado (via Bearer JWT de Supabase)
o el usuario demo si corre sin autenticacion.
"""

from __future__ import annotations

import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from db.session import get_session
from domain.models import User
from domain.schemas import MeResponse
from services import storage
from services.auth import get_current_user
from services.pose_check import validate_apose

router = APIRouter(prefix="/api/v1", tags=["me"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


def _me_response(user: User) -> MeResponse:
    """Construye MeResponse con la foto corporal privada del usuario (si existe)."""
    photo_path = getattr(user, "vton_photo_path", None)
    return MeResponse(
        user_id=user.id,
        email=user.email,
        has_default_vton_photo=bool(photo_path),
        default_vton_photo_url=storage.url_for(photo_path) if photo_path else None,
    )


@router.get("/me", response_model=MeResponse)
def me(user: UserDep) -> MeResponse:
    """Usuario actual autenticado o demo."""
    return _me_response(user)


@router.post("/me/vton-photo", response_model=MeResponse)
async def upload_default_vton_photo(
    user_image: UploadFile,
    session: SessionDep,
    user: UserDep,
) -> MeResponse:
    """Guarda o reemplaza la foto corporal privada por defecto del usuario para VTON."""
    contenido = user_image.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="user_image vacia")

    try:
        Image.open(io.BytesIO(contenido)).load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="user_image no es imagen") from exc

    pose = validate_apose(contenido)
    if not pose.ok:
        raise HTTPException(status_code=422, detail=f"A-Pose invalida: {pose.reason}")

    old_path = getattr(user, "vton_photo_path", None)
    rel_path, _ = storage.save_image(contenido, "user_photos")
    user.vton_photo_path = rel_path
    session.commit()
    session.refresh(user)

    if old_path and old_path != rel_path:
        storage.delete_image(old_path)

    return _me_response(user)


@router.delete("/me/vton-photo", response_model=MeResponse)
def delete_default_vton_photo(
    session: SessionDep,
    user: UserDep,
) -> MeResponse:
    """Elimina la foto corporal por defecto guardada en el perfil del usuario."""
    old_path = getattr(user, "vton_photo_path", None)
    if old_path:
        storage.delete_image(old_path)
        user.vton_photo_path = None
        session.commit()
        session.refresh(user)

    return _me_response(user)


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
