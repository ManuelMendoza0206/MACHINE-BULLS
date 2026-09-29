"""0002: índice HNSW coseno sobre Garment.compatibility_embedding (spec §2.3)."""

from __future__ import annotations

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "garment_embedding_hnsw_idx",
        "Garment",
        ["compatibility_embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"compatibility_embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("garment_embedding_hnsw_idx", table_name="Garment")
