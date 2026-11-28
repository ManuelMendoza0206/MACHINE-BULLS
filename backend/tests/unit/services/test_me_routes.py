"""Tests unitarios para el router `/api/v1/me` y purga por privacidad."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_me_returns_demo_user():
    resp = client.get("/api/v1/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"]
    assert "@" in body["email"]


def test_me_purge_photos_endpoint():
    with patch("api.me.storage.purge_user_human_photos", return_value=["a.jpg", "b.jpg"]):
        resp = client.post("/api/v1/me/purge-photos")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["purged_count"] == 2
