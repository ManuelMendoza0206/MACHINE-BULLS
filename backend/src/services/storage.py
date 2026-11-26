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
from datetime import UTC
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
    parts = subfolder.split("/", 1)
    carpeta = FOLDER_MAP.get(parts[0], parts[0])
    if len(parts) == 2:
        carpeta = f"{carpeta}/{parts[1]}"
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


def delete_file(relative_path: str) -> bool:
    """Elimina el archivo del almacenamiento local y Azure si existe."""
    deleted = False
    local = absolute_path(relative_path)
    if local.is_file():
        try:
            local.unlink()
            deleted = True
        except OSError as exc:
            logger.warning("Fallo al eliminar archivo local (%s): %s", local, exc)

    if settings.azure_storage_connection_string:
        try:
            container = ensure_azure_container()
            if container is not None:
                container.delete_blob(relative_path)
                deleted = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallo al eliminar blob en Azure (%s): %s", relative_path, exc)
    return deleted


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


def _purge_azure_human_blobs(
    carpeta: str,
    max_age_seconds: float | None = None,
) -> list[str]:
    """Elimina blobs en Azure bajo `carpeta/` (todos si max_age_seconds es None, o los expirados)."""
    if not settings.azure_storage_connection_string:
        return []

    eliminados: list[str] = []
    try:
        from datetime import datetime

        container = ensure_azure_container()
        if container is None:
            return []

        ahora = datetime.now(UTC)
        prefix = f"{carpeta.rstrip('/')}/"
        for blob in container.list_blobs(name_starts_with=prefix):
            nombre = getattr(blob, "name", None) or blob["name"]
            if max_age_seconds is not None:
                last_modified = getattr(blob, "last_modified", None) or blob.get("last_modified")
                if last_modified is None:
                    continue
                if last_modified.tzinfo is None:
                    last_modified = last_modified.replace(tzinfo=UTC)
                if (ahora - last_modified).total_seconds() < max_age_seconds:
                    continue
            container.delete_blob(nombre)
            eliminados.append(nombre.rsplit("/", 1)[-1])
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo al purgar blobs humanos en Azure (%s): %s", carpeta, exc)

    return eliminados


def purge_expired_human_photos(
    max_age_hours: float = 24.0,
    base_dir: Path | None = None,
) -> list[str]:
    """Elimina del almacenamiento local y Azure las fotos de usuarios con mas de `max_age_hours`.

    Garantiza el cumplimiento estricto de la politica de privacidad de 24 horas:
    las fotos de personas en pose ('humanos') no deben persistir mas alla de su ventana
    autorizada de procesamiento.
    """
    media_path = base_dir if base_dir is not None else settings.media_dir
    carpeta = FOLDER_MAP.get("humans", "humanos")
    humanos_dir = media_path / carpeta
    limite_segundos = max_age_hours * 3600.0
    eliminados: list[str] = []

    if humanos_dir.exists() and humanos_dir.is_dir():
        ahora = time.time()
        for archivo in sorted(humanos_dir.rglob("*")):
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

    if base_dir is None:
        for nombre in _purge_azure_human_blobs(carpeta, max_age_seconds=limite_segundos):
            if nombre not in eliminados:
                eliminados.append(nombre)

    logger.info("Purga de fotos humanas completada: %d archivo(s) eliminados.", len(eliminados))
    return eliminados


def purge_all_human_photos(base_dir: Path | None = None) -> list[str]:
    """Elimina inmediatamente todas las fotos temporales de usuarios en local y Azure."""
    media_path = base_dir if base_dir is not None else settings.media_dir
    carpeta = FOLDER_MAP.get("humans", "humanos")
    humanos_dir = media_path / carpeta
    eliminados: list[str] = []

    if humanos_dir.exists() and humanos_dir.is_dir():
        for archivo in sorted(humanos_dir.rglob("*")):
            if not archivo.is_file():
                continue
            try:
                archivo.unlink(missing_ok=True)
                eliminados.append(archivo.name)
                logger.info("Foto humana purgada bajo demanda: %s", archivo.name)
            except OSError as exc:
                logger.warning("No se pudo purgar archivo %s: %s", archivo.name, exc)

    if base_dir is None:
        for nombre in _purge_azure_human_blobs(carpeta, max_age_seconds=None):
            if nombre not in eliminados:
                eliminados.append(nombre)

    return eliminados


def purge_user_human_photos(user_id: str, base_dir: Path | None = None) -> list[str]:
    """Delete only the temporary human photos stored under one user's prefix."""
    if not user_id or "/" in user_id or "\\" in user_id or user_id in {".", ".."}:
        raise ValueError("user_id inválido")
    media_path = base_dir if base_dir is not None else settings.media_dir
    relative_folder = Path(FOLDER_MAP["humans"]) / user_id
    local_folder = media_path / relative_folder
    deleted: list[str] = []
    if local_folder.exists():
        for path in local_folder.rglob("*"):
            if path.is_file():
                try:
                    path.unlink()
                    deleted.append(path.name)
                except OSError as exc:
                    logger.warning("No se pudo purgar foto temporal %s: %s", path, exc)
        try:
            local_folder.rmdir()
        except OSError:
            pass
    if base_dir is None and settings.azure_storage_connection_string:
        deleted.extend(_purge_azure_human_blobs(str(relative_folder), max_age_seconds=None))
    return deleted


