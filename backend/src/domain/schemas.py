"""Schemas Pydantic de la API: el contrato que el frontend valida con Zod.

Cada schema replica campo por campo `frontend/src/schemas/api/*.ts`. Los ranges
(h 0-360, s/v 0-100, scores 0-1, UUIDs) no son decoracion: si el backend se
sale de ahi, el `schema.parse` del cliente tira `ValidationError` y la UI cae
en estado de error tipado. Si cambia un schema Zod, cambia este.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from domain.enums import GarmentPosition, VtonJobStatus


class AestheticScore(BaseModel):
    """Confianza de una estetica CLIP sobre la prenda (top_aesthetics)."""

    aesthetic: str
    confidence: float = Field(ge=0.0, le=1.0)


class DominantColor(BaseModel):
    """Color dominante en HSV normalizado + hex, tal cual lo espera el Zod."""

    h: float = Field(ge=0.0, le=360.0)
    s: float = Field(ge=0.0, le=100.0)
    v: float = Field(ge=0.0, le=100.0)
    hex: str

    @field_validator("hex")
    @classmethod
    def _hex_valido(cls, valor: str) -> str:
        if len(valor) != 7 or not valor.startswith("#"):
            raise ValueError("hex debe tener forma #rrggbb")
        int(valor[1:], 16)
        return valor


class GarmentUploadResponse(BaseModel):
    """Respuesta de POST /api/v1/garments/upload."""

    garment_id: str
    category: str
    position: GarmentPosition | None = None
    top_aesthetics: list[AestheticScore] | None = None
    dominant_colors: list[DominantColor] = Field(min_length=1)
    processed_image_url: str


class GarmentSummary(BaseModel):
    """Item de listing (capsule / wardrobe)."""

    id: str
    processed_image_url: str
    category: str
    dominant_aesthetic: str
    position: GarmentPosition | None = None


class CapsuleCatalogResponse(BaseModel):
    """GET /api/v1/garments/capsule."""

    garments: list[GarmentSummary]


class OutfitGarmentRef(BaseModel):
    """Prenda referenciada en un outfit."""

    garment_id: str
    position: GarmentPosition


class OutfitOut(BaseModel):
    """Outfit recomendado, scores incluidos."""

    outfit_id: str
    aesthetic: str
    garments: list[OutfitGarmentRef] = Field(min_length=1)
    chromatic_score: float = Field(ge=0.0, le=1.0)
    embedding_score: float = Field(ge=0.0, le=1.0)


class OutfitRecommendRequest(BaseModel):
    """POST /api/v1/outfits/recommend (body JSON)."""

    model_config = ConfigDict(extra="ignore")

    user_id: str
    target_aesthetic: str | None = None
    available_garment_ids: list[str] | None = None


class OutfitRecommendResponse(BaseModel):
    """Respuesta de recommend."""

    outfits: list[OutfitOut]


class MeResponse(BaseModel):
    """GET /api/v1/me: identidad del usuario demo.

    El MVP no valida JWT (el frontend no manda Authorization); este endpoint
    expone el user_id con el que el backend persiste prendas y outfits, para
    que el frontend no tenga que adivinarlo.
    """

    user_id: str
    email: str


class VtonJobCreateResponse(BaseModel):
    """POST /api/v1/vton/try-on: job aceptado, status siempre 'processing'."""

    job_id: str
    status: str = "processing"
    estimated_time_seconds: float = Field(gt=0.0)


class VtonJobStatusResponse(BaseModel):
    """GET /api/v1/vton/status/{job_id}: completed exige result_url (refine Zod)."""

    job_id: str
    status: VtonJobStatus
    result_url: str | None = None
    error_message: str | None = None
