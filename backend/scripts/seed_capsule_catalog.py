"""Seed del catálogo cápsula "Básicos StyleMe" (spec domain-and-database §2.3 + §Requirement).

50 prendas con owner_id=NULL. Verifica cobertura mínima obligatoria:
- 4 posiciones: top, bottom, footwear, outerwear
- 5 estéticas: Old Money, Streetwear, Soft Boy, Starboy, Gorpcore
EN EL MISMO MOMENTO DEL SEED — no como verificación posterior. Si falta alguna, aborta y lanza SeedCoverageError.
"""

from __future__ import annotations

import os
import random
import sys
from pathlib import Path
from uuid import uuid4

# Añadir src al path para ejecución directa
_SRC = Path(__file__).resolve().parent.parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from sqlalchemy.orm import Session

POSITIONS = ("top", "bottom", "footwear", "outerwear")
AESTHETICS = ("Old Money", "Streetwear", "Soft Boy", "Starboy", "Gorpcore")
N_PRENDAS = 50
EMBEDDING_DIM = 512

PALETTE_HEX = {
    "Old Money": ["#1C2833", "#F5F5F0", "#3E2723", "#4A5568", "#D4AF37"],
    "Streetwear": ["#111111", "#E53E3E", "#4A5568", "#ED8936", "#F7FAFC"],
    "Soft Boy": ["#E2E8F0", "#BEE3F8", "#FED7D7", "#FEEBC8", "#CBD5E0"],
    "Starboy": ["#000000", "#1A202C", "#718096", "#E2E8F0", "#2D3748"],
    "Gorpcore": ["#2D3748", "#2F855A", "#975A16", "#4A5568", "#744210"],
}


class SeedCoverageError(Exception):
    """Lanzada cuando las prendas a sembrar no cubren todas las posiciones y estéticas exigidas."""


def build_seed_rows(seed: int = 42) -> list[dict]:
    """Genera 50 prendas deterministas garantizando cobertura completa de posiciones y estéticas."""
    rng = random.Random(seed)
    rows: list[dict] = []

    # 1. Asegurar la matriz de cobertura 4 posiciones x 5 estéticas = 20 combinaciones básicas garantizadas
    base_combinations = [(pos, aes) for pos in POSITIONS for aes in AESTHETICS]
    rng.shuffle(base_combinations)

    # 2. Rellenar hasta N_PRENDAS (50) de forma balanceada
    combinations = list(base_combinations)
    while len(combinations) < N_PRENDAS:
        pos = POSITIONS[len(combinations) % len(POSITIONS)]
        aes = AESTHETICS[(len(combinations) // len(POSITIONS)) % len(AESTHETICS)]
        combinations.append((pos, aes))

    for idx, (pos, aes) in enumerate(combinations[:N_PRENDAS]):
        colors = PALETTE_HEX.get(aes, ["#111111", "#EEEEEE"])
        hex_color = colors[idx % len(colors)]
        slug = f"capsule-{pos}-{aes.lower().replace(' ', '-')}-{idx + 1}"

        # Embedding determinista normalizado
        vec = [rng.uniform(-0.1, 0.1) for _ in range(EMBEDDING_DIM)]
        norm = sum(x * x for x in vec) ** 0.5 or 1.0
        normalized_emb = [round(x / norm, 4) for x in vec]

        rows.append(
            {
                "id": str(uuid4()),
                "owner_id": None,
                "category": f"{pos}_{aes.lower().replace(' ', '_')}",
                "position": pos,
                "image_path": f"capsule/{slug}.png",
                "processed_image_path": f"capsule/{slug}_proc.png",
                "dominant_colors": [
                    {
                        "name": "principal",
                        "hex": hex_color,
                        "rgb": [
                            int(hex_color[1:3], 16),
                            int(hex_color[3:5], 16),
                            int(hex_color[5:7], 16),
                        ],
                        "percentage": 85.0,
                    }
                ],
                "top_aesthetics": [
                    {"aesthetic": aes, "confidence": 0.92},
                    {"aesthetic": "Casual", "confidence": 0.45},
                ],
                "embedding": normalized_emb,
                "_position": pos,
                "_aesthetic": aes,
            }
        )
    return rows


def verify_coverage(rows: list[dict]) -> None:
    """Verifica cobertura estricta de 4 posiciones y 5 estéticas."""
    positions = {r["_position"] for r in rows}
    aesthetics = {r["_aesthetic"] for r in rows}

    faltan_pos = set(POSITIONS) - positions
    faltan_aes = set(AESTHETICS) - aesthetics

    if faltan_pos or faltan_aes:
        raise SeedCoverageError(
            f"Falta cobertura mínima requerida: posiciones faltantes={faltan_pos}, "
            f"estéticas faltantes={faltan_aes}"
        )


def _insert_rows(session: Session, rows: list[dict]) -> int:
    from domain.models import Garment

    inserted = 0
    for r in rows:
        exists = (
            session.query(Garment)
            .filter(
                Garment.image_path == r["image_path"],
                Garment.owner_id.is_(None),
            )
            .first()
        )
        if not exists:
            garment = Garment(
                id=r["id"],
                owner_id=r["owner_id"],
                category=r["category"],
                position=r["position"],
                image_path=r["image_path"],
                processed_image_path=r["processed_image_path"],
                dominant_colors=r["dominant_colors"],
                top_aesthetics=r["top_aesthetics"],
                embedding=r["embedding"],
            )
            session.add(garment)
            inserted += 1

    session.commit()
    print(
        f"[OK] Seed cápsula completado: {inserted} prendas insertadas "
        f"con cobertura verificada ({len(POSITIONS)}x{len(AESTHETICS)})."
    )
    return inserted


def run(database_url: str | None = None, session: Session | None = None) -> int:
    """Ejecuta el seed en la base de datos con verificación previa de cobertura."""
    rows = build_seed_rows()
    verify_coverage(rows)

    if session is not None:
        return _insert_rows(session, rows)

    from db.session import SessionLocal

    with SessionLocal() as db_session:
        return _insert_rows(db_session, rows)


def main() -> int:
    try:
        run(os.getenv("DATABASE_URL"))
    except SeedCoverageError as exc:
        print(f"[ERR] Seed abortado por falta de cobertura: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
