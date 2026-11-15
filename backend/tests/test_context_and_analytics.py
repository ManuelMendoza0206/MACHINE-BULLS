"""Tests para recomendaciones contextuales (clima/ocasion), registro de uso y analiticas."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from db.session import SessionLocal
from domain.enums import OwnershipSource
from domain.models import Garment, GarmentOwnership, Outfit, new_uuid
from main import app
from services import storage
from services.auth import get_demo_user
from services.recommender.engine import recommend_outfits

client = TestClient(app)


def test_recommender_context_weather_and_occasion():
    # Preparamos prendas sinteticas: Top, Bottom, Outerwear
    garments = [
        {
            "id": "g-top-1",
            "position": "top",
            "colors": [{"hex": "#FFFFFF", "pct": 1.0, "h": 0, "s": 0.0, "v": 100.0}],
            "embedding": [0.1] * 128,
            "aesthetic": "formal",
        },
        {
            "id": "g-bottom-1",
            "position": "bottom",
            "colors": [{"hex": "#000000", "pct": 1.0, "h": 0, "s": 0.0, "v": 0.0}],
            "embedding": [0.1] * 128,
            "aesthetic": "formal",
        },
        {
            "id": "g-outer-1",
            "position": "outerwear",
            "colors": [{"hex": "#333333", "pct": 1.0, "h": 0, "s": 0.0, "v": 20.0}],
            "embedding": [0.1] * 128,
            "aesthetic": "formal",
        },
    ]

    # Con clima frio y ocasion formal
    outfits = recommend_outfits(garments, occasion="work", weather="cold")
    assert len(outfits) > 0
    top_outfit = outfits[0]
    assert top_outfit["occasion"] == "work"
    assert top_outfit["weather"] == "cold"
    assert "reason" in top_outfit
    assert "térmica" in top_outfit["reason"] or "bajas temperaturas" in top_outfit["reason"]


def test_outfit_wear_and_history():
    session = SessionLocal()
    try:
        user = get_demo_user(session)

        outfit = Outfit(
            id=new_uuid(),
            user_id=user.id,
            aesthetic="casual",
            chromatic_score=0.85,
            embedding_score=0.8,
            occasion="casual",
            weather="mild",
            reason="Armonia equilibrada.",
        )
        session.add(outfit)
        session.commit()

        # 1. Registrar como usado hoy
        resp_wear = client.post(f"/api/v1/outfits/{outfit.id}/wear")
        assert resp_wear.status_code == 200, resp_wear.text
        data = resp_wear.json()
        assert data["outfit_id"] == outfit.id
        assert data["worn_date"] == datetime.now(UTC).date().isoformat()

        # 2. Registrar de nuevo el mismo dia (debe ser idempotente)
        resp_wear_again = client.post(f"/api/v1/outfits/{outfit.id}/wear")
        assert resp_wear_again.status_code == 200
        assert resp_wear_again.json()["id"] == data["id"]

        # 3. Consultar historial de uso
        resp_history = client.get("/api/v1/outfits/history/usage")
        assert resp_history.status_code == 200
        logs = resp_history.json()
        assert any(l["outfit_id"] == outfit.id for l in logs)

    finally:
        session.close()


def test_wardrobe_analytics_and_gaps():
    session = SessionLocal()
    try:
        user = get_demo_user(session)

        # Creamos prendas para el usuario (solo remera y pantalon, sin abrigo ni calzado)
        g_top = Garment(
            id=new_uuid(),
            owner_id=user.id,
            category="t-shirt",
            position="top",
            image_path="prendas/top.jpg",
            processed_image_path="prendas/top.png",
            dominant_colors=[{"hex": "#FFFFFF", "pct": 1.0}],
            top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
            is_candidate=False,
        )
        g_bottom = Garment(
            id=new_uuid(),
            owner_id=user.id,
            category="pants",
            position="bottom",
            image_path="prendas/bottom.jpg",
            processed_image_path="prendas/bottom.png",
            dominant_colors=[{"hex": "#000000", "pct": 1.0}],
            top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
            is_candidate=False,
        )
        session.add(g_top)
        session.add(g_bottom)
        session.add(GarmentOwnership(id=new_uuid(), user_id=user.id, garment_id=g_top.id, source=OwnershipSource.UPLOAD.value))
        session.add(GarmentOwnership(id=new_uuid(), user_id=user.id, garment_id=g_bottom.id, source=OwnershipSource.UPLOAD.value))
        session.commit()

        resp = client.get("/api/v1/garments/analytics")
        assert resp.status_code == 200, resp.text
        analytics = resp.json()

        assert analytics["total_garments"] >= 2
        assert "utilization_rate" in analytics
        assert "most_worn_garments" in analytics
        assert "unworn_garments" in analytics
        assert "wardrobe_gaps" in analytics
        gaps_str = " ".join(analytics["wardrobe_gaps"])
        # Debe sugerir abrigo y calzado faltantes
        assert "abrigo" in gaps_str.lower()
        assert "calzado" in gaps_str.lower()

    finally:
        session.close()


def test_purge_photos_on_demand(tmp_path: Path):
    # Creamos un archivo dummy en humanos
    humanos_dir = tmp_path / "humanos"
    humanos_dir.mkdir(parents=True, exist_ok=True)
    foto_dummy = humanos_dir / "user_pose.jpg"
    foto_dummy.write_bytes(b"dummy human pose bytes")
    assert foto_dummy.exists()

    eliminados = storage.purge_all_human_photos(base_dir=tmp_path)
    assert "user_pose.jpg" in eliminados
    assert not foto_dummy.exists()

    # Probar endpoint HTTP
    resp = client.post("/api/v1/me/purge-photos")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
