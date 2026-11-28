"""Tests de Fases 3 y 4: VTON stage, patrones en recomendador, clima GPS/ciudad y armador manual."""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import MagicMock, patch

import jwt

from config import settings
from db.session import SessionLocal
from domain.models import Garment, GarmentOwnership, Outfit, User, VtonJob, new_uuid
from services import weather
from services.auth import get_demo_user
from services.recommender.engine import evaluate_manual_combo, recommend_outfits


def test_vton_status_expone_stage_en_vivo(client: Any) -> None:
    """GET /api/v1/vton/status/{job_id} debe incluir el stage actual del pipeline."""
    session = SessionLocal()
    try:
        demo = get_demo_user(session)
        outfit = Outfit(id=new_uuid(), user_id=demo.id, aesthetic="casual")
        session.add(outfit)
        session.flush()
        job = VtonJob(
            id=new_uuid(),
            user_id=demo.id,
            outfit_id=outfit.id,
            status="processing",
            stage="generating",
        )
        session.add(job)
        session.commit()
        job_id = job.id
    finally:
        session.close()

    res = client.get(f"/api/v1/vton/status/{job_id}")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "processing"
    assert body["stage"] == "generating"


def test_evaluate_manual_outfit_persiste_y_valida_propiedad(client: Any) -> None:
    """POST /api/v1/outfits/evaluate-manual evalua, persiste y protege contra 404/403."""
    session = SessionLocal()
    try:
        demo = get_demo_user(session)
        top = Garment(
            id=new_uuid(),
            owner_id=demo.id,
            category="top",
            subcategory="shirt",
            position="top",
            pattern="striped",
            image_path="garments/top.jpg",
            processed_image_path="garments/top.png",
            dominant_colors=[{"hex": "#1E3CC8", "pct": 1.0, "h": 225, "s": 74, "v": 78}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.2] * 128,
        )
        bottom = Garment(
            id=new_uuid(),
            owner_id=demo.id,
            category="bottom",
            subcategory="jeans",
            position="bottom",
            pattern="solid",
            image_path="garments/bottom.jpg",
            processed_image_path="garments/bottom.png",
            dominant_colors=[{"hex": "#111111", "pct": 1.0, "h": 0, "s": 0, "v": 7}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.2] * 128,
        )
        session.add_all([top, bottom])
        session.flush()
        session.add_all(
            [
                GarmentOwnership(id=new_uuid(), user_id=demo.id, garment_id=top.id, source="upload"),
                GarmentOwnership(id=new_uuid(), user_id=demo.id, garment_id=bottom.id, source="upload"),
            ]
        )
        session.commit()
        top_id = top.id
        bottom_id = bottom.id
    finally:
        session.close()

    res = client.post(
        "/api/v1/outfits/evaluate-manual",
        json={
            "garment_ids": [top_id, bottom_id],
            "occasion": "work",
            "weather": "mild",
        },
    )
    assert res.status_code == 200, res.text
    outfit = res.json()
    assert outfit["outfit_id"]
    assert 0.0 <= outfit["chromatic_score"] <= 1.0
    assert 0.0 <= outfit["embedding_score"] <= 1.0
    assert outfit["occasion"] == "work"
    assert outfit["weather"] == "mild"
    assert len(outfit["garments"]) == 2
    assert "equilibrio entre estampado y piezas lisas" in (outfit["reason"] or "").lower()

    fetched = client.get(f"/api/v1/outfits/{outfit['outfit_id']}")
    assert fetched.status_code == 200
    assert fetched.json()["outfit_id"] == outfit["outfit_id"]

    missing = client.post(
        "/api/v1/outfits/evaluate-manual",
        json={"garment_ids": [top_id, "prenda-inexistente"]},
    )
    assert missing.status_code == 404

    # Prenda privada de otro usuario -> 403 al consultar desde un tercero autenticado
    session = SessionLocal()
    try:
        other_user = User(id=new_uuid(), email=f"other-{new_uuid()}@styles.com")
        session.add(other_user)
        session.flush()
        other_garment = Garment(
            id=new_uuid(),
            owner_id=other_user.id,
            category="pants",
            position="bottom",
            image_path="garments/p.jpg",
            processed_image_path="garments/p.png",
            dominant_colors=[{"hex": "#222222", "pct": 1.0, "h": 0, "s": 0, "v": 13}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.2] * 128,
        )
        session.add(other_garment)
        session.commit()
        other_gid = other_garment.id
    finally:
        session.close()

    third_token = jwt.encode(
        {
            "sub": new_uuid(),
            "email": "tercero@styles.com",
            "aud": "authenticated",
            "exp": int(time.time()) + 300,
        },
        settings.supabase_jwt_secret or "test-secret",
        algorithm="HS256",
    )
    forbidden = client.post(
        "/api/v1/outfits/evaluate-manual",
        headers={"Authorization": f"Bearer {third_token}"},
        json={"garment_ids": [other_gid]},
    )
    assert forbidden.status_code == 403


