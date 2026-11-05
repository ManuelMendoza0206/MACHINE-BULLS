"""Pruebas de Cobertura de Seed del Catálogo Cápsula (domain-and-database spec §2.3 + §Requirement)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Permitir importar scripts directamente
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from seed_capsule_catalog import (
    AESTHETICS,
    POSITIONS,
    SeedCoverageError,
    build_seed_rows,
    run,
    verify_coverage,
)

from domain.models import Base, Garment


def test_positions_and_aesthetics_expected() -> None:
    """Verifica que las constantes cumplan exactamente la especificacion de dominio."""
    assert set(POSITIONS) == {"top", "bottom", "footwear", "outerwear"}
    assert set(AESTHETICS) == {"Old Money", "Streetwear", "Soft Boy", "Starboy", "Gorpcore"}


def test_build_seed_rows_generates_50_items() -> None:
    """Verifica que el generador produzca exactamente 50 prendas."""
    rows = build_seed_rows(seed=42)
    assert len(rows) == 50


def test_verify_coverage_passes_on_full_catalog() -> None:
    """Verifica que el catalogo generado cumpla toda la cobertura posicional y estetica."""
    rows = build_seed_rows(seed=42)
    # No debe lanzar SeedCoverageError
    verify_coverage(rows)


def test_verify_coverage_aborts_on_missing_position() -> None:
    """Verifica que falte una posicion aborte el seed con SeedCoverageError."""
    rows = [r for r in build_seed_rows() if r["_position"] != "footwear"]
    with pytest.raises(SeedCoverageError) as exc_info:
        verify_coverage(rows)
    assert "footwear" in str(exc_info.value)


def test_verify_coverage_aborts_on_missing_aesthetic() -> None:
    """Verifica que falte una estetica aborte el seed con SeedCoverageError."""
    rows = [r for r in build_seed_rows() if r["_aesthetic"] != "Gorpcore"]
    with pytest.raises(SeedCoverageError) as exc_info:
        verify_coverage(rows)
    assert "Gorpcore" in str(exc_info.value)


def test_seed_execution_persists_in_database() -> None:
    """Verifica ejecucion del seed en base de datos con session aislada."""
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        inserted = run(session=session)
        assert inserted == 50

        total_garments = session.query(Garment).count()
        assert total_garments == 50

        # Todas las prendas capsula deben tener owner_id = None
        capsule_garments = session.query(Garment).filter(Garment.owner_id.is_(None)).all()
        assert len(capsule_garments) == 50

        # Verificar presencia de las 4 posiciones en la BD
        positions_in_db = {g.position for g in capsule_garments}
        assert positions_in_db == {"top", "bottom", "footwear", "outerwear"}
