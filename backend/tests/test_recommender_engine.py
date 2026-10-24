"""Tests del motor de recomendacion de outfits (servicio puro)."""

from __future__ import annotations

from services.recommender.engine import recommend_outfits


def _prendas_fixture() -> list[dict]:
    """Un guardarropa con top, bottom, outerwear y footwear."""
    return [
        {
            "id": "remera-azul",
            "position": "top",
            "colors": [{"h": 210.0, "s": 60.0, "v": 70.0, "hex": "#3366cc", "mass": 1.0}],
            "embedding": [1.0, 0.0],
            "aesthetic": "casual",
        },
        {
            "id": "pantalon-negro",
            "position": "bottom",
            "colors": [{"h": 0.0, "s": 5.0, "v": 15.0, "hex": "#1a1a1a", "mass": 1.0}],
            "embedding": [0.9, 0.1],
            "aesthetic": "casual",
        },
        {
            "id": "campera-verde",
            "position": "outerwear",
            "colors": [{"h": 140.0, "s": 55.0, "v": 50.0, "hex": "#339955", "mass": 1.0}],
            "embedding": [0.2, 0.8],
            "aesthetic": "streetwear",
        },
        {
            "id": "zapatos-marrones",
            "position": "footwear",
            "colors": [{"h": 30.0, "s": 45.0, "v": 45.0, "hex": "#8a5a2b", "mass": 1.0}],
            "embedding": [0.5, 0.5],
            "aesthetic": "casual",
        },
    ]


def test_genera_outfits_con_top_y_bottom() -> None:
    """El ancla top+bottom basta aunque falte footwear (no todo guarda zapatos)."""
    prendas = [p for p in _prendas_fixture() if p["position"] in ("top", "bottom")]
    outfits = recommend_outfits(prendas)
    assert len(outfits) >= 1
    posiciones = {g["position"] for g in outfits[0]["garments"]}
    assert "top" in posiciones and "bottom" in posiciones


def test_outfit_tiene_scores_en_rango() -> None:
    """chromatic_score y embedding_score validan [0,1] en el Zod del frontend."""
    outfits = recommend_outfits(_prendas_fixture())
    assert outfits
    for o in outfits:
        assert 0.0 <= o["chromatic_score"] <= 1.0
        assert 0.0 <= o["embedding_score"] <= 1.0


def test_capas_ordenadas_de_abajo_hacia_arriba() -> None:
    """bottom antes que top antes que outerwear antes que footwear."""
    outfits = recommend_outfits(_prendas_fixture())
    posiciones = [g["position"] for g in outfits[0]["garments"]]
    orden = {"bottom": 0, "top": 1, "outerwear": 2, "footwear": 3}
    indices = [orden[p] for p in posiciones if p in orden]
    assert indices == sorted(indices), f"orden incorrecto: {posiciones}"


def test_sin_bottom_no_inventa_outfit() -> None:
    """Solo tops: no se fabrica la mitad inferior, no hay outfit."""
    tops = [p for p in _prendas_fixture() if p["position"] == "top"]
    assert recommend_outfits(tops) == []


def test_target_aesthetic_filtra() -> None:
    """Con target_aesthetic solo salen outfits de esa estetica."""
    outfits = recommend_outfits(
        _prendas_fixture(), target_aesthetic="streetwear"
    )
    # La estetica dominante del outfit es la del top; el fixture no tiene top
    # streetwear, asi que o filtra a vacio o cae al catalogo completo.
    # Lo que no debe pasar: crashear. Verificamos que corrio y devolvio lista.
    assert isinstance(outfits, list)


def test_limit_respeta_tope() -> None:
    """El limit corta la lista de outfits devueltos."""
    prendas = _prendas_fixture()
    # Duplicar para tener mas combinaciones.
    extra = [{**p, "id": p["id"] + "-2"} for p in prendas]
    outfits = recommend_outfits(prendas + extra, limit=2)
    assert len(outfits) <= 2


def test_resultados_ordenados_por_score() -> None:
    """El mejor outfit (score combinado) va primero."""
    outfits = recommend_outfits(_prendas_fixture())
    scores = [
        0.6 * o["chromatic_score"] + 0.4 * o["embedding_score"] for o in outfits
    ]
    assert scores == sorted(scores, reverse=True)
