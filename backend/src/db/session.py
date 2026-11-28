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
    """Inicializa SQLite de demo; Postgres se modifica solo con SQL versionado."""
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
        return

    with engine.connect() as conn:
        has_history = conn.execute(
            text("SELECT to_regclass('public.schema_migrations') IS NOT NULL")
        ).scalar_one()
    if not has_history:
        raise RuntimeError(
            "Postgres no tiene schema_migrations. Ejecuta scripts/apply_migrations.py antes de iniciar la API."
        )


def get_session() -> Iterator[Session]:
    """Dependencia FastAPI: una sesion por request, cerrada siempre."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
