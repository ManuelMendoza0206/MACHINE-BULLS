"""Almacenamiento local de imagenes (MVP).

Guarda bytes en `settings/media_dir` y devuelve la URL publica bajo
`/media/...`. Es el reemplazo barato de Cloudinary que decide el plan: para la
demo del lunes el backend sirve sus propias imagenes via StaticFiles. El
contrato de la API (URLs absolutas) no cambia cuando entre Cloudinary: solo
cambia la implementacion de `save`/`url_for`.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from config import settings


def save_image(content: bytes, subfolder: str, ext: str = "jpg") -> tuple[str, str]:
    """Guarda bytes y devuelve (path_relativo, url_publica)."""
    destino_dir = settings.media_dir / subfolder
    destino_dir.mkdir(parents=True, exist_ok=True)
    nombre = f"{uuid.uuid4().hex}.{ext}"
    destino = destino_dir / nombre
    destino.write_bytes(content)
    relativo = f"{subfolder}/{nombre}"
    return relativo, url_for(relativo)


def url_for(relative_path: str) -> str:
    """URL absoluta de un archivo bajo /media/."""
    return f"{settings.media_url_base}/{relative_path}"


def absolute_path(relative_path: str) -> Path:
    """Path absoluto en disco de un path relativo guardado."""
    return settings.media_dir / relative_path
