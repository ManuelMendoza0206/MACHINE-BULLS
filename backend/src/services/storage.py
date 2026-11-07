"""Almacenamiento de imagenes en Azure Blob Storage con fallback local.

Soporta dos modos de operacion:
1. Modo Azure Blob Storage (produccion / suscripcion Azure de estudiantes):
   Guarda en un contenedor unico (`styleme`) bajo carpetas virtuales en espanol:
   - `prendas/`: imagenes crudas subidas y PNGs recortados sin fondo.
   - `probador/`: imagenes generadas por la IA CatVTON.
   - `humanos/`: fotos de usuarios en A-Pose.
   Las URLs publicas devueltas apuntan a Azure Blob Storage o Azure CDN.
2. Modo Local (desarrollo rapido, tests unitarios y CI):
   Si `AZURE_STORAGE_CONNECTION_STRING` no esta seteada, guarda en `settings.media_dir`
   y sirve via StaticFiles de FastAPI.
"""

from __future__ import annotations

import logging
import time
import uuid
from pathlib import Path
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

# Mapeo de subcarpetas en ingles heredadas del MVP a prefijos en espanol limpios
FOLDER_MAP: dict[str, str] = {
    "garments": "prendas",
    "humans": "humanos",
    "vton": "probador",
}

_blob_service_client: Any = None


def get_blob_service_client() -> Any:
    """Singleton perezoso del cliente de Azure Blob Storage."""
    global _blob_service_client
    if _blob_service_client is None and settings.azure_storage_connection_string:
        try:
            from azure.storage.blob import BlobServiceClient

            _blob_service_client = BlobServiceClient.from_connection_string(
                settings.azure_storage_connection_string
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo inicializar Azure BlobServiceClient: %s", exc)
            return None
    return _blob_service_client


def ensure_azure_container(container_name: str | None = None) -> Any:
    """Asegura la existencia del contenedor en Azure con acceso publico a blobs."""
    client = get_blob_service_client()
    if client is None:
        return None
    name = container_name or settings.azure_storage_container_name
    container_client = client.get_container_client(name)
    try:
        if not container_client.exists():
            from azure.storage.blob import PublicAccess

            container_client.create_container(public_access=PublicAccess.Blob)
            logger.info("Contenedor Azure creado con acceso publico a blobs: %s", name)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo al verificar/crear contenedor Azure (%s): %s", name, exc)
    return container_client


def save_image(content: bytes, subfolder: str, ext: str = "jpg") -> tuple[str, str]:
    """Guarda bytes y devuelve (path_relativo, url_publica).

    Guarda copia en cache local de disco y, si Azure esta configurado, sube
    el blob al contenedor configurado con su Content-Type correcto.
    """
    carpeta = FOLDER_MAP.get(subfolder, subfolder)
    nombre = f"{uuid.uuid4().hex}.{ext}"
    relativo = f"{carpeta}/{nombre}"

    # Cache local en disco
    destino_dir = settings.media_dir / carpeta
    destino_dir.mkdir(parents=True, exist_ok=True)
    destino = destino_dir / nombre
    destino.write_bytes(content)

    # Subida a Azure Blob Storage si esta disponible
    if settings.azure_storage_connection_string:
        try:
            from azure.storage.blob import ContentSettings

            container = ensure_azure_container()
            if container is not None:
                blob_client = container.get_blob_client(relativo)
                mime = "image/png" if ext.lower() == "png" else "image/jpeg"
                blob_client.upload_blob(
                    content,
                    overwrite=True,
                    content_settings=ContentSettings(content_type=mime),
                )
                url = url_for(relativo)
                return relativo, url
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Fallo al subir blob a Azure (%s): %s. Usando fallback local.",
                relativo,
                exc,
            )

    return relativo, url_for(relativo)


def url_for(relative_path: str) -> str:
    """URL publica absoluta del archivo (Azure CDN, Azure Blob o backend local)."""
    # Si hay un CDN o custom domain configurado (ej. Azure CDN)
    if settings.azure_storage_public_url_base:
        return f"{settings.azure_storage_public_url_base.rstrip('/')}/{relative_path.lstrip('/')}"

    # Si hay Azure Storage configurado directamente
    if settings.azure_storage_connection_string:
        client = get_blob_service_client()
        if client is not None:
            container = settings.azure_storage_container_name
            endpoint = client.primary_endpoint.rstrip("/")
            return f"{endpoint}/{container}/{relative_path.lstrip('/')}"

    # Fallback local via backend FastAPI /media
    return f"{settings.media_url_base}/{relative_path}"


def absolute_path(relative_path: str) -> Path:
    """Path absoluto en disco local del archivo."""
    return settings.media_dir / relative_path


def read_bytes(relative_path: str) -> bytes:
    """Lee los bytes del archivo desde cache local o descargando de Azure."""
    local = absolute_path(relative_path)
    if local.is_file():
        return local.read_bytes()

    if settings.azure_storage_connection_string:
        try:
            container = ensure_azure_container()
            if container is not None:
                blob_client = container.get_blob_client(relative_path)
                data = blob_client.download_blob().readall()
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_bytes(data)
                return data
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallo al descargar blob de Azure (%s): %s", relative_path, exc)

    raise FileNotFoundError(f"Archivo no encontrado en storage: {relative_path}")


def purge_expired_human_photos(
    max_age_hours: float = 24.0,
    base_dir: Path | None = None,
) -> list[str]:
    """Elimina del almacenamiento local las fotos de usuarios con mas de `max_age_hours`.

    Garantiza el cumplimiento estricto de la politica de privacidad de 24 horas:
    las fotos de personas en pose ('humanos') no deben persistir mas alla de su ventana
    autorizada de procesamiento en disco local.
    """
    media_path = base_dir if base_dir is not None else settings.media_dir
    carpeta = FOLDER_MAP.get("humans", "humanos")
    humanos_dir = media_path / carpeta

    if not humanos_dir.exists() or not humanos_dir.is_dir():
        logger.debug("Directorio de fotos humanas %s no existe. Nada que purgar.", humanos_dir)
        return []

    ahora = time.time()
    limite_segundos = max_age_hours * 3600.0
    eliminados: list[str] = []

    for archivo in sorted(humanos_dir.iterdir()):
        if not archivo.is_file():
            continue
        try:
            mtime = archivo.stat().st_mtime
            if (ahora - mtime) >= limite_segundos:
                archivo.unlink(missing_ok=True)
                eliminados.append(archivo.name)
                logger.info(
                    "Foto humana expirada purgada (>%sh): %s",
                    max_age_hours,
                    archivo.name,
                )
        except OSError as exc:
            logger.warning("No se pudo purgar archivo expirado %s: %s", archivo.name, exc)

    logger.info("Purga de fotos humanas completada: %d archivo(s) eliminados.", len(eliminados))
    return eliminados

