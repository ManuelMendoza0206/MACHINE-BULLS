"""Simetría de migraciones (AC fy): upgrade→downgrade→upgrade sin error,
dos ciclos (idempotencia). Contenedor propio: el downgrade a base no debe
ensuciar la BD compartida de los demás tests."""

from __future__ import annotations

import os

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from testcontainers.community.postgres import PostgresContainer

from alembic import command

IMAGE = "pgvector/pgvector:pg16"

AUTH_SCHEMA_SQL = "CREATE SCHEMA IF NOT EXISTS auth"
AUTH_USERS_SQL = (
    "CREATE TABLE IF NOT EXISTS auth.users ("
    "id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, "
    "created_at timestamptz DEFAULT now())"
)
# Stub mínimo de auth.uid() (en Supabase real existe; acá solo se necesita
# que exista para crear las policies — los tests corren como superuser).
AUTH_UID_SQL = (
    "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid "
    "LANGUAGE sql STABLE AS 'SELECT NULL::uuid'"
)


def _bootstrap_auth(conn) -> None:
    # Una sentencia por vez: psycopg no acepta bloques DO multi-sentencia.
    conn.execute(text(AUTH_SCHEMA_SQL))
    conn.execute(text(AUTH_USERS_SQL))
    existentes = {r[0] for r in conn.execute(text("SELECT rolname FROM pg_roles"))}
    for rol in ("anon", "authenticated"):
        if rol not in existentes:
            conn.execute(text(f"CREATE ROLE {rol} NOLOGIN"))
    conn.execute(text(AUTH_UID_SQL))


def _normalize_url(url: str) -> str:
    return url.replace("postgresql+psycopg2://", "postgresql+psycopg://").replace(
        "postgresql://", "postgresql+psycopg://"
    )

EXPECTED_TABLES = {"User", "Garment", "GarmentOwnership", "Outfit", "OutfitGarment", "VTONJob"}


@pytest.fixture(scope="module")
def bare_url():
    with PostgresContainer(IMAGE, username="postgres", password="postgres", dbname="test") as pg:
        url = _normalize_url(pg.get_connection_url())
        engine = create_engine(url, future=True)
        with engine.begin() as conn:
            _bootstrap_auth(conn)
        engine.dispose()
        yield url


def _cfg(url: str) -> Config:
    here = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(here)))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    os.environ["DATABASE_URL"] = url
    return cfg


def _tables(url: str) -> set[str]:
    engine = create_engine(url, future=True)
    try:
        return set(inspect(engine).get_table_names(schema="public"))
    finally:
        engine.dispose()


def test_upgrade_downgrade_upgrade_idempotente(bare_url) -> None:
    cfg = _cfg(bare_url)
    command.upgrade(cfg, "head")
    assert EXPECTED_TABLES <= _tables(bare_url)
    command.downgrade(cfg, "base")
    assert not (EXPECTED_TABLES & _tables(bare_url))
    command.upgrade(cfg, "head")
    assert EXPECTED_TABLES <= _tables(bare_url)
    command.downgrade(cfg, "base")
    assert not (EXPECTED_TABLES & _tables(bare_url))
