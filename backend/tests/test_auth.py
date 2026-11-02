"""Tests unitarios para la autenticacion y validacion de JWT de Supabase."""

from __future__ import annotations

import dataclasses
import time
from typing import Any

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import settings
from db.session import SessionLocal, init_db
from domain.models import User
from services.auth import decode_supabase_token, get_current_user


def _generar_token(payload: dict[str, Any], secret: str | None = None) -> str:
    key = secret or settings.supabase_jwt_secret or "unverified-secret"
    return jwt.encode(payload, key, algorithm="HS256")


def test_get_current_user_fallback_demo() -> None:
    """Sin cabecera Authorization devuelve el usuario demo."""
    init_db()
    session = SessionLocal()
    try:
        user = get_current_user(authorization=None, session=session)
        assert user is not None
        assert user.email == "demo@styleme.test"
    finally:
        session.close()


def test_get_current_user_con_token_valido() -> None:
    """Con token Bearer valido sincroniza el usuario con su UUID y email."""
    init_db()
    session = SessionLocal()
    try:
        token = _generar_token({
            "sub": "user-supabase-1234",
            "email": "jaicel@styleme.test",
            "role": "authenticated",
            "aud": "authenticated",
            "exp": time.time() + 3600,
        })
        user = get_current_user(authorization=f"Bearer {token}", session=session)

        assert user.id == "user-supabase-1234"
        assert user.email == "jaicel@styleme.test"

        # Verificar que persiste en BD
        en_bd = session.get(User, "user-supabase-1234")
        assert en_bd is not None
        assert en_bd.email == "jaicel@styleme.test"
    finally:
        session.close()


def test_decode_token_expirado_lanza_401(monkeypatch: Any) -> None:
    """Un token expirado lanza 401 Unauthorized."""
    cfg = dataclasses.replace(settings, supabase_jwt_secret="mi-secreto-test")
    monkeypatch.setattr("services.auth.settings", cfg)
    token = _generar_token(
        {
            "sub": "u1",
            "email": "u1@test.com",
            "aud": "authenticated",
            "exp": time.time() - 100,
        },
        secret="mi-secreto-test",
    )
    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token)
    assert exc_info.value.status_code == 401
    assert "expirado" in exc_info.value.detail.lower()


def test_api_me_devuelve_usuario_autenticado(client: TestClient) -> None:
    """GET /api/v1/me devuelve los datos del token en vez del usuario demo."""
    token = _generar_token({
        "sub": "real-user-id-5555",
        "email": "jaicel.real@ucb.edu.bo",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": time.time() + 3600,
    })
    resp = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    datos = resp.json()
    assert datos["user_id"] == "real-user-id-5555"
    assert datos["email"] == "jaicel.real@ucb.edu.bo"
