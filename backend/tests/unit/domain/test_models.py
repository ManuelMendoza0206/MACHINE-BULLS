"""Tests unitarios de modelos (spec §4 + AC fr). Sin BD: instanciación,
enums y paridad exacta de columnas (cero columnas no autorizadas)."""

from __future__ import annotations

from uuid import UUID

import pytest

from domain.enums import GarmentSource, OutfitPosition, VtonJobStatus
from domain.models import Garment, GarmentOwnership, Outfit, OutfitGarment, User, VTONJob

COLUMNAS_ESPERADAS = {
    "User": {"id", "email", "name", "created_at"},
    "Garment": {
        "id", "user_id", "image_url", "processed_image_url", "category",
        "aesthetic_scores", "dominant_colors_hsv", "compatibility_embedding", "created_at",
    },
    "GarmentOwnership": {"user_id", "garment_id", "source", "added_at"},
    "Outfit": {"id", "user_id", "score", "aesthetic", "created_at"},
    "OutfitGarment": {"outfit_id", "garment_id", "position"},
    "VTONJob": {
        "id", "user_id", "user_photo_url", "outfit_id", "status",
        "result_url", "error_message", "created_at",
    },
}

MODELOS = {
    "User": User,
    "Garment": Garment,
    "GarmentOwnership": GarmentOwnership,
    "Outfit": Outfit,
    "OutfitGarment": OutfitGarment,
    "VTONJob": VTONJob,
}


@pytest.mark.parametrize("nombre,modelo", sorted(MODELOS.items()))
def test_columnas_exactas_sin_autorizadas_de_mas(nombre: str, modelo: object) -> None:
    assert set(modelo.__table__.columns.keys()) == COLUMNAS_ESPERADAS[nombre]


def test_user_defaults() -> None:
    from uuid import uuid4

    # Los default= python-side disparan en flush, no en constructor: se pasa id explícito.
    u = User(id=uuid4(), email="a@b.com")
    assert isinstance(u.id, UUID)
    assert u.name is None


def test_garment_capsula_permite_user_null() -> None:
    g = Garment(
        user_id=None, image_url="http://x/y.jpg", processed_image_url="http://x/z.jpg",
        category="tops", aesthetic_scores={}, dominant_colors_hsv={},
        compatibility_embedding=[0.0] * 128,
    )
    assert g.user_id is None


def test_enums_rechazan_valores_fuera() -> None:
    with pytest.raises(ValueError):
        OutfitPosition("silla")
    with pytest.raises(ValueError):
        VtonJobStatus("volando")
    with pytest.raises(ValueError):
        GarmentSource("prestada")


def test_vtonjob_status_explicito() -> None:
    from uuid import uuid4

    j = VTONJob(user_id=uuid4(), user_photo_url="http://x/f.jpg", outfit_id=uuid4(),
                status=VtonJobStatus.PENDING)
    assert j.status == VtonJobStatus.PENDING
    assert j.result_url is None
