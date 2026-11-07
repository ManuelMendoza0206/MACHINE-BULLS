"""Tests unitarios para la purga automatica de fotos humanas (>24h)."""

from __future__ import annotations

import os
import time
from pathlib import Path
from unittest.mock import MagicMock

from config import settings as base_settings
from services import storage


def test_purge_expired_human_photos(tmp_path: Path, monkeypatch) -> None:
    """Verifica que las fotos de mas de 24 horas se eliminen y las recientes se conserven."""
    humanos_dir = tmp_path / "humanos"
    humanos_dir.mkdir(parents=True)

    foto_vieja = humanos_dir / "persona_ayer.jpg"
    foto_vieja.write_bytes(b"vieja-foto-pose-a")

    foto_nueva = humanos_dir / "persona_reciente.jpg"
    foto_nueva.write_bytes(b"nueva-foto-pose-a")

    # Modificar mtime de la foto vieja a 25 horas atras
    ahora = time.time()
    tiempo_hace_25h = ahora - (25 * 3600)
    os.utime(foto_vieja, (tiempo_hace_25h, tiempo_hace_25h))
    os.utime(foto_nueva, (ahora, ahora))

    eliminados = storage.purge_expired_human_photos(max_age_hours=24.0, base_dir=tmp_path)

    assert "persona_ayer.jpg" in eliminados
    assert "persona_reciente.jpg" not in eliminados
    assert not foto_vieja.exists()
    assert foto_nueva.exists()


def test_purge_expired_human_photos_directory_not_exists(tmp_path: Path) -> None:
    """Si el directorio de humanos no existe, debe retornar lista vacia sin fallar."""
    inexistente = tmp_path / "no_existe"
    eliminados = storage.purge_expired_human_photos(max_age_hours=24.0, base_dir=inexistente)
    assert eliminados == []
