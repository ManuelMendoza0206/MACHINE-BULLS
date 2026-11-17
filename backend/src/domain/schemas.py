"""Schemas Pydantic de la API: el contrato que el frontend valida con Zod.

Cada schema replica campo por campo `frontend/src/schemas/api/*.ts`. Los ranges
(h 0-360, s/v 0-100, scores 0-1, UUIDs) no son decoracion: si el backend se
sale de ahi, el `schema.parse` del cliente tira `ValidationError` y la UI cae
en estado de error tipado. Si cambia un schema Zod, cambia este.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

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
    status: str = "AVAILABLE"


class GarmentStatusUpdate(BaseModel):
    """Payload para actualizar estado operativo de una prenda."""

    status: str


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
    occasion: str | None = None
    weather: str | None = None
    reason: str | None = None


class OutfitRecommendRequest(BaseModel):
    """POST /api/v1/outfits/recommend (body JSON)."""

    model_config = ConfigDict(extra="ignore")

    user_id: str
    target_aesthetic: str | None = None
    available_garment_ids: list[str] | None = None
    occasion: str | None = None
    weather: str | None = None


class OutfitRemixRequest(BaseModel):
    """POST /api/v1/outfits/remix."""

    model_config = ConfigDict(extra="ignore")

    user_id: str
    pinned_garment_ids: list[str] = Field(min_length=1)
    occasion: str | None = None
    weather: str | None = None
    target_aesthetic: str | None = None


class OutfitRecommendResponse(BaseModel):
    """Respuesta de recommend."""

    outfits: list[OutfitOut]


class OutfitFeedbackCreate(BaseModel):
    """Payload para registrar feedback (like/dislike) de un outfit."""

    rating: int = Field(..., description="+1 para like, -1 para dislike")
    feedback_type: str | None = Field(default=None, description="like, dislike, etc.")
    notes: str | None = None


class OutfitFeedbackOut(BaseModel):
    """Respuesta del feedback registrado."""

    id: str
    user_id: str
    outfit_id: str
    rating: int
    feedback_type: str | None = None
    created_at: datetime


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


class VtonJobListItem(BaseModel):
    """Item individual en el historial de jobs VTON (GET /api/v1/vton/jobs, Gap G3)."""

    job_id: str
    outfit_id: str | None = None
    status: VtonJobStatus
    stage: str | None = None
    result_url: str | None = None
    error_message: str | None = None
    created_at: datetime


class VtonJobListResponse(BaseModel):
    """GET /api/v1/vton/jobs: historial de jobs de try-on del usuario (Gap G3)."""

    jobs: list[VtonJobListItem]
    total: int


class SmartShoppingRedundancy(BaseModel):
    """Alerta de prenda similar en la misma categoría."""

    is_redundant: bool
    similar_garment_id: str | None = None
    similarity: float = 0.0
    message: str | None = None


class SmartShoppingEvaluateResponse(BaseModel):
    """Resultado del análisis Before You Buy de una prenda candidata."""

    candidate_garment: GarmentUploadResponse
    compatible_garments_count: int
    potential_outfits_count: int
    redundancy: SmartShoppingRedundancy
    verdict: str
    potential_outfits: list[OutfitOut]


class OutfitUsageLogCreate(BaseModel):
    """Registrar un outfit como usado."""

    outfit_id: str
    worn_date: str | None = None


class OutfitUsageLogOut(BaseModel):
    """Respuesta de registro de uso."""

    id: str
    user_id: str
    outfit_id: str
    worn_date: str
    created_at: datetime


class WardrobeAnalyticsResponse(BaseModel):
    """Estadísticas de uso y salud del guardarropa."""

    total_garments: int
    utilization_rate: float
    most_worn_garments: list[dict[str, Any]]
    unworn_garments: list[dict[str, Any]]
    wardrobe_gaps: list[str]


class WeatherResponse(BaseModel):
    """Clima actual detectado o manual."""

    city: str
    temp_c: float
    condition: str
    weather_type: str  # cold, mild, warm
    is_raining: bool
    source: str  # weatherapi, open-meteo, fallback, manual


class OutfitPlanCreate(BaseModel):
    """Creación de un plan de vestimenta."""

    user_id: str
    planned_date: str  # YYYY-MM-DD
    garment_ids: list[str] = Field(min_length=1)
    outfit_id: str | None = None
    occasion: str | None = None
    notes: str | None = None


class OutfitPlanResponse(BaseModel):
    """Representación de un plan de vestimenta."""

    id: str
    user_id: str
    planned_date: str
    garment_ids: list[str]
    outfit_id: str | None = None
    occasion: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class OutfitPlanConfirmResponse(BaseModel):
    """Confirmación de uso de un plan agendado."""

    plan: OutfitPlanResponse
    usage_logged: bool
    garments_marked_laundry: list[str] = []

