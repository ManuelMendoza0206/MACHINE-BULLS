"""Tests unitarios para la purga automatica de fotos humanas (>24h)."""

from __future__ import annotations

import os
import time
from datetime import UTC
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


def test_purge_azure_human_blobs_respects_ttl_and_demand(tmp_path: Path, monkeypatch) -> None:
    """Verifica purga selectiva (>24h) y purga total bajo demanda en Azure Blob Storage."""
    import dataclasses
    from datetime import datetime, timedelta

    now = datetime.now(UTC)
    blob_old = MagicMock(name="humanos/old.jpg", last_modified=now - timedelta(hours=26))
    blob_old.name = "humanos/old.jpg"
    blob_new = MagicMock(name="humanos/new.jpg", last_modified=now - timedelta(hours=2))
    blob_new.name = "humanos/new.jpg"

    mock_container = MagicMock()
    mock_container.list_blobs.return_value = [blob_old, blob_new]

    cfg = dataclasses.replace(
        base_settings,
        media_dir=tmp_path,
        azure_storage_connection_string="DefaultEndpointsProtocol=https;AccountName=test;...",
    )
    monkeypatch.setattr(storage, "settings", cfg)
    monkeypatch.setattr(storage, "ensure_azure_container", lambda: mock_container)

    eliminados_ttl = storage.purge_expired_human_photos(max_age_hours=24.0)
    assert eliminados_ttl == ["old.jpg"]
    mock_container.delete_blob.assert_called_once_with("humanos/old.jpg")

    mock_container.delete_blob.reset_mock()
    eliminados_all = storage.purge_all_human_photos()
    assert eliminados_all == ["old.jpg", "new.jpg"]
    assert mock_container.delete_blob.call_count == 2
