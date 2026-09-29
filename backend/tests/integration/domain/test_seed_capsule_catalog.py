"""Seed cápsula (AC gb): build puro + corrida real con cobertura verificada."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "scripts"))

from seed_capsule_catalog import (
    AESTHETICS,
    POSITIONS,
    SeedCoverageError,
    build_seed_rows,
    run,
    verify_coverage,
)


def test_build_cubre_todo() -> None:
    rows = build_seed_rows()
    assert len(rows) == 50
    verify_coverage(rows)


def test_verify_aborta_sin_cobertura() -> None:
    rows = [r for r in build_seed_rows() if r["_position"] != "top"]
    with pytest.raises(SeedCoverageError):
        verify_coverage(rows)


def test_run_inserta_50_con_cobertura(db_url) -> None:
    from sqlalchemy import create_engine

    engine = create_engine(db_url, future=True)
    try:
        n = run(db_url)
        assert n == 50
        with engine.connect() as conn:
            total = conn.execute(text('SELECT count(*) FROM "Garment"')).scalar()
            assert total == 50
            cats = {r[0].split("::")[-1] for r in
                    conn.execute(text('SELECT DISTINCT category FROM "Garment"'))}
            assert {"top", "bottom", "footwear", "outerwear"} <= cats
    finally:
        with engine.begin() as conn:
            conn.execute(text('DELETE FROM "GarmentOwnership"'))
            conn.execute(text('DELETE FROM "Garment"'))
        engine.dispose()


def test_aesthetics_esperadas() -> None:
    assert set(AESTHETICS) == {"Old Money", "Streetwear", "Soft Boy", "Starboy", "Gorpcore"}
    assert set(POSITIONS) == {"top", "bottom", "footwear", "outerwear"}
