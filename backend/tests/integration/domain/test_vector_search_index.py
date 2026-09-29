"""HNSW usado por k-NN (AC g1): EXPLAIN ANALYZE sobre 1.000 embeddings
debe mostrar garment_embedding_hnsw_idx (seqscan apagado a propósito)."""

from __future__ import annotations

import random

from sqlalchemy import text


def test_knn_usa_hnsw(db) -> None:
    rng = random.Random(7)
    for i in range(1000):
        emb = "[" + ",".join(repr(rng.random()) for _ in range(128)) + "]"
        db.execute(
            text(
                'INSERT INTO "Garment" (image_url, processed_image_url, category, '
                "aesthetic_scores, dominant_colors_hsv, compatibility_embedding) "
                "VALUES (:a, :b, 'tops', '[]', '[]', CAST(:emb AS vector))"
            ),
            {"a": f"http://x/{i}.jpg", "b": f"http://x/{i}-p.jpg", "emb": emb},
        )
    db.execute(text("SET enable_seqscan = off"))
    q = "[" + ",".join(["0.5"] * 128) + "]"
    plan = db.execute(
        text(
            'EXPLAIN ANALYZE SELECT id FROM "Garment" '
            "ORDER BY compatibility_embedding <=> CAST(:q AS vector) LIMIT 5"
        ),
        {"q": q},
    ).fetchall()
    texto = "\n".join(r[0] for r in plan)
    assert "garment_embedding_hnsw_idx" in texto
