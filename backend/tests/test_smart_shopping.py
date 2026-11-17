"""Tests para Smart Shopping ("Before You Buy") y Clima en StyleMe."""

from __future__ import annotations

import io
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from db.session import SessionLocal
from domain.enums import OwnershipSource
from domain.models import Garment, GarmentOwnership, new_uuid
from main import app
from services.auth import get_demo_user
from services.shopping.evaluator import cosine_similarity

client = TestClient(app)


def _crear_imagen_dummy() -> bytes:
    img = Image.new("RGB", (64, 64), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    assert pytest.approx(cosine_similarity(v1, v2)) == 1.0
    assert pytest.approx(cosine_similarity(v1, v3)) == 0.0
    assert cosine_similarity([], []) == 0.0


def test_evaluate_candidate_with_redundancy():
    session = SessionLocal()
    try:
        user = get_demo_user(session)

        # Prenda existente en el armario del usuario
        existing_embedding = [0.1] * 128
        garment_existente = Garment(
            id=new_uuid(),
            owner_id=user.id,
            category="t-shirt",
            position="top",
            image_path="prendas/existing.jpg",
            processed_image_path="prendas/existing_proc.png",
            dominant_colors=[{"hex": "#0000FF", "pct": 0.8, "h": 240, "s": 100.0, "v": 100.0}],
            top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
            embedding=existing_embedding,
            is_candidate=False,
        )
        session.add(garment_existente)
        session.add(
            GarmentOwnership(
                id=new_uuid(),
                user_id=user.id,
                garment_id=garment_existente.id,
                source=OwnershipSource.UPLOAD.value,
            )
        )
        session.commit()

        # Mock del analizador para devolver un embedding identico (similitud = 1.0 >= 0.82)
        mock_analisis = {
            "category": "t-shirt",
            "position": "top",
            "dominant_colors": [{"hex": "#0000FF", "pct": 0.9, "h": 240, "s": 100.0, "v": 100.0}],
            "top_aesthetics": [{"aesthetic": "casual", "score": 0.88}],
            "embedding": existing_embedding,
        }

        dummy_img_bytes = _crear_imagen_dummy()

        with patch("services.shopping.evaluator.remove_background", return_value=Image.new("RGBA", (64, 64), (0, 0, 255, 255))), \
             patch("services.shopping.evaluator.analyze_garment", return_value=mock_analisis):
            resp = client.post(
                "/api/v1/shopping/evaluate",
                files={"file": ("candidate.jpg", dummy_img_bytes, "image/jpeg")},
            )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["candidate_garment"]["category"] == "t-shirt"
        assert data["redundancy"]["is_redundant"] is True
        assert data["redundancy"]["similar_garment_id"] == garment_existente.id
        assert data["redundancy"]["similarity"] >= 0.82
        assert "Precaución" in data["verdict"]

        candidate_id = data["candidate_garment"]["garment_id"]

        # Verificar que la prenda candidata NO aparece en el catalogo de capsule
        resp_capsule = client.get("/api/v1/garments/capsule")
        assert resp_capsule.status_code == 200
        capsule_ids = [g["id"] for g in resp_capsule.json()["garments"]]
        assert candidate_id not in capsule_ids

        # Adoptar la prenda candidata
        resp_adopt = client.post(f"/api/v1/shopping/{candidate_id}/adopt")
        assert resp_adopt.status_code == 200
        assert resp_adopt.json()["status"] == "adopted"

        # Ahora que fue adoptada, SI debe aparecer en capsule
        resp_capsule_after = client.get("/api/v1/garments/capsule")
        capsule_ids_after = [g["id"] for g in resp_capsule_after.json()["garments"]]
        assert candidate_id in capsule_ids_after

    finally:
        session.close()


def test_weather_endpoint():
    resp = client.get("/api/v1/shopping/weather?city=La%20Paz")
    assert resp.status_code == 200
    data = resp.json()
    assert "city" in data
    assert "temp_c" in data
    assert "weather_type" in data
    assert data["weather_type"] in ("cold", "mild", "warm")
    assert "condition" in data
