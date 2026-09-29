"""Fixtures de integración (spec §4): Postgres pgvector en testcontainers
con tabla auth.users SIMULADA (la imagen no trae el schema auth de Supabase).

Cada test corre en transacción con rollback: la BD se reusa sin ensuciarse.
"""

from __future__ import annotations

import os
import uuid

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
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
    """DDL de una sentencia por vez (psycopg no acepta bloques DO multi-sentencia)."""
    conn.execute(text(AUTH_SCHEMA_SQL))
    conn.execute(text(AUTH_USERS_SQL))
    # Roles que Supabase trae de fábrica y nuestras policies referencian.
    existentes = {r[0] for r in conn.execute(text("SELECT rolname FROM pg_roles"))}
    for rol in ("anon", "authenticated"):
        if rol not in existentes:
            conn.execute(text(f"CREATE ROLE {rol} NOLOGIN"))
    conn.execute(text(AUTH_UID_SQL))


def _normalize_url(url: str) -> str:
    return url.replace("postgresql+psycopg2://", "postgresql+psycopg://").replace(
        "postgresql://", "postgresql+psycopg://"
    )


def make_migrated_db_url() -> tuple[str, object]:
    """Levanta contenedor, crea auth simulado y aplica upgrade head. Devuelve (url, container)."""
    container = PostgresContainer(IMAGE, username="postgres", password="postgres", dbname="test")
    container.start()
    url = _normalize_url(container.get_connection_url())
    engine = create_engine(url, future=True)
    with engine.begin() as conn:
        _bootstrap_auth(conn)
    _alembic_upgrade(url)
    engine.dispose()
    return url, container


def _alembic_upgrade(url: str) -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(here)))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    os.environ["DATABASE_URL"] = url
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def db_url():
    url, container = make_migrated_db_url()
    yield url
    container.stop()


@pytest.fixture(scope="session")
def migrated_engine(db_url):
    engine = create_engine(db_url, future=True)
    yield engine
    engine.dispose()


@pytest.fixture()
def db(migrated_engine):
    conn = migrated_engine.connect()
    trans = conn.begin()
    session = Session(bind=conn)
    yield session
    session.close()
    trans.rollback()
    conn.close()


@pytest.fixture()
def auth_user(db):
    """Crea un auth.users simulado y devuelve su id (con rollback del fixture db)."""
    uid = uuid.uuid4()
    db.execute(
        text("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (:id, :email, :meta)"),
        {"id": str(uid), "email": f"u-{uid.hex[:8]}@x.com", "meta": '{"name": "Test"}'},
    )
    return uid
