"""Tests del selector de mask_type del Layer Manager (svc vton.pipeline).

Puros: no tocan DB ni GPU consola. Cubren la regla del compuesto iterativo:
cada capa pide la mask que protege lo ya vestido / que reservara para lo que
viene despues (4.1.2 del product goal: composicion secuencial).
"""

from __future__ import annotations

from services.vton.pipeline import _mask_type_para


def _capas(*posiciones: str) -> list[tuple[str, str]]:
    return [("", pos) for pos in posiciones]


def test_bottom_siempre_lower() -> None:
    assert _mask_type_para("bottom", _capas()) == "lower"
    assert _mask_type_para("bottom", _capas("outerwear")) == "lower"


def test_dress_siempre_overall() -> None:
    assert _mask_type_para("dress", _capas()) == "overall"


def test_top_ultimo_en_torso_usa_upper() -> None:
    """Sin capas de torso despues: mask clasica upper."""
    assert _mask_type_para("top", _capas()) == "upper"
    assert _mask_type_para("top", _capas("bottom")) == "upper"


def test_top_bajo_outerwear_usa_inner() -> None:
    """Remera con chaqueta encima: `inner` protege el compuesto exterior."""
    assert _mask_type_para("top", _capas("outerwear")) == "inner"
    assert _mask_type_para("top", _capas("bottom", "outerwear")) == "inner"


def test_top_sobre_top_usa_inner() -> None:
    """Dos prendas de torso (remera + polera): la primera pasa a interior."""
    assert _mask_type_para("top", _capas("top")) == "inner"


def test_outerwear_siempre_outer() -> None:
    """La capa exterior protege lo ya vestido del compuesto anterior."""
    assert _mask_type_para("outerwear", _capas()) == "outer"
    assert _mask_type_para("outerwear", _capas("top")) == "outer"


def test_cadena_completa_paso_a_paso() -> None:
    """Outfit real pants+remera+polera+chaqueta: la secuencia dice que mask."""
    secuencia = ("bottom", "top", "top", "outerwear")
    mask_esperadas = ("lower", "inner", "inner", "outer")
    for i, posicion in enumerate(secuencia):
        restantes = _capas(*secuencia[i + 1 :])
        assert _mask_type_para(posicion, restantes) == mask_esperadas[i]
