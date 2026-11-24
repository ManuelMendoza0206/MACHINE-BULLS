"""Sesion de base de datos y arranque del motor.

SQLite por defecto (demo sin infraestructura), Postgres via `DATABASE_URL`. El
modelo declarativo vive en `domain.models`; aca solo esta el engine y el
dependency-injection de FastAPI.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from domain.models import Base

_kwargs: dict = {"future": True}
if settings.database_url.startswith("sqlite"):
    # check_same_thread=False porque FastAPI sirve requests desde un threadpool
    # y el engine comparte una unica conexion en la demo.
    _kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Reconecta sockets cerrados por idle timeout en poolers remotos (Supabase)
    _kwargs["pool_pre_ping"] = True
    _kwargs["pool_recycle"] = 300

engine = create_engine(settings.database_url, **_kwargs)

if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragma(dbapi_conn, _):  # pragma: no cover - ajuste de runtime
        """Activa foreign keys en SQLite; sin esto los cascade no corren."""
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Crea las tablas si no existen. En Postgres esto lo reemplaza Alembic.

    Migracion liviana para DBs dev viejas: `create_all` no ALTERa tablas ya
    creadas, asi que si faltan columnas nuevas se agregan automaticamente.
    """
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import inspect

    insp = inspect(engine)
    tablas = set(insp.get_table_names())

    if "users" in tablas:
        columnas_users = {c["name"] for c in insp.get_columns("users")}
        if "vton_photo_path" not in columnas_users:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN vton_photo_path VARCHAR(512)"))

    if "vton_jobs" in tablas:
        columnas_vton = {c["name"] for c in insp.get_columns("vton_jobs")}
        if "stage" not in columnas_vton:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE vton_jobs ADD COLUMN stage VARCHAR(30)"))

    if "garments" in tablas:
        columnas_garments = {c["name"] for c in insp.get_columns("garments")}
        if "is_candidate" not in columnas_garments:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE garments ADD COLUMN is_candidate BOOLEAN DEFAULT 0 NOT NULL" if engine.dialect.name == "sqlite" else "ALTER TABLE garments ADD COLUMN is_candidate BOOLEAN DEFAULT FALSE NOT NULL"))
        if "status" not in columnas_garments:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE garments ADD COLUMN status VARCHAR(20) DEFAULT 'AVAILABLE' NOT NULL"))
        if "subcategory" not in columnas_garments:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE garments ADD COLUMN subcategory VARCHAR(50)"))
        if "pattern" not in columnas_garments:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE garments ADD COLUMN pattern VARCHAR(50)"))

    if "outfits" in tablas:
        columnas_outfits = {c["name"] for c in insp.get_columns("outfits")}
        with engine.begin() as conn:
            if "occasion" not in columnas_outfits:
                conn.execute(text("ALTER TABLE outfits ADD COLUMN occasion VARCHAR(50)"))
            if "weather" not in columnas_outfits:
                conn.execute(text("ALTER TABLE outfits ADD COLUMN weather VARCHAR(50)"))
            if "reason" not in columnas_outfits:
                conn.execute(text("ALTER TABLE outfits ADD COLUMN reason TEXT"))


def get_session() -> Iterator[Session]:
    """Dependencia FastAPI: una sesion por request, cerrada siempre."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
