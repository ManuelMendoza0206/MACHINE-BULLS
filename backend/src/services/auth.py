"""Servicio de autenticacion y resolucion de usuario actual (Supabase JWT).

Permite autenticar usuarios a traves de Supabase Auth pasando un token Bearer
en la cabecera `Authorization: Bearer <token>`.

- Los tokens se aceptan solo tras verificar firma/expiracion/audience con JWKS
  o SUPABASE_JWT_SECRET; la excepcion unsigned requiere un flag explícito.
- Sincroniza automaticamente el usuario en la base de datos (tabla users)
  para que sus prendas, outfits y recomendaciones queden asociados a su cuenta real.
- Si no hay token o la cabecera esta ausente:
  - En modo desarrollo/demo, recurre al usuario demo (demo@styleme.test)
    garantizando que tests y endpoints publicos continuen funcionando sin friccion.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from config import settings
from db.session import get_session
from domain.models import User, new_uuid

logger = logging.getLogger(__name__)

DEMO_USER_EMAIL = "demo@styleme.test"


def get_demo_user(session: Session) -> User:
    """Devuelve (creandolo si falta) el usuario demo de la capsule."""
    user = session.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if user is None:
        user = User(id=new_uuid(), email=DEMO_USER_EMAIL)
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def get_or_create_user(session: Session, user_id: str, email: str) -> User:
    """Busca o crea un usuario sincronizado desde Supabase Auth."""
    user = session.query(User).filter(User.id == user_id).first()
    if user is None:
        # Never attach a new auth subject to an existing account solely by email.
        user = session.query(User).filter(User.email == email).first()
        if user is not None:
            raise HTTPException(status_code=401, detail="El email ya está asociado a otra identidad")
        user = User(id=user_id, email=email)
        session.add(user)
        session.commit()
        session.refresh(user)
        logger.info("Usuario sincronizado desde Supabase Auth: id=%s email=%s", user_id, email)
    return user


_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient | None:
    """Retorna un cliente JWKS cacheado para Supabase Auth si SUPABASE_URL esta configurado."""
    global _jwks_client
    if _jwks_client is None and settings.supabase_url:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16)
    return _jwks_client


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Decodifica y valida un token JWT emitido por Supabase (asimetrico ES256/RS256 o simetrico HS256)."""
    try:
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Formato de token invalido",
            ) from exc

        # 1. Tokens emitidos por Supabase con algoritmo asimetrico (ES256 o RS256)
        if alg in ("ES256", "RS256"):
            jwks_client = get_jwks_client()
            if jwks_client:
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                return jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256", "RS256"],
                    audience="authenticated",
                )
            if settings.allow_unverified_jwt:
                logger.warning("Aceptando JWT sin firma por ALLOW_UNVERIFIED_JWT explícito")
                return jwt.decode(
                    token,
                    audience="authenticated",
                    options={"verify_signature": False, "verify_exp": True, "verify_aud": True},
                )
            raise HTTPException(status_code=401, detail="No hay configuración JWKS para validar el token")

        # 2. Tokens con HS256 (tests o supabase legacy con secret simetrico)
        if settings.supabase_jwt_secret:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        if settings.allow_unverified_jwt:
            logger.warning("Aceptando JWT sin firma por ALLOW_UNVERIFIED_JWT explícito")
            return jwt.decode(
                token,
                audience="authenticated",
                options={"verify_signature": False, "verify_exp": True, "verify_aud": True},
            )
        raise HTTPException(status_code=401, detail="No hay clave configurada para validar el token")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token JWT invalido",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        # JWKS/network/configuration errors must fail closed, never downgrade to
        # decoding an unsigned token.
        logger.warning("No se pudo validar JWT con JWKS: %s", exc)
        raise HTTPException(status_code=401, detail="No se pudo validar la firma del token") from exc


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: Annotated[Session, Depends(get_session)] = None,
) -> User:
    """Dependencia FastAPI que resuelve el usuario actual a partir del Bearer token o demo."""
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Esquema de autenticación inválido")
        token = authorization.split("Bearer ", 1)[1].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Token Bearer vacío")
        payload = decode_supabase_token(token)
        user_id = payload.get("sub")
        email = payload.get("email") or f"{user_id}@supabase.user"
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sin sub (user_id)",
            )
        return get_or_create_user(session, user_id=str(user_id), email=str(email))

    if settings.allow_demo_auth:
        return get_demo_user(session)
    raise HTTPException(status_code=401, detail="Autenticación requerida")
