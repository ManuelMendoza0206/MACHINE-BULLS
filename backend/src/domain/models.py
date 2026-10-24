"""Modelos SQLAlchemy del dominio (B1).

UUIDs como String(36) para que el mismo esquema corra en SQLite (demo) y en
Postgres (produccion, con pgvector para los embeddings). Los embeddings van en
JSON por ahora: `vector(128)` y el indice HNSW entran con la migracion 0002
cuando haya Postgres; el contrato de la API no cambia.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from domain.enums import OwnershipSource, VtonJobStatus


def new_uuid() -> str:
    """UUID v4 como string; centralizado para poder cambiar la estrategia."""
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Base declarativa unica del proyecto."""


class User(Base):
    """Usuario sincronizado desde Supabase Auth (trigger 0003 en produccion)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    garments: Mapped[list[Garment]] = relationship(back_populates="owner")


class Garment(Base):
    """Prenda analizada: categoria CLIP, colores dominantes, embedding CLIP."""

    __tablename__ = "garments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    processed_image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    dominant_colors: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    top_aesthetics: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped[User | None] = relationship(back_populates="garments")


class GarmentOwnership(Base):
    """Relacion usuario-prenda: de donde salio la prenda y desde cuando.

    UniqueConstraint en (user_id, garment_id) es la base de la idempotencia del
    adopt (G4): el 409 del endpoint nace de este indice, no del codigo.
    """

    __tablename__ = "garment_ownerships"
    __table_args__ = (UniqueConstraint("user_id", "garment_id", name="uq_owner_garment"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    garment_id: Mapped[str] = mapped_column(ForeignKey("garments.id"), nullable=False)
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default=OwnershipSource.CAPSULE.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Outfit(Base):
    """Outfit armado por el recomendador: prendas + scores."""

    __tablename__ = "outfits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    aesthetic: Mapped[str] = mapped_column(String(50), nullable=False, default="casual")
    chromatic_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    embedding_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    garments: Mapped[list[OutfitGarment]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )


class OutfitGarment(Base):
    """Prenda dentro de un outfit, con su posicion y orden de capa."""

    __tablename__ = "outfit_garments"
    __table_args__ = (UniqueConstraint("outfit_id", "garment_id", name="uq_outfit_garment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    outfit_id: Mapped[str] = mapped_column(ForeignKey("outfits.id"), nullable=False)
    garment_id: Mapped[str] = mapped_column(ForeignKey("garments.id"), nullable=False)
    position: Mapped[str] = mapped_column(String(20), nullable=False)
    layer_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    outfit: Mapped[Outfit] = relationship(back_populates="garments")


class VtonJob(Base):
    """Job asincrono de try-on: estado, error y resultado."""

    __tablename__ = "vton_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    outfit_id: Mapped[str | None] = mapped_column(ForeignKey("outfits.id"), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=VtonJobStatus.PROCESSING.value
    )
    result_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
