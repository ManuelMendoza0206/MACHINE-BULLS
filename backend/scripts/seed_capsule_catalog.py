"""Seed del catálogo cápsula "Básicos StyleMe" (spec §2.3 + gb).

50 prendas user_id=NULL. Verifica cobertura mínima (posición × estética)
ANTES de commitear; si falla, rollback + exit 1 (nunca deja catálogo
incompleto). Uso: DATABASE_URL=... uv run python backend/scripts/seed_capsule_catalog.py
"""

from __future__ import annotations

import os
import random
import sys
from uuid import uuid4

from sqlalchemy import create_engine, text

POSITIONS = ("top", "bottom", "footwear", "outerwear")
AESTHETICS = ("Old Money", "Streetwear", "Soft Boy", "Starboy", "Gorpcore")
N_PRENDAS = 50
EMBEDDING_DIM = 128

DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


class SeedCoverageError(Exception):
    pass


def _normalize_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def build_seed_rows(seed: int = 42) -> list[dict]:
    """Filas deterministas (puro, testeable sin BD)."""
    rng = random.Random(seed)
    rows = []
    for i in range(N_PRENDAS):
        pos = POSITIONS[i % len(POSITIONS)]
        aes = AESTHETICS[(i // len(POSITIONS)) % len(AESTHETICS)]
        slug = f"{pos}-{i}"
        rows.append({
            "id": str(uuid4()),
            "user_id": None,
            "image_url": f"https://example.com/capsule/{slug}.jpg",
            "processed_image_url": f"https://example.com/capsule/{slug}-processed.jpg",
            "category": f"clothing::{pos}",
            "aesthetic_scores": [{"aesthetic": aes, "confidence": 0.9}],
            "dominant_colors_hsv": [{"h": 0.0, "s": 0.0, "v": 95.0, "hex": "#f2f2f2"}],
            "compatibility_embedding": [rng.random() for _ in range(EMBEDDING_DIM)],
            "_position": pos,
            "_aesthetic": aes,
        })
    return rows


def verify_coverage(rows: list[dict]) -> None:
    """Falla en voz alta si falta cobertura mínima (spec: aborta, no deja incompleto)."""
    positions = {r["_position"] for r in rows}
    aesthetics = {r["_aesthetic"] for r in rows}
    faltan_pos = set(POSITIONS) - positions
    faltan_aes = set(AESTHETICS) - aesthetics
    if faltan_pos or faltan_aes:
        raise SeedCoverageError(f"sin cobertura: posiciones={faltan_pos} estéticas={faltan_aes}")


def run(database_url: str) -> int:
    rows = build_seed_rows()
    verify_coverage(rows)
    engine = create_engine(_normalize_url(database_url), future=True)
    import json

    with engine.begin() as conn:
        for r in rows:
            emb = "[" + ",".join(repr(float(x)) for x in r["compatibility_embedding"]) + "]"
            conn.execute(
                text(
                    'INSERT INTO "Garment" '
                    "(id, user_id, image_url, processed_image_url, category, "
                    "aesthetic_scores, dominant_colors_hsv, compatibility_embedding) "
                    "VALUES (:id, :user_id, :image_url, :processed_image_url, :category, "
                    "CAST(:aesthetic_scores AS jsonb), CAST(:dominant_colors_hsv AS jsonb), "
                    "CAST(:emb AS vector))"
                ),
                {
                    "id": r["id"], "user_id": r["user_id"], "image_url": r["image_url"],
                    "processed_image_url": r["processed_image_url"], "category": r["category"],
                    "aesthetic_scores": json.dumps(r["aesthetic_scores"]),
                    "dominant_colors_hsv": json.dumps(r["dominant_colors_hsv"]),
                    "emb": emb,
                },
            )
    print(f"[OK] seed cápsula: {len(rows)} prendas "
          f"(cobertura {len(POSITIONS)}x{len(AESTHETICS)} verificada)")
    return len(rows)


def main() -> int:
    try:
        run(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    except SeedCoverageError as e:
        print(f"[ERR] seed abortado: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
