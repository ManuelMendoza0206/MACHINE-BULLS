"""Tests de extraccion de colores dominantes (servicio puro, sin CLIP)."""

from __future__ import annotations

import colorsys

from PIL import Image

from services.garment_analysis.color_extraction import dominant_colors


def _imagen_color(r: int, g: int, b: int, tam: int = 64) -> Image.Image:
    return Image.new("RGB", (tam, tam), (r, g, b))


def _rgb_desde_hex(hex_str: str) -> tuple[int, int, int]:
    return (int(hex_str[1:3], 16), int(hex_str[3:5], 16), int(hex_str[5:7], 16))


def _hsv_desde_rgb(r: int, g: int, b: int) -> tuple[float, float, float]:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (h * 360, s * 100, v * 100)


def test_color_solido_devuelve_un_color() -> None:
    """Una imagen de un solo color devuelve ese color como dominante."""
    resultado = dominant_colors(_imagen_color(200, 30, 40))
    assert len(resultado) >= 1
    r, g, b = _rgb_desde_hex(resultado[0]["hex"])
    _, s, v = _hsv_desde_rgb(r, g, b)
    # El rojo puro (200,30,40) tiene hue bajo (~357), sat y val altos.
    assert resultado[0]["h"] >= 340 or resultado[0]["h"] <= 20
    assert s > 50
    assert v > 50


def test_contrato_zod_h_s_v_en_rango() -> None:
    """h en [0,360], s/v en [0,100], hex con forma #rrggbb (lo exige el Zod)."""
    # Mezcla de dos colores para forzar >1 color.
    img = Image.new("RGB", (64, 64))
    for x in range(64):
        for y in range(64):
            img.putpixel((x, y), (30, 90, 200) if x < 32 else (230, 200, 40))
    for color in dominant_colors(img):
        assert 0.0 <= color["h"] <= 360.0
        assert 0.0 <= color["s"] <= 100.0
        assert 0.0 <= color["v"] <= 100.0
        assert color["hex"].startswith("#")
        assert len(color["hex"]) == 7
        int(color["hex"][1:], 16)  # no debe lanzar


def test_fondo_blanco_no_domina() -> None:
    """El filtro descarta blanco casi puro: el color de la prenda manda.

    Simula una foto de producto: fondo blanco que ocupa la mayoria de pixeles,
    prenda azul en el centro. Sin el filtro, el dominante seria el blanco.
    """
    img = Image.new("RGB", (100, 100), (255, 255, 255))
    for x in range(30, 70):
        for y in range(30, 70):
            img.putpixel((x, y), (20, 40, 200))  # azul
    resultado = dominant_colors(img, max_colors=3)
    hexes = [c["hex"] for c in resultado]
    assert "#ffffff" not in hexes, f"el fondo blanco filtro paso: {hexes}"
    # Debe aparecer el azul (o algo con azul dominante).
    assert any(
        _rgb_desde_hex(c["hex"])[2] > _rgb_desde_hex(c["hex"])[0] for c in resultado
    )


def test_max_colors_respeta_tope() -> None:
    img = Image.new("RGB", (100, 100))
    colores = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (0, 255, 255)]
    # Banda por fila para que haya varios colores con masa parecida.
    for y in range(100):
        c = colores[y // 20]
        for x in range(100):
            img.putpixel((x, y), c)
    resultado = dominant_colors(img, max_colors=2)
    assert len(resultado) <= 2


def test_imagen_totalmente_neutra_no_devuelve_vacio() -> None:
    """Blanco puro: el Zod exige min 1 color, no puede quedar lista vacia."""
    resultado = dominant_colors(_imagen_color(255, 255, 255))
    assert len(resultado) >= 1
