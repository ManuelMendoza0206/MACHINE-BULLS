"""Router de identidad del MVP.

`GET /api/v1/me` devuelve el usuario autenticado (via Bearer JWT de Supabase)
o el usuario demo si corre sin autenticacion.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.session import get_session
from domain.models import User
from domain.schemas import CanonicalPhotoResponse, MeResponse
from services import storage
from services.auth import get_current_user
from services.image_upload import read_validated_image
from services.pose_check import validate_apose

router = APIRouter(prefix="/api/v1", tags=["me"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=MeResponse)
def me(user: UserDep) -> MeResponse:
    """Usuario actual autenticado o demo."""
    return MeResponse(user_id=user.id, email=user.email)


@router.get("/me/canonical-photo", response_model=CanonicalPhotoResponse)
def get_canonical_photo(user: UserDep) -> CanonicalPhotoResponse:
    """Devuelve el estado de la foto canónica del usuario y su URL si existe."""
    if not user.canonical_consent or not user.canonical_photo_path:
        return CanonicalPhotoResponse(has_canonical=False)

    return CanonicalPhotoResponse(
        has_canonical=True,
        photo_url=storage.url_for(user.canonical_photo_path),
        consent_at=user.canonical_consent_at,
    )


@router.post("/me/canonical-photo", response_model=CanonicalPhotoResponse)
def upload_canonical_photo(
    user: UserDep,
    session: SessionDep,
    file: UploadFile,
    consent: Annotated[bool, Form(...)],
) -> CanonicalPhotoResponse:
    """Sube o actualiza la foto canónica con consentimiento informado explícito."""
    if not consent:
        raise HTTPException(
            status_code=400,
            detail="Debe otorgar consentimiento informado explícito para almacenar su foto canónica.",
        )

    contenido, _image = read_validated_image(file, "canonical_photo")
    pose = validate_apose(contenido)
    if not pose.ok:
        raise HTTPException(status_code=422, detail=f"A-Pose inválida: {pose.reason}")

    # Si ya existía foto anterior, eliminar archivo previo
    if user.canonical_photo_path:
        storage.delete_file(user.canonical_photo_path)

    rel_path, url = storage.save_image(contenido, f"humans/{user.id}/canonical")

    user.canonical_photo_path = rel_path
    user.canonical_consent = True
    user.canonical_consent_at = datetime.utcnow()
    session.commit()

    return CanonicalPhotoResponse(
        has_canonical=True,
        photo_url=url,
        consent_at=user.canonical_consent_at,
        message="Foto canónica guardada exitosamente con consentimiento informado.",
    )


@router.delete("/me/canonical-photo", response_model=CanonicalPhotoResponse)
def delete_canonical_photo(user: UserDep, session: SessionDep) -> CanonicalPhotoResponse:
    """Elimina la foto canónica física y revoca el consentimiento del usuario."""
    if user.canonical_photo_path:
        storage.delete_file(user.canonical_photo_path)

    user.canonical_photo_path = None
    user.canonical_consent = False
    user.canonical_consent_at = None
    session.commit()

    return CanonicalPhotoResponse(
        has_canonical=False,
        message="Foto canónica y consentimiento eliminados correctamente.",
    )


@router.post("/me/purge-photos")
@router.post("/auth/purge-photos")
def purge_user_photos(user: UserDep) -> dict:
    """Purga las fotos temporales de pose y silueta del usuario actual."""
    eliminados = storage.purge_user_human_photos(user.id)
    return {
        "status": "ok",
        "purged_count": len(eliminados),
        "message": "Fotos temporales purgadas correctamente por solicitud de privacidad.",
    }
