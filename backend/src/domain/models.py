"""Entidades SQLAlchemy 2.0 — spec backend/domain-and-database §2.1 verbatim.

Campos 1:1 con plan-base.md §10.1. Sin columnas no autorizadas, sin
relationships implícitas: lo que no está acá no existe en la BD.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Float, ForeignKey, Index, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import text as sa_text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from domain.enums import GarmentSource, OutfitPosition, VtonJobStatus


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "User"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4,
        server_default=sa_text("gen_random_uuid()"))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow,
        server_default=sa_text("now()"))


class Garment(Base):
    __tablename__ = "Garment"
    # Índice HNSW también declarado en metadata para que `alembic check`
    # (autogenerate) no proponga borrarlo: la metadata es la verdad completa.
    __table_args__ = (
        Index(
            "garment_embedding_hnsw_idx",
            "compatibility_embedding",
            postgresql_using="hnsw",
            postgresql_ops={"compatibility_embedding": "vector_cosine_ops"},
        ),
    )
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4,
        server_default=sa_text("gen_random_uuid()"))
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("User.id"), nullable=True
    )  # NULL = catálogo cápsula
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    processed_image_url: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # enum abierto, spec frontend 01 §2.3
    aesthetic_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    dominant_colors_hsv: Mapped[dict] = mapped_column(JSON, nullable=False)
    compatibility_embedding: Mapped[list[float]] = mapped_column(Vector(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow,
        server_default=sa_text("now()"))


class GarmentOwnership(Base):
    __tablename__ = "GarmentOwnership"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), primary_key=True)
    garment_id: Mapped[UUID] = mapped_column(ForeignKey("Garment.id"), primary_key=True)
    source: Mapped[GarmentSource] = mapped_column(SAEnum(GarmentSource), nullable=False)
    added_at: Mapped[datetime] = mapped_column(default=datetime.utcnow,
        server_default=sa_text("now()"))


class Outfit(Base):
    __tablename__ = "Outfit"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4,
        server_default=sa_text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    aesthetic: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow,
        server_default=sa_text("now()"))


class OutfitGarment(Base):
    __tablename__ = "OutfitGarment"
    outfit_id: Mapped[UUID] = mapped_column(ForeignKey("Outfit.id"), primary_key=True)
    garment_id: Mapped[UUID] = mapped_column(ForeignKey("Garment.id"), primary_key=True)
    position: Mapped[OutfitPosition] = mapped_column(SAEnum(OutfitPosition), nullable=False)


class VTONJob(Base):
    __tablename__ = "VTONJob"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4,
        server_default=sa_text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), nullable=False)
    user_photo_url: Mapped[str] = mapped_column(String, nullable=False)
    outfit_id: Mapped[UUID] = mapped_column(ForeignKey("Outfit.id"), nullable=False)
    status: Mapped[VtonJobStatus] = mapped_column(SAEnum(VtonJobStatus), default=VtonJobStatus.PENDING)
    result_url: Mapped[str | None] = mapped_column(String, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow,
        server_default=sa_text("now()"))
