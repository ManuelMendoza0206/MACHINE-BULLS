"""Tests del score de armonia cromatica (servicio puro)."""

from __future__ import annotations

from services.recommender.chromatic_scorer import (
    embedding_score,
    score_outfit,
    score_pair,
)


def _color(h: float, s: float = 60.0, v: float = 70.0, mass: float = 1.0) -> dict:
    return {"h": h, "s": s, "v": v, "hex": "#000000", "mass": mass}


def test_mismo_color_armonico() -> None:
    """Dos prendas del mismo hue y valor: armonia alta.

    No llega a 1.0 a proposito: mismo valor en ambas capas no aporta contraste
    (el componente de valor da neutro 0.5), que es lo que hace legible un
    outfit monocromatico real.
    """
    score = score_pair([_color(200)], [_color(200)])
    assert score > 0.85


def test_analogos_puntuian_mas_que_opuestos() -> None:
    """Hues cercanos (analogos) superan a la dupla rojo-verde (~120, discordante)."""
    analogos = score_pair([_color(200)], [_color(220)])
    discordantes = score_pair([_color(0)], [_color(120)])
    assert analogos > discordantes


def test_complementarios_puntuian_alto() -> None:
    """Rojo (0) + cian (180) es armonia canonica clasica."""
    score = score_pair([_color(0)], [_color(180)])
    assert score > 0.7


def test_neutrales_combinan_con_todo() -> None:
    """Gris/negro/blanco (s baja) no discorda jamas."""
    gris = {"h": 0.0, "s": 5.0, "v": 50.0, "hex": "#808080", "mass": 1.0}
    score = score_pair([gris], [_color(45)])
    assert score > 0.7


def test_score_en_rango() -> None:
    """El Zod valida chromatic_score en [0,1]: nunca puede salirse."""
    for a, b in [((0), (0)), ((0), (120)), ((0), (270)), ((30), (200))]:
        s = score_pair([_color(a)], [_color(b)])
        assert 0.0 <= s <= 1.0


def test_vacio_es_neutral_no_cero() -> None:
    """Sin datos cromaticos devuelve neutral (0.5), no castiga el outfit."""
    assert score_pair([], [_color(10)]) == 0.5


def test_outfit_una_prenda_no_se_castiga() -> None:
    """Una sola prenda no puede discordar consigo misma."""
    assert score_outfit([{"colors": [_color(10)]}]) == 0.8


def test_outfit_en_rango() -> None:
    outfit = [
        {"colors": [_color(200)]},
        {"colors": [_color(40)]},
        {"colors": [_color(120)]},
    ]
    s = score_outfit(outfit)
    assert 0.0 <= s <= 1.0


def test_embedding_score_identico_es_maximo() -> None:
    """Dos embeddings iguales: coseno 1 -> score 1 tras el shift a [0,1]."""
    emb = [[1.0, 0.0, 0.0]] * 2
    assert embedding_score(emb) == 1.0


def test_embedding_score_ortogonal_en_rango() -> None:
    """Vectores ortogonales (coseno 0) -> 0.5 tras el shift."""
    s = embedding_score([[1.0, 0.0], [0.0, 1.0]])
    assert abs(s - 0.5) < 1e-6


def test_embedding_score_uno_solo() -> None:
    """Sin pares no hay similitud que medir: valor neutro."""
    assert embedding_score([[1.0, 2.0]]) == 0.5
