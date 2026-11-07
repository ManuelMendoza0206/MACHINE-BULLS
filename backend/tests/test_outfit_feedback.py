"""Tests de integracion y unitarios para la persistencia de feedback y personalizacion de outfits."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from db.session import SessionLocal
from domain.models import Garment, GarmentOwnership, Outfit, OutfitFeedback, OutfitGarment, User, new_uuid
from main import app
from services.recommender.engine import recommend_outfits

client = TestClient(app)


def test_submit_and_get_outfit_feedback():
    session = SessionLocal()
    try:
        user = User(id="user-feedback-test", email="fb@example.com")
        session.add(user)
        session.flush()

        outfit = Outfit(
            id=new_uuid(),
            user_id=user.id,
            aesthetic="minimalist",
            chromatic_score=0.9,
            embedding_score=0.8,
        )
        session.add(outfit)
        session.commit()

        # Enviar feedback Like (+1)
        resp = client.post(
            f"/api/v1/outfits/{outfit.id}/feedback",
            json={"rating": 1, "feedback_type": "like"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["rating"] == 1
        assert data["feedback_type"] == "like"
        assert data["outfit_id"] == outfit.id

        # Consultar feedback del outfit
        resp_get = client.get(f"/api/v1/outfits/{outfit.id}/feedback")
        assert resp_get.status_code == 200
        assert resp_get.json()["rating"] == 1

        # Cambiar feedback a Dislike (-1)
        resp_update = client.post(
            f"/api/v1/outfits/{outfit.id}/feedback",
            json={"rating": -1, "feedback_type": "dislike"},
        )
        assert resp_update.status_code == 200
        assert resp_update.json()["rating"] == -1

        # Verificar en DB
        fb_db = session.query(OutfitFeedback).filter_by(outfit_id=outfit.id).first()
        assert fb_db is not None
        assert fb_db.rating == -1
    finally:
        session.close()


def test_recommender_disliked_combination_is_excluded():
    """Verifica que combinaciones con dislike sean descartadas del ranking."""
    color_c = [{"h": 0.0, "s": 0.0, "v": 10.0, "hex": "#111111", "mass": 1.0}]
    garments = [
        {"id": "top-1", "position": "top", "colors": color_c, "embedding": [0.1, 0.2], "aesthetic": "casual"},
        {"id": "top-2", "position": "top", "colors": color_c, "embedding": [0.2, 0.3], "aesthetic": "casual"},
        {"id": "bot-1", "position": "bottom", "colors": color_c, "embedding": [0.3, 0.4], "aesthetic": "casual"},
    ]

    # Sin feedback: se recomiendan ambas combinaciones (top-1 + bot-1 y top-2 + bot-1)
    outfits_all = recommend_outfits(garments, limit=10)
    combo_ids = [{g["id"] for g in o["garments"]} for o in outfits_all]
    assert {"top-1", "bot-1"} in combo_ids
    assert {"top-2", "bot-1"} in combo_ids

    # Con dislike a la combinacion top-1 + bot-1: debe descartarse
    outfits_filtered = recommend_outfits(
        garments,
        disliked_combinations=[{"top-1", "bot-1"}],
        limit=10,
    )
    filtered_combo_ids = [{g["id"] for g in o["garments"]} for o in outfits_filtered]
    assert {"top-1", "bot-1"} not in filtered_combo_ids
    assert {"top-2", "bot-1"} in filtered_combo_ids
