"""Tests de los builders de test (tests/factories.py) — E1-T2.

Si un builder se rompe, todos los tests que lo componen fallarian por la
razon equivocada; estos casos fijan su contrato.
"""

from __future__ import annotations

import io

import pytest
from factories import (
    color,
    hex_de,
    imagen_1x1,
    imagen_corrupta,
    imagen_jpg,
    imagen_png,
    imagen_rgba,
    imagen_truncada,
    job_db,
    outfit_db,
    position_to_hue,
    prenda,
    prenda_db,
    usuario,
)
from PIL import Image


def test_imagen_jpg_valida_y_listo_para_upload() -> None:
    nombre, buf = imagen_jpg(color=(200, 30, 30))
    assert nombre.endswith(".jpg")
    assert buf.name == nombre  # el stub de conftest lee buf.name
    img = Image.open(buf)
    img.verify()  # JPEG integro
    buf.seek(0)
    assert img.size == (64, 64)


def test_imagenes_de_borde_1x1_y_rgba_transparente() -> None:
    _, una = imagen_1x1()
    assert Image.open(una).size == (1, 1)

    _, transparente = imagen_rgba(alpha=0)
    assert Image.open(transparente).mode == "RGBA"


def test_imagen_corrupta_y_truncada_no_decodifican() -> None:
    # UnidentifiedImageError (PIL) hereda de OSError: excepcion concreta, no
    # un `except Exception` ciego.
    _, corrupta = imagen_corrupta()
    with pytest.raises(OSError):
        Image.open(corrupta).verify()

    _, truncada = imagen_truncada()
    datos = truncada.getvalue()
    assert datos.startswith(b"\xff\xd8")  # cabecera JPEG real...
    with pytest.raises(OSError):
        # ...pero truncada: no valida como imagen completa.
        Image.open(io.BytesIO(datos)).verify()


def test_png_distinto_a_jpg() -> None:
    _, png = imagen_png()
    assert Image.open(png).format == "PNG"


def test_color_y_hex_coherentes() -> None:
    c = color(210.0, 60.0, 70.0, mass=0.6)
    assert c["hex"] == hex_de(210.0, 60.0, 70.0)
    assert c["hex"].startswith("#") and len(c["hex"]) == 7
    assert c["mass"] == 0.6


def test_position_to_hue_distinto_por_posicion() -> None:
    hues = {p: position_to_hue(p) for p in ("top", "bottom", "outerwear", "footwear")}
    assert len(set(hues.values())) == 4


def test_prenda_defaults_sanos_y_degenerados() -> None:
    p = prenda()
    assert {"id", "position", "aesthetic", "colors", "embedding", "status"} <= p.keys()
    assert p["colors"] and p["embedding"]
    assert p["status"] == "AVAILABLE"

    # Variantes degeneradas explicitas (camino horrendo): el builder las respeta.
    assert prenda(colors=[], embedding=[])["colors"] == []
    assert prenda(status="LAUNDRY")["status"] == "LAUNDRY"

    # Ids unicos por override para varias prendas de la misma posicion.
    a = prenda(id="a")
    b = prenda(id="b")
    assert a["id"] != b["id"]


def test_entidades_orm_flush_y_exponen_id() -> None:
    from db.session import SessionLocal

    session = SessionLocal()
    try:
        user = usuario(session)
        assert user.id and user.email

        g = prenda_db(session, owner_id=user.id, category="bottom", position="bottom")
        assert g.id and g.owner_id == user.id

        o = outfit_db(session, user_id=user.id)
        assert o.id and o.user_id == user.id

        j = job_db(session, user_id=user.id, outfit_id=o.id, status="failed")
        assert j.id and j.status == "failed"
        session.commit()
    finally:
        session.close()
