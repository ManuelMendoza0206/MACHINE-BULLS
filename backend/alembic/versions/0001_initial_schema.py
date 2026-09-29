"""0001: extension pgvector + 6 tablas (spec §2.1 verbatim).

Desvío documentado del manifiesto (que ponía la extensión en 0002):
la columna vector de Garment exige la extensión ANTES del CREATE TABLE.
Downgrade: borra tablas + tipos enum; la extensión se conserva (entorno,
no schema).
"""

from __future__ import annotations

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "User",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
        server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False,
        server_default=sa.text("now()")),
    )
    op.create_table(
        "Garment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
        server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("processed_image_url", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("aesthetic_scores", sa.JSON(), nullable=False),
        sa.Column("dominant_colors_hsv", sa.JSON(), nullable=False),
        sa.Column("compatibility_embedding", Vector(128), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False,
        server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["User.id"]),
    )
    op.create_table(
        "GarmentOwnership",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("garment_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.Enum("uploaded", "capsule", name="garmentsource"), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=False,
        server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["User.id"]),
        sa.ForeignKeyConstraint(["garment_id"], ["Garment.id"]),
    )
    op.create_table(
        "Outfit",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
        server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("aesthetic", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False,
        server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["User.id"]),
    )
    op.create_table(
        "OutfitGarment",
        sa.Column("outfit_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("garment_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "position",
            sa.Enum("top", "bottom", "footwear", "outerwear", name="outfitposition"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["outfit_id"], ["Outfit.id"]),
        sa.ForeignKeyConstraint(["garment_id"], ["Garment.id"]),
    )
    op.create_table(
        "VTONJob",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
        server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_photo_url", sa.String(), nullable=False),
        sa.Column("outfit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "completed", "failed", name="vtonjobstatus"),
            nullable=False,
        ),
        sa.Column("result_url", sa.String(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False,
        server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["User.id"]),
        sa.ForeignKeyConstraint(["outfit_id"], ["Outfit.id"]),
    )


def downgrade() -> None:
    for table in ("OutfitGarment", "GarmentOwnership", "VTONJob", "Outfit", "Garment", "User"):
        op.drop_table(table)
    op.execute("DROP TYPE IF EXISTS outfitposition")
    op.execute("DROP TYPE IF EXISTS vtonjobstatus")
    op.execute("DROP TYPE IF EXISTS garmentsource")
    # La extensión vector se conserva a propósito (entorno compartido).