def test_recommender_pattern_clash_y_equilibrio() -> None:
    """Dos estampados fuertes reciben penalizacion; 1 estampado + liso recibe bonus y razon."""
    base_colors = [{"h": 210.0, "s": 50.0, "v": 60.0, "hex": "#4d79a8", "mass": 1.0}]
    emb = [0.5, 0.5]

    busy_combo = [
        {"id": "t1", "position": "top", "colors": base_colors, "embedding": emb, "aesthetic": "casual", "pattern": "striped"},
        {"id": "b1", "position": "bottom", "colors": base_colors, "embedding": emb, "aesthetic": "casual", "pattern": "floral"},
    ]
    balanced_combo = [
        {"id": "t2", "position": "top", "colors": base_colors, "embedding": emb, "aesthetic": "casual", "pattern": "striped"},
        {"id": "b2", "position": "bottom", "colors": base_colors, "embedding": emb, "aesthetic": "casual", "pattern": "solid"},
    ]

    res_busy = evaluate_manual_combo(busy_combo)
    res_balanced = evaluate_manual_combo(balanced_combo)

    assert res_balanced["_score"] > res_busy["_score"]
    assert "equilibrio entre estampado y piezas lisas" in res_balanced["reason"].lower()

    ranked = recommend_outfits([*busy_combo, *balanced_combo], limit=4)
    assert ranked
    assert "striped" in {g.get("pattern") for g in ranked[0]["garments"]}


def test_weather_router_usa_ciudad_o_coords_gps(client: Any) -> None:
    """GET /api/v1/shopping/weather consulta segun ciudad o coordenadas GPS."""
    weather._WEATHER_CACHE.clear()

    seen_urls: list[str] = []
    resp = MagicMock(status_code=200)
    resp.json.return_value = {
        "current": {"temperature_2m": 27.5, "precipitation": 0.0, "weather_code": 0}
    }
    mock_http = MagicMock()

    def _get(url: str) -> MagicMock:
        seen_urls.append(url)
        return resp

    mock_http.get.side_effect = _get
    cm = MagicMock()
    cm.__enter__.return_value = mock_http
    cm.__exit__.return_value = False

    with patch("services.weather.httpx.Client", return_value=cm):
        r_city = client.get("/api/v1/shopping/weather", params={"city": "Santa Cruz"})
        assert r_city.status_code == 200
        assert r_city.json()["city"] == "Santa Cruz"
        assert r_city.json()["weather_type"] == "warm"
        assert "latitude=-17.7833" in seen_urls[-1]

        r_gps = client.get("/api/v1/shopping/weather", params={"lat": -17.39, "lon": -66.16})
        assert r_gps.status_code == 200
        assert r_gps.json()["city"] == "Tu ubicación"
        assert "latitude=-17.39" in seen_urls[-1]
        assert "longitude=-66.16" in seen_urls[-1]
