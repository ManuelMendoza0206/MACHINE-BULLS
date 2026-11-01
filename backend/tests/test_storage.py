"""Tests unitarios para el servicio de almacenamiento (local y Azure Blob Storage)."""

from __future__ import annotations

import dataclasses
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

from config import settings as base_settings
from services import storage


def test_save_image_local_fallback(tmp_path: Path, monkeypatch: Any) -> None:
    """Sin connection string de Azure, guarda localmente y mapea carpetas a espanol."""
    cfg = dataclasses.replace(
        base_settings,
        media_dir=tmp_path,
        azure_storage_connection_string=None,
        azure_storage_public_url_base=None,
    )
    monkeypatch.setattr(storage, "settings", cfg)

    contenido = b"fake-garment-content"
    rel, url = storage.save_image(contenido, "garments", "jpg")

    assert rel.startswith("prendas/")
    assert rel.endswith(".jpg")
    assert (tmp_path / rel).is_file()
    assert (tmp_path / rel).read_bytes() == contenido
    assert "/media/prendas/" in url


def test_read_bytes_local(tmp_path: Path, monkeypatch: Any) -> None:
    """Lee bytes correctamente de cache local."""
    cfg = dataclasses.replace(
        base_settings,
        media_dir=tmp_path,
        azure_storage_connection_string=None,
    )
    monkeypatch.setattr(storage, "settings", cfg)

    contenido = b"human-pose-bytes"
    rel, _ = storage.save_image(contenido, "humans", "png")

    assert rel.startswith("humanos/")
    leido = storage.read_bytes(rel)
    assert leido == contenido


def test_save_image_azure_blob_upload(tmp_path: Path, monkeypatch: Any) -> None:
    """Con connection string de Azure, sube el blob al contenedor styleme."""
    mock_blob_client = MagicMock()
    mock_container = MagicMock()
    mock_container.exists.return_value = True
    mock_container.get_blob_client.return_value = mock_blob_client

    mock_service_client = MagicMock()
    mock_service_client.primary_endpoint = "https://stylemestorage.blob.core.windows.net"
    mock_service_client.get_container_client.return_value = mock_container

    monkeypatch.setattr(storage, "get_blob_service_client", lambda: mock_service_client)

    cfg = dataclasses.replace(
        base_settings,
        media_dir=tmp_path,
        azure_storage_connection_string="DefaultEndpointsProtocol=https;AccountName=test;...",
        azure_storage_container_name="styleme",
        azure_storage_public_url_base=None,
    )
    monkeypatch.setattr(storage, "settings", cfg)

    contenido = b"vton-result-image"
    rel, url = storage.save_image(contenido, "vton", "png")

    assert rel.startswith("probador/")
    assert (tmp_path / rel).is_file()
    mock_container.get_blob_client.assert_called_with(rel)
    mock_blob_client.upload_blob.assert_called_once()
    assert url == f"https://stylemestorage.blob.core.windows.net/styleme/{rel}"


def test_url_for_con_azure_cdn(monkeypatch: Any) -> None:
    """Si se configura AZURE_STORAGE_PUBLIC_URL_BASE (CDN), se usa como origen de la URL."""
    cfg = dataclasses.replace(
        base_settings,
        azure_storage_connection_string="DefaultEndpointsProtocol=https;AccountName=test;...",
        azure_storage_container_name="styleme",
        azure_storage_public_url_base="https://styleme-cdn.azureedge.net",
    )
    monkeypatch.setattr(storage, "settings", cfg)

    url = storage.url_for("prendas/abc.jpg")
    assert url == "https://styleme-cdn.azureedge.net/prendas/abc.jpg"
