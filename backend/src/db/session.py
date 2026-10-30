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
    creadas, asi que si falta la columna `stage` de VtonJob (agregada con la
    cola ARQ del spec 4.1.8) se agrega a mano. Cuando exista Alembic real,
    esta parte se va.
    """
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import inspect

    columnas = {c["name"] for c in inspect(engine).get_columns("vton_jobs")}
    if "stage" not in columnas:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE vton_jobs ADD COLUMN stage VARCHAR(30)"))


def get_session() -> Iterator[Session]:
    """Dependencia FastAPI: una sesion por request, cerrada siempre."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
