"""Enumeraciones del dominio.

Los valores coinciden con los enums cerrados que el frontend ya valida con Zod
(`frontend/src/schemas/api/*.ts`): mismos strings, mismos ordenes.
"""

from __future__ import annotations

import enum


class GarmentPosition(str, enum.Enum):
    """Posicion de la prenda en un outfit multicapa."""

    TOP = "top"
    BOTTOM = "bottom"
    FOOTWEAR = "footwear"
    OUTERWEAR = "outerwear"


class OwnershipSource(str, enum.Enum):
    """De donde salio la prenda para el usuario."""

    CAPSULE = "capsule"
    UPLOAD = "upload"


class VtonJobStatus(str, enum.Enum):
    """Estados del job de try-on; el frontend espera exactamente estos strings."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Categoria CLIP -> posicion para armar capas. CLIP clasifica en las seis
# clases del dataset (top, bottom, dress, outwear, shoes, bag); dress y bag no
# tienen posicion en el enum y quedan en None.
CATEGORY_TO_POSITION: dict[str, GarmentPosition | None] = {
    "top": GarmentPosition.TOP,
    "bottom": GarmentPosition.BOTTOM,
    "shoes": GarmentPosition.FOOTWEAR,
    "outwear": GarmentPosition.OUTERWEAR,
    "dress": None,
    "bag": None,
}

# Clases zero-shot del clasificador CLIP (ver ml.models.prompts + notebook 03).
CLIP_CATEGORIES = ("top", "bottom", "dress", "outwear", "shoes", "bag")

# Mapping categoria CLIP -> categoria que entiende IDM-VTON en Replicate.
VTON_CATEGORY: dict[str, str] = {
    "top": "upper",
    "outerwear": "upper",
    "bottom": "lower",
    "dress": "dresses",
}
