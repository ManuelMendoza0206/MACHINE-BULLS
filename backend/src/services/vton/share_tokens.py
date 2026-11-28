"""Generación y verificación de tokens firmados sin estado para compartir y descargar resultados VTON."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import HTTPException, status

from config import settings

logger = logging.getLogger(__name__)

_SHARE_ALGORITHM = "HS256"
# Solo desarrollo local: permite que los enlaces sobrevivan reinicios del
# backend sin exigir configuracion. Nunca se usa en produccion.
_DEV_FALLBACK_SECRET = "styleme-vton-share-dev-only-secret-key-32bytes!!"


def _get_signing_key() -> str:
    """Clave secreta para firmar tokens de comparticion.

    Orden: secreto dedicado -> secreto JWT de Supabase -> fallback de desarrollo.
    En produccion, la ausencia de los dos primeros es un error de configuracion.
    """
    if settings.vton_share_secret and len(settings.vton_share_secret) >= 32:
        return settings.vton_share_secret
    if settings.supabase_jwt_secret and len(settings.supabase_jwt_secret) >= 32:
        return settings.supabase_jwt_secret
    if settings.environment.lower() in {"production", "prod"}:
        raise RuntimeError(
            "VTON_SHARE_SECRET o SUPABASE_JWT_SECRET (>=32 caracteres) es obligatorio en produccion."
        )
    logger.warning(
        "Usando secreto de desarrollo para tokens de compartir; "
        "configura VTON_SHARE_SECRET antes de desplegar."
    )
    return _DEV_FALLBACK_SECRET


def generate_share_token(job_id: str, user_id: str, ttl_hours: int = 24) -> str:
    """Genera un token JWT firmado de un solo uso o temporal para compartir un look."""
    now = datetime.now(UTC)
    payload = {
        "job_id": job_id,
        "user_id": user_id,
        "type": "vton_share",
        "iat": now,
        "exp": now + timedelta(hours=ttl_hours),
    }
    return jwt.encode(payload, _get_signing_key(), algorithm=_SHARE_ALGORITHM)


def verify_share_token(token: str) -> dict[str, Any]:
    """Verifica la firma y expiración del token de compartición."""
    try:
        payload = jwt.decode(
            token,
            _get_signing_key(),
            algorithms=[_SHARE_ALGORITHM],
            options={"verify_signature": True, "verify_exp": True},
        )
        if payload.get("type") != "vton_share":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de token inválido para este recurso.",
            )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El enlace de compartición ha expirado.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de compartición inválido o firma alterada.",
        ) from exc
