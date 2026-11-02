"""Tests unitarios para el servicio de remocion de fondo de prendas (rembg)."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

from PIL import Image

from services.garment_analysis import background_remover
from services.garment_analysis.background_remover import (
    is_rembg_available,
    remove_background,
)


def test_is_rembg_available_devuelve_bool() -> None:
    """Verifica que el estado de disponibilidad sea un valor booleano."""
    disp = is_rembg_available()
    assert isinstance(disp, bool)


def test_remove_background_devuelve_formato_rgba_en_fallback(
    monkeypatch: Any,
) -> None:
    """Si rembg no esta disponible o falla, devuelve la imagen convertida a RGBA sin lanzar excepcion."""
    monkeypatch.setattr(background_remover, "is_rembg_available", lambda: False)

    img_rgb = Image.new("RGB", (64, 64), (100, 150, 200))
    res = remove_background(img_rgb)

    assert isinstance(res, Image.Image)
    assert res.mode == "RGBA"
    assert res.size == (64, 64)


def test_remove_background_con_mock_rembg(monkeypatch: Any) -> None:
    """Simula una sesion exitosa de rembg recortando el fondo a transparente."""
    img_recortada = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for x in range(20, 44):
        for y in range(20, 44):
            img_recortada.putpixel((x, y), (255, 100, 50, 255))

    mock_remove = MagicMock(return_value=img_recortada)
    monkeypatch.setattr(background_remover, "is_rembg_available", lambda: True)
    monkeypatch.setattr(
        background_remover, "get_cloth_segmentation_session", lambda *args: MagicMock()
    )

    import rembg

    monkeypatch.setattr(rembg, "remove", mock_remove)

    img_in = Image.new("RGB", (64, 64), (255, 255, 255))
    res = remove_background(img_in)

    assert isinstance(res, Image.Image)
    assert res.mode == "RGBA"
    mock_remove.assert_called_once()
    # Verifica que el pixel central sea opaco y el del borde transparente
    assert res.getpixel((30, 30))[3] == 255
    assert res.getpixel((5, 5))[3] == 0


def test_remove_background_tolerante_a_fallos(monkeypatch: Any) -> None:
    """Si rembg.remove lanza una excepcion inesperada, aplica el fallback seguro a RGBA."""
    monkeypatch.setattr(background_remover, "is_rembg_available", lambda: True)

    def _failing_remove(*args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("ONNX inference failure")

    import rembg

    monkeypatch.setattr(rembg, "remove", _failing_remove)

    img_in = Image.new("RGB", (50, 50), (200, 50, 50))
    res = remove_background(img_in, fallback_to_original=True)

    assert isinstance(res, Image.Image)
    assert res.mode == "RGBA"
