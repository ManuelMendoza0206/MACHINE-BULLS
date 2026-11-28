"""Bounded validation for user supplied raster images."""

from __future__ import annotations

import io
import warnings

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from config import settings

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def read_validated_image(upload: UploadFile, field_name: str) -> tuple[bytes, Image.Image]:
    """Read an upload under configured byte/pixel limits and decode supported formats."""
    content = upload.file.read(settings.max_upload_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail=f"{field_name} está vacío")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"{field_name} supera el límite de tamaño permitido")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(content))
            if image.format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(status_code=415, detail=f"{field_name} debe ser JPEG, PNG o WEBP")
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > settings.max_image_pixels:
                raise HTTPException(status_code=413, detail=f"{field_name} supera las dimensiones permitidas")
            image.load()
            return content, image.copy()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} no es una imagen válida") from exc
