"""Builders de datos para tests (E1-T2 del plan de endurecimiento).

Componer variantes "horrendas" (imagenes corruptas, prendas incompletas,
embeddings rotos, entidades directas en DB) sin copiar setup de test en test.

Convenciones:

- Todo builder devuelve valores NUEVOS en cada llamada (sin estado compartido):
  seguro en tests paralelos y en cualquier orden.
- Los dicts siguen el contrato que consume `services.recommender` (position,
  aesthetic, colors, embedding, status); los ORM son fixtures minimas con
  `flush` (el caller decide el commit).
"""

from __future__ import annotations

import colorsys
import io
import uuid
from typing import Any

from PIL import Image

# --- Imagenes ---------------------------------------------------------------


def _a_buf(img: Image.Image, nombre: str, fmt: str) -> tuple[str, io.BytesIO]:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    buf.name = nombre
    return buf.name, buf


def imagen_jpg(
    color: tuple[int, int, int] = (30, 60, 200),
    size: tuple[int, int] = (64, 64),
    nombre: str = "prenda.jpg",
) -> tuple[str, io.BytesIO]:
    """JPEG valido (cuadro liso del color dado), listo para upload."""
    return _a_buf(Image.new("RGB", size, color), nombre, "JPEG")


def imagen_png(
    color: tuple[int, int, int] = (30, 60, 200),
    size: tuple[int, int] = (64, 64),
    nombre: str = "prenda.png",
) -> tuple[str, io.BytesIO]:
    """PNG valido."""
    return _a_buf(Image.new("RGB", size, color), nombre, "PNG")


def imagen_1x1(color: tuple[int, int, int] = (10, 10, 10)) -> tuple[str, io.BytesIO]:
    """Borde de tamano: la imagen mas chica posible."""
    return imagen_jpg(color=color, size=(1, 1), nombre="pixel.jpg")


def imagen_rgba(alpha: int = 0, size: tuple[int, int] = (32, 32)) -> tuple[str, io.BytesIO]:
    """PNG con canal alfa (`alpha=0` = totalmente transparente)."""
    img = Image.new("RGBA", size, (255, 255, 255, alpha))
    return _a_buf(img, "transparente.png", "PNG")


def imagen_corrupta(nombre: str = "basura.jpg") -> tuple[str, io.BytesIO]:
    """Bytes con extension de imagen que NO decodifican."""
    buf = io.BytesIO(b"esto no es una imagen, solo bytes random \x00\x01\x02")
    buf.seek(0)
    buf.name = nombre
    return buf.name, buf


def imagen_truncada(nombre: str = "truncada.jpg") -> tuple[str, io.BytesIO]:
    """Cabecera JPEG real cortada a la mitad (archivo truncado)."""
    _, completa = imagen_jpg()
    datos = completa.getvalue()[: len(completa.getvalue()) // 2]
    buf = io.BytesIO(datos)
    buf.seek(0)
    buf.name = nombre
    return buf.name, buf


# --- Diccionarios de dominio (recommender / scorers) ------------------------


def hex_de(h: float, s: float, v: float) -> str:
    """HSV (0-360, 0-100, 0-100) -> hex #rrggbb, coherente con el extractor."""
    r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, min(max(s, 0), 100) / 100, min(max(v, 0), 100) / 100)
    return f"#{round(r * 255):02x}{round(g * 255):02x}{round(b * 255):02x}"


def color(
    h: float, s: float = 50.0, v: float = 60.0, mass: float = 1.0
) -> dict[str, Any]:
    """Color dominante con hex derivado (nada de hexes inconsistentes a mano)."""
    return {"h": h, "s": s, "v": v, "hex": hex_de(h, s, v), "mass": mass}


def prenda(
    id: str | None = None,
    position: str = "top",
    aesthetic: str = "casual",
    colors: list[dict] | None = None,
    embedding: list[float] | None = None,
    status: str = "AVAILABLE",
    **extra: Any,
) -> dict[str, Any]:
    """Prenda minima valida para el motor de recomendacion.

    Defaults deterministicos por posicion; para varias prendas de la misma
    posicion pasar `id` distinto (el default es `prenda-<position>`).
    `colors`/`embedding` en `None` = defaults sanos; pasar `[]` o `[0.0]*0`
    para los casos degenerados.
    """
    return {
        "id": id or f"prenda-{position}",
        "position": position,
        "aesthetic": aesthetic,
        "colors": colors if colors is not None else [color(position_to_hue(position))],
        "embedding": embedding if embedding is not None else [1.0, 0.0],
        "status": status,
        **extra,
    }


def position_to_hue(position: str) -> float:
    """Hue determinista y distinto por posicion (para contrastes realistas)."""
    return {"top": 210.0, "bottom": 0.0, "outerwear": 140.0, "footwear": 30.0}.get(position, 270.0)


# --- Entidades ORM (DB de test) ---------------------------------------------


def usuario(session: Any, id: str | None = None, email: str | None = None) -> Any:
    """User con id/email unicos; hace flush (no commit) para exponer el id."""
    from domain.models import User

    sufijo = uuid.uuid4().hex[:12]
    user = User(id=id or f"user-{sufijo}", email=email or f"user-{sufijo}@test.local")
    session.add(user)
    session.flush()
    return user


def prenda_db(
    session: Any,
    owner_id: str | None = None,
    category: str = "top",
    position: str | None = "top",
    image_path: str = "humans/test.jpg",
    processed_image_path: str | None = None,
    **extra: Any,
) -> Any:
    """Garment persistido (minimo no-nulo del modelo); flush para exponer id."""
    from domain.models import Garment

    garment = Garment(
        owner_id=owner_id,
        category=category,
        position=position,
        image_path=image_path,
        processed_image_path=processed_image_path or image_path,
        **extra,
    )
    session.add(garment)
    session.flush()
    return garment


def outfit_db(
    session: Any,
    user_id: str,
    aesthetic: str = "casual",
    chromatic_score: float = 0.85,
    embedding_score: float = 0.85,
    **extra: Any,
) -> Any:
    """Outfit persistido; flush para exponer id."""
    from domain.models import Outfit

    outfit = Outfit(
        user_id=user_id,
        aesthetic=aesthetic,
        chromatic_score=chromatic_score,
        embedding_score=embedding_score,
        **extra,
    )
    session.add(outfit)
    session.flush()
    return outfit


def job_db(
    session: Any,
    user_id: str,
    outfit_id: str | None = None,
    status: str = "processing",
    **extra: Any,
) -> Any:
    """VtonJob persistido en un estado dado (para status/historial/permisos)."""
    from domain.models import VtonJob

    job = VtonJob(user_id=user_id, outfit_id=outfit_id, status=status, **extra)
    session.add(job)
    session.flush()
    return job
