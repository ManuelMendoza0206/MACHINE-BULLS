"""Aplica las migraciones SQL de backend/migrations/ contra Postgres/Supabase.

Uso:
    cd backend && uv run python scripts/apply_migrations.py
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_SRC_DIR = _BACKEND_DIR / "src"
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

import psycopg

from config import settings


def migration_actions(
    migrations: dict[str, str],
    applied: dict[str, str],
    *,
    legacy_state: str,
) -> list[tuple[str, str, str]]:
    """Planifica apply/adopt y valida checksums antes de ejecutar cualquier SQL."""
    if legacy_state not in {"empty", "complete", "partial"}:
        raise ValueError(f"Estado de esquema desconocido: {legacy_state}")
    if legacy_state == "partial" and not applied:
        raise RuntimeError("El esquema Postgres existente está incompleto; no se modifica automáticamente")

    for version, checksum in applied.items():
        current = migrations.get(version)
        if current is None:
            raise RuntimeError(f"La base registra una migración que ya no existe: {version}")
        if current != checksum:
            raise RuntimeError(f"checksum distinto para migración aplicada {version}")

    if legacy_state == "complete" and not applied:
        return [("adopt", version, checksum) for version, checksum in migrations.items()]
    return [
        ("apply", version, checksum)
        for version, checksum in migrations.items()
        if version not in applied
    ]


def _checksum(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


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

    contents = {path.name: path.read_text(encoding="utf-8") for path in sql_files}
    checksums = {name: _checksum(sql) for name, sql in contents.items()}
    applied_now: list[str] = []
    with psycopg.connect(conn_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT pg_advisory_lock(hashtext('styleme:migrations'));")
        if os.environ.get("DB_MODE", "supabase").strip().lower() == "local":
            cur.execute(
                """
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                        CREATE ROLE authenticated NOLOGIN;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                        CREATE ROLE anon NOLOGIN;
                    END IF;
                END $$;
                CREATE SCHEMA IF NOT EXISTS auth;
                CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
                LANGUAGE sql STABLE AS $$
                    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
                $$;
                """
            )
            conn.commit()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                checksum VARCHAR(64),
                applied_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
            );
            """
        )
        cur.execute("ALTER TABLE public.schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);")
        conn.commit()

        cur.execute("SELECT version, checksum FROM public.schema_migrations;")
        recorded = {row[0]: row[1] for row in cur.fetchall()}
        # Compatibilidad segura con la tabla creada por el runner anterior.
        # Checksums ausentes se fijan al SQL actual una sola vez.
        for version, checksum in list(recorded.items()):
            if checksum is None and version in checksums:
                cur.execute(
                    "UPDATE public.schema_migrations SET checksum = %s WHERE version = %s",
                    (checksums[version], version),
                )
                recorded[version] = checksums[version]
        conn.commit()

        cur.execute(
            """SELECT table_name FROM information_schema.tables
               WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"""
        )
        existing_tables = {row[0] for row in cur.fetchall()}
        required_legacy_tables = {
            "users", "garments", "outfits", "vton_jobs", "garment_ownerships",
            "outfit_garments", "outfit_feedbacks", "outfit_usage_logs", "outfit_plans",
        }
        required_legacy_columns = {
            "garments": {"is_candidate", "status"},
            "outfits": {"occasion", "weather", "reason"},
        }
        legacy_columns_ok = True
        for table_name, required in required_legacy_columns.items():
            cur.execute(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = %s""",
                (table_name,),
            )
            legacy_columns_ok &= required.issubset({row[0] for row in cur.fetchall()})
        if recorded or not existing_tables:
            legacy_state = "empty"
        elif required_legacy_tables.issubset(existing_tables) and legacy_columns_ok:
            legacy_state = "complete"
        else:
            legacy_state = "partial"
        actions = migration_actions(checksums, recorded, legacy_state=legacy_state)

        for action, version, checksum in actions:
            if action == "adopt":
                cur.execute(
                    "INSERT INTO public.schema_migrations (version, checksum) VALUES (%s, %s)",
                    (version, checksum),
                )
                conn.commit()
                print(f"[ADOPT] {version} (esquema legado validado)")
                continue
            sql = contents[version]
            print(f"[RUN ] Aplicando {version}...")
            try:
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO public.schema_migrations (version, checksum) VALUES (%s, %s);",
                    (version, checksum),
                )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
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
