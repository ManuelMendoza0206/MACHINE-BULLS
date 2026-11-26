"""Tests unitarios para la generación y validación de tokens firmados de VTON."""

from __future__ import annotations

import dataclasses

import pytest
from fastapi import HTTPException

from services.vton import share_tokens
from services.vton.share_tokens import generate_share_token, verify_share_token


def test_generate_and_verify_valid_share_token() -> None:
    token = generate_share_token("job-123", "user-456", ttl_hours=1)
    assert isinstance(token, str)

    payload = verify_share_token(token)
    assert payload["job_id"] == "job-123"
    assert payload["user_id"] == "user-456"
    assert payload["type"] == "vton_share"


def test_verify_tampered_share_token_fails() -> None:
    token = generate_share_token("job-123", "user-456", ttl_hours=1)
    tampered = token[:-4] + "abcd"

    with pytest.raises(HTTPException) as exc_info:
        verify_share_token(tampered)
    assert exc_info.value.status_code == 401


def test_verify_expired_share_token_fails() -> None:
    token = generate_share_token("job-123", "user-456", ttl_hours=-1)

    with pytest.raises(HTTPException) as exc_info:
        verify_share_token(token)
    assert exc_info.value.status_code == 410


def test_production_requires_explicit_share_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    prod_settings = dataclasses.replace(
        share_tokens.settings,
        environment="production",
        vton_share_secret=None,
        supabase_jwt_secret=None,
    )
    monkeypatch.setattr(share_tokens, "settings", prod_settings)

    with pytest.raises(RuntimeError, match="VTON_SHARE_SECRET"):
        generate_share_token("job-123", "user-456")
