"""Schemas Pydantic de la API: el contrato que el frontend valida con Zod.

Cada schema replica campo por campo `frontend/src/schemas/api/*.ts`. Los ranges
(h 0-360, s/v 0-100, scores 0-1, UUIDs) no son decoracion: si el backend se
sale de ahi, el `schema.parse` del cliente tira `ValidationError` y la UI cae
en estado de error tipado. Si cambia un schema Zod, cambia este.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

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
    subcategory: str | None = None
    position: GarmentPosition | None = None
    top_aesthetics: list[AestheticScore] | None = None
    dominant_colors: list[DominantColor] = Field(min_length=1)
    processed_image_url: str
    pattern: str | None = None


class GarmentSummary(BaseModel):
    """Item de listing (capsule / wardrobe)."""

    id: str
    processed_image_url: str
    category: str
    subcategory: str | None = None
    dominant_aesthetic: str
    position: GarmentPosition | None = None
    status: str = "AVAILABLE"
    pattern: str | None = None


class GarmentStatusUpdate(BaseModel):
    """Payload para actualizar estado operativo de una prenda."""

    status: str


class GarmentUpdateRequest(BaseModel):
    """Payload PATCH /api/v1/garments/{garment_id} para corregir metadatos o recorte."""

    model_config = ConfigDict(extra="ignore")

    category: str | None = None
    position: GarmentPosition | None = None
    subcategory: str | None = None
    pattern: str | None = None
    processed_image_base64: str | None = None


class CapsuleCatalogResponse(BaseModel):
    """GET /api/v1/garments/capsule."""

    garments: list[GarmentSummary]


class GarmentsListResponse(BaseModel):
    """GET /api/v1/garments."""

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

    user_id: str | None = None
    target_aesthetic: str | None = None
    available_garment_ids: list[str] | None = None
    occasion: str | None = None
    weather: str | None = None


class OutfitRemixRequest(BaseModel):
    """POST /api/v1/outfits/remix."""

    model_config = ConfigDict(extra="ignore")

    user_id: str | None = None
    pinned_garment_ids: list[str] = Field(min_length=1)
    occasion: str | None = None
    weather: str | None = None
    target_aesthetic: str | None = None


class ManualOutfitEvaluateRequest(BaseModel):
    """POST /api/v1/outfits/evaluate-manual."""

    model_config = ConfigDict(extra="ignore")

    garment_ids: list[str] = Field(min_length=1, max_length=6)
    occasion: str | None = None
    weather: str | None = None


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
    """GET /api/v1/me: identidad resuelta (JWT o demo) y foto canónica por defecto."""

    user_id: str
    email: str
    has_default_vton_photo: bool = False
    default_vton_photo_url: str | None = None


class CanonicalPhotoResponse(BaseModel):
    """Estado y URL de la foto canónica del usuario con consentimiento informado."""

    has_canonical: bool
    photo_url: str | None = None
    consent_at: datetime | None = None
    message: str | None = None


class ShareLookResponse(BaseModel):
    """Respuesta de generación de enlace para compartir look."""

    job_id: str
    share_token: str
    share_url: str
    expires_in_hours: int = 24


class VtonJobCreateResponse(BaseModel):
    """POST /api/v1/vton/try-on: job aceptado, status siempre 'processing'."""

    job_id: str
    status: str = "processing"
    estimated_time_seconds: float = Field(gt=0.0)


class VtonJobStatusResponse(BaseModel):
    """GET /api/v1/vton/status/{job_id}: completed exige result_url (refine Zod)."""

    job_id: str
    status: VtonJobStatus
    stage: str | None = None
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

    user_id: str | None = None
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


class PackingPlanRequest(BaseModel):
    """Payload para generar un plan de maleta de viaje."""

    days: int = Field(ge=1, le=14, default=3)
    weather: str = Field(default="mild")  # cold | mild | warm
    occasion: str | None = None  # casual | formal | work | sport


class PackedGarmentSummary(BaseModel):
    """Prenda incluida en la maleta."""

    id: str
    category: str
    position: str | None = None
    processed_image_url: str


class DailyOutfitPlan(BaseModel):
    """Propuesta de outfit para un día específico del viaje."""

    day: int
    garment_ids: list[str]
    reason: str


class PackingPlanResponse(BaseModel):
    """Respuesta con cápsula de viaje optimizada y planes diarios."""

    days: int
    weather: str
    packed_garments: list[PackedGarmentSummary]
    daily_plans: list[DailyOutfitPlan]
    total_items_count: int
    combinations_unlocked_count: int
    tip: str


class StylistAdviceRequest(BaseModel):
    """POST /api/v1/outfits/{outfit_id}/stylist-advice."""

    model_config = ConfigDict(extra="ignore")

    occasion: str | None = None
    weather: str | None = None
    user_note: str | None = Field(default=None, max_length=300)


class StylistAdviceResponse(BaseModel):
    """Asesoramiento estilístico estructurado (Azure OpenAI o fallback experto local)."""

    outfit_id: str
    why_it_works: str
    accessories: list[str] = Field(min_length=1)
    grooming_and_footwear: str
    event_adaptation: str
    source: Literal["azure_openai", "rules"]
    model: str | None = None
    cached: bool = False

