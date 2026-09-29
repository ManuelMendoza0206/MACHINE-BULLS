"""Tests de schemas Pydantic (spec §4). Nominal + inválido por campo,
mismo patrón que los tests Zod del frontend."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from domain.schemas import (
    AestheticScore,
    CapsuleCatalogResponse,
    DominantColor,
    GarmentUploadResponse,
    Outfit,
    OutfitGarmentRef,
    OutfitRecommendationResponse,
    OutfitRecommendRequest,
    VtonGarmentLayer,
    VtonJobCreateResponse,
    VtonJobStatusResponse,
    VtonMultilayerRequest,
)

UID = "123e4567-e89b-12d3-a456-426614174000"


def test_aesthetic_score_rangos() -> None:
    assert AestheticScore(aesthetic="x", confidence=1).confidence == 1
    with pytest.raises(ValidationError):
        AestheticScore(aesthetic="x", confidence=2)


def test_dominant_color_rangos_y_hex() -> None:
    assert DominantColor(h=10, s=20, v=30, hex="#aabbcc").hex == "#aabbcc"
    with pytest.raises(ValidationError):
        DominantColor(h=400, s=20, v=30, hex="#aabbcc")
    with pytest.raises(ValidationError):
        DominantColor(h=10, s=20, v=30, hex="no-es-hex")


def test_garment_upload_nominal_y_faltantes() -> None:
    ok = GarmentUploadResponse(
        garment_id=UID, category="tops",
        dominant_colors=[{"h": 1, "s": 2, "v": 3, "hex": "#ffffff"}],
        processed_image_url="https://x/y.jpg",
    )
    assert ok.position is None and ok.top_aesthetics is None
    with pytest.raises(ValidationError):
        GarmentUploadResponse(garment_id=UID, category="tops",
                              processed_image_url="https://x/y.jpg")


def test_outfit_minimo_una_prenda() -> None:
    with pytest.raises(ValidationError):
        Outfit(outfit_id=UID, aesthetic="x", garments=[],
               chromatic_score=0.5, embedding_score=0.5)
    o = Outfit(outfit_id=UID, aesthetic="x",
               garments=[OutfitGarmentRef(garment_id=UID, position="top")],
               chromatic_score=0.5, embedding_score=0.5)
    assert o.garments[0].position.value == "top"
    assert OutfitRecommendationResponse(outfits=[o]).outfits[0].outfit_id is not None
    r = OutfitRecommendRequest(user_id=UID)
    assert r.target_aesthetic is None


def test_vton_create_status_literal() -> None:
    assert VtonJobCreateResponse(job_id=UID, status="processing",
                                 estimated_time_seconds=30).status == "processing"
    with pytest.raises(ValidationError):
        VtonJobCreateResponse(job_id=UID, status="pending", estimated_time_seconds=30)


def test_vton_status_completed_exige_result_url() -> None:
    with pytest.raises(ValidationError):
        VtonJobStatusResponse(job_id=UID, status="completed")
    ok = VtonJobStatusResponse(job_id=UID, status="completed",
                               result_url="https://x/r.jpg")
    assert ok.error_message is None


def test_multilayer_uno_a_cuatro() -> None:
    una = [VtonGarmentLayer(garment_id=UID, position="top")]
    assert len(VtonMultilayerRequest(garment_layers=una).garment_layers) == 1
    with pytest.raises(ValidationError):
        VtonMultilayerRequest(garment_layers=[])
    with pytest.raises(ValidationError):
        VtonMultilayerRequest(garment_layers=una * 5)


def test_capsule_catalog() -> None:
    c = CapsuleCatalogResponse(garments=[{
        "id": UID, "processed_image_url": "https://x/y.jpg",
        "category": "tops", "dominant_aesthetic": "x"}])
    assert c.garments[0].category == "tops"
