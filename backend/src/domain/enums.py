"""Enums de dominio (spec backend/domain-and-database §2.1)."""

from __future__ import annotations

from enum import Enum


class OutfitPosition(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    FOOTWEAR = "footwear"
    OUTERWEAR = "outerwear"


class VtonJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GarmentSource(str, Enum):
    UPLOADED = "uploaded"
    CAPSULE = "capsule"
