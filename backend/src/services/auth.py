"""Servicio de autenticacion y resolucion de usuario actual (Supabase JWT).

Permite autenticar usuarios a traves de Supabase Auth pasando un token Bearer
en la cabecera `Authorization: Bearer <token>`.

- Si hay un token valido, decodifica el payload (verificando firma si
  SUPABASE_JWT_SECRET esta configurado, o extrayendo sub/email).
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
from jwt import PyJWKClient, PyJWKClientError
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
        # Tambien verificar si ya existe por email para evitar colision
        user = session.query(User).filter(User.email == email).first()
        if user is None:
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
                try:
                    signing_key = jwks_client.get_signing_key_from_jwt(token)
                    return jwt.decode(
                        token,
                        signing_key.key,
                        algorithms=["ES256", "RS256"],
                        audience="authenticated",
                    )
                except PyJWKClientError as err:
                    logger.warning("Error resolviendo JWKS de Supabase (%s), aplicando fallback dev", err)
            # Fallback en caso de entorno offline/test local
            return jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True},
            )

        # 2. Tokens con HS256 (tests o supabase legacy con secret simetrico)
        if settings.supabase_jwt_secret:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        # 3. Fallback dev/local sin secret
        return jwt.decode(token, options={"verify_signature": False, "verify_exp": True})
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


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: Annotated[Session, Depends(get_session)] = None,
) -> User:
    """Dependencia FastAPI que resuelve el usuario actual a partir del Bearer token o demo."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        if token:
            payload = decode_supabase_token(token)
            user_id = payload.get("sub")
            email = payload.get("email") or f"{user_id}@supabase.user"
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token sin sub (user_id)",
                )
            return get_or_create_user(session, user_id=str(user_id), email=str(email))

    # Fallback transparente para desarrollo / demo / tests
    return get_demo_user(session)
