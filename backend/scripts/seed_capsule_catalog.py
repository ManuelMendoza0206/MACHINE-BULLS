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


def _render_capsule_png(position: str, hex_color: str, transparent: bool) -> bytes:
    """Genera un PNG minimalista (512x512) acorde a la posicion y color de la prenda."""
    import io

    from PIL import Image, ImageDraw

    bg = (0, 0, 0, 0) if transparent else (246, 245, 242, 255)
    img = Image.new("RGBA", (512, 512), bg)
    draw = ImageDraw.Draw(img)

    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    fill = (r, g, b, 255)
    outline = (max(0, r - 35), max(0, g - 35), max(0, b - 35), 255)

    if position == "top":
        pts = [
            (166, 96), (210, 118), (302, 118), (346, 96),
            (432, 158), (396, 232), (350, 204), (350, 424),
            (162, 424), (162, 204), (116, 232), (80, 158),
        ]
        draw.polygon(pts, fill=fill, outline=outline)
    elif position == "outerwear":
        pts = [
            (150, 82), (216, 112), (296, 112), (362, 82),
            (446, 162), (424, 344), (370, 344), (368, 212),
            (362, 434), (150, 434), (144, 212), (142, 344),
            (88, 344), (66, 162),
        ]
        draw.polygon(pts, fill=fill, outline=outline)
        draw.line([(256, 116), (256, 434)], fill=outline, width=4)
    elif position == "bottom":
        pts = [
            (156, 76), (356, 76), (384, 438), (288, 438),
            (256, 224), (224, 438), (128, 438),
        ]
        draw.polygon(pts, fill=fill, outline=outline)
    else:  # footwear
        draw.rounded_rectangle([(96, 250), (416, 360)], radius=38, fill=fill, outline=outline, width=4)
        draw.polygon([(140, 254), (225, 168), (320, 240), (402, 266)], fill=fill, outline=outline)
        draw.rounded_rectangle([(92, 336), (420, 372)], radius=12, fill=(242, 242, 242, 255), outline=outline, width=3)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _upload_capsule_assets(rows: list[dict]) -> int:
    """Guarda localmente y sube a Azure Blob Storage los PNG del catalogo capsula."""
    from config import settings
    from services import storage

    container = None
    if settings.azure_storage_connection_string:
        container = storage.ensure_azure_container()

    uploaded = 0
    for r in rows:
        hex_color = r["dominant_colors"][0]["hex"]
        pos = r["position"]
        for rel_path, transparent in (
            (r["image_path"], False),
            (r["processed_image_path"], True),
        ):
            png_bytes = _render_capsule_png(pos, hex_color, transparent=transparent)
            local_file = settings.media_dir / rel_path
            local_file.parent.mkdir(parents=True, exist_ok=True)
            if not local_file.is_file():
                local_file.write_bytes(png_bytes)

            if container is not None:
                from azure.storage.blob import ContentSettings

                blob_client = container.get_blob_client(rel_path)
                if not blob_client.exists():
                    blob_client.upload_blob(
                        png_bytes,
                        overwrite=True,
                        content_settings=ContentSettings(content_type="image/png"),
                    )
                    uploaded += 1
    return uploaded


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


def run(database_url: str | None = None, session: Session | None = None, upload_assets: bool = False) -> int:
    """Ejecuta el seed en la base de datos con verificación previa de cobertura."""
    rows = build_seed_rows()
    verify_coverage(rows)

    if session is not None:
        return _insert_rows(session, rows)

    if upload_assets:
        uploaded = _upload_capsule_assets(rows)
        print(f"[OK] Assets capsula en Azure/local verificados (nuevos blobs subidos: {uploaded}).")

    from db.session import SessionLocal

    with SessionLocal() as db_session:
        return _insert_rows(db_session, rows)


def main() -> int:
    try:
        run(os.getenv("DATABASE_URL"), upload_assets=True)
    except SeedCoverageError as exc:
        print(f"[ERR] Seed abortado por falta de cobertura: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
