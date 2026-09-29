"""Schemas Pydantic v2 — espejo campo a campo de los Zod del frontend
(`frontend/src/schemas/api/{garments,outfits,vton}.ts`).

Regla de paridad (spec backend/domain-and-database §2.2): cualquier
divergencia de nombre, tipo o nullability contra Zod es defecto, no detalle.
Donde Zod es más estricto que el boceto §2.2 (uuid/url/opcionales), manda Zod.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from domain.enums import OutfitPosition, VtonJobStatus

GarmentPosition = OutfitPosition  # mismos valores que GarmentPositionSchema (Zod)


class AestheticScore(BaseModel):
    model_config = ConfigDict(frozen=True)
    aesthetic: str
    confidence: float = Field(ge=0, le=1)


class DominantColor(BaseModel):
    model_config = ConfigDict(frozen=True)
    h: float = Field(ge=0, le=360)
    s: float = Field(ge=0, le=100)
    v: float = Field(ge=0, le=100)
    hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class GarmentUploadResponse(BaseModel):
    garment_id: UUID
    category: str
    position: GarmentPosition | None = None
    top_aesthetics: list[AestheticScore] | None = Field(default=None, min_length=1)
    dominant_colors: list[DominantColor] = Field(min_length=1)
    processed_image_url: HttpUrl


class GarmentSummary(BaseModel):
    id: UUID
    processed_image_url: HttpUrl
    category: str
    dominant_aesthetic: str
    position: GarmentPosition | None = None


class CapsuleCatalogResponse(BaseModel):
    garments: list[GarmentSummary]


class OutfitGarmentRef(BaseModel):
    garment_id: UUID
    position: OutfitPosition


class Outfit(BaseModel):
    outfit_id: UUID
    aesthetic: str  # GAP: sin enum cerrado publicado todavía
    garments: list[OutfitGarmentRef] = Field(min_length=1)
    chromatic_score: float = Field(ge=0, le=1)
    embedding_score: float = Field(ge=0, le=1)


class OutfitRecommendationResponse(BaseModel):
    outfits: list[Outfit]


class OutfitRecommendRequest(BaseModel):
    user_id: UUID
    target_aesthetic: str | None = None
    available_garment_ids: list[UUID] | None = None


class VtonJobCreateResponse(BaseModel):
    job_id: UUID
    status: Literal["processing"]
    estimated_time_seconds: float = Field(gt=0)


class VtonJobStatusResponse(BaseModel):
    job_id: UUID
    status: VtonJobStatus
    result_url: HttpUrl | None = None
    error_message: str | None = None

    @model_validator(mode="after")
    def _completed_exige_result_url(self) -> VtonJobStatusResponse:
        # Espeja el .refine() de VtonJobStatusResponseSchema (Zod).
        if self.status == VtonJobStatus.COMPLETED and not self.result_url:
            raise ValueError("result_url es requerido cuando status es completed")
        return self


class VtonGarmentLayer(BaseModel):
    garment_id: UUID
    position: OutfitPosition


class VtonMultilayerRequest(BaseModel):
    garment_layers: list[VtonGarmentLayer] = Field(min_length=1, max_length=4)


class UserCreate(BaseModel):
    """Fila User creada por el trigger G5 (spec §2.4)."""

    id: UUID
    email: str
    name: str | None = None

    @field_validator("email")
    @classmethod
    def _email_no_vacio(cls, v: str) -> str:
        if not v:
            raise ValueError("email vacío")
        return v
