"""Aplica las migraciones SQL de backend/migrations/ contra Postgres/Supabase.

Uso:
    cd backend && uv run python scripts/apply_migrations.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_SRC_DIR = _BACKEND_DIR / "src"
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

import psycopg

from config import settings


def _normalize_psycopg_url(url: str) -> str:
    """Convierte URLs SQLAlchemy (`postgresql+psycopg://`) al formato nativo de psycopg."""
    if url.startswith("postgresql+psycopg://"):
        return "postgresql://" + url[len("postgresql+psycopg://") :]
    return url


def apply_migrations(database_url: str | None = None, migrations_dir: Path | None = None) -> list[str]:
    """Ejecuta en orden los archivos .sql pendientes y los registra en schema_migrations."""
    raw_url = database_url or os.environ.get("DATABASE_URL") or settings.database_url
    if not raw_url.startswith("postgres"):
        raise RuntimeError(
            f"apply_migrations requiere Postgres/Supabase (DATABASE_URL actual: {raw_url!r})"
        )

    conn_url = _normalize_psycopg_url(raw_url)
    mig_dir = migrations_dir or (_BACKEND_DIR / "migrations")
    sql_files = sorted(mig_dir.glob("*.sql"))
    if not sql_files:
        return []

    applied_now: list[str] = []
    with psycopg.connect(conn_url) as conn, conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
            );
            ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
            """
        )
        conn.commit()

        cur.execute("SELECT version FROM public.schema_migrations;")
        already_applied = {row[0] for row in cur.fetchall()}

        for sql_file in sql_files:
            version = sql_file.name
            if version in already_applied:
                print(f"[SKIP] {version} (ya aplicada)")
                continue

            sql = sql_file.read_text(encoding="utf-8")
            print(f"[RUN ] Aplicando {version}...")
            cur.execute(sql)
            cur.execute(
                "INSERT INTO public.schema_migrations (version) VALUES (%s);",
                (version,),
            )
            conn.commit()
            applied_now.append(version)
            print(f"[OK  ] {version} aplicada correctamente")

    return applied_now


def main() -> int:
    try:
        applied = apply_migrations()
        print(f"Migraciones finalizadas. Nuevas aplicadas: {len(applied)}")
        return 0
    except (psycopg.Error, OSError, RuntimeError, ValueError) as exc:
        print(f"[ERR] Error aplicando migraciones: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
