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


class VtonStage(str, enum.Enum):
    """Estados finos del pipeline (4.1.8 del spec de colas).

    NO son el contrato publico: viven en `VtonJob.stage` y el frontend los ve
    por el mapping de abajo. Contrato (`VtonJobStatus`) queda intacto.
    """

    QUEUED = "queued"
    VALIDATING = "validating"
    PREPROCESSING = "preprocessing"
    POSE_ESTIMATION = "pose_estimation"
    GENERATING = "generating"
    LAYERING = "layering"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


# Mapping stage -> status publico. `pending` == esperando al worker (QUEUED);
# todo lo intermedio es `processing`; los finales coinden con su stage.
STAGE_TO_STATUS: dict[str, str] = {
    VtonStage.QUEUED.value: VtonJobStatus.PENDING.value,
    VtonStage.VALIDATING.value: VtonJobStatus.PROCESSING.value,
    VtonStage.PREPROCESSING.value: VtonJobStatus.PROCESSING.value,
    VtonStage.POSE_ESTIMATION.value: VtonJobStatus.PROCESSING.value,
    VtonStage.GENERATING.value: VtonJobStatus.PROCESSING.value,
    VtonStage.LAYERING.value: VtonJobStatus.PROCESSING.value,
    VtonStage.UPLOADING.value: VtonJobStatus.PROCESSING.value,
    VtonStage.COMPLETED.value: VtonJobStatus.COMPLETED.value,
    VtonStage.FAILED.value: VtonJobStatus.FAILED.value,
}


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
