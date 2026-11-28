"""Pruebas unitarias para el soporte end-to-end de las 6 prendas CLIP (analyzer + dominio + motor)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from PIL import Image

from domain.enums import CATEGORY_TO_POSITION, CLIP_CATEGORIES, GarmentPosition
from ml.models.clip_classifier import ClipClassifier
from services.garment_analysis import analyzer
from services.recommender.engine import recommend_outfits, remix_outfit


@pytest.mark.unit
def test_enum_mapea_las_seis_clases_clip() -> None:
    assert set(CLIP_CATEGORIES) == {"top", "bottom", "dress", "outwear", "shoes", "bag"}
    for cat in CLIP_CATEGORIES:
        pos = CATEGORY_TO_POSITION.get(cat)
        assert isinstance(pos, GarmentPosition)
    assert GarmentPosition.DRESS.value == "dress"
    assert GarmentPosition.BAG.value == "bag"


@pytest.mark.unit
def test_prepare_for_clip_aplica_padding_cuadrado_blanco() -> None:
    # Vestido vertical 80x240 RGBA -> debe convertirse en RGB cuadrado 240x240 con bordes blancos
    vertical = Image.new("RGBA", (80, 240), (180, 20, 40, 255))
    cuadrado = analyzer._prepare_for_clip(vertical)
    assert cuadrado.mode == "RGB"
    assert cuadrado.size == (240, 240)
    # Esquina izquierda es padding blanco agregado (no recorte)
    assert cuadrado.getpixel((5, 120)) == (255, 255, 255)
    # Centro conserva el color de la prenda
    assert cuadrado.getpixel((120, 120)) == (180, 20, 40)


@pytest.mark.unit
def test_classify_category_detailed_soporta_seis_clases_y_subcategoria(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_clf = SimpleNamespace(model=object(), processor=object(), device="cpu")
    monkeypatch.setattr(analyzer, "get_classifier", lambda: fake_clf)

    def _fake_probs_factory(target_prompt_substring: str):
        def _fake_probs(
            model: Any,
            processor: Any,
            image: Image.Image,
            textos: list[str],
            device: str,
        ) -> list[float]:
            out = []
            for t in textos:
                out.append(0.85 if target_prompt_substring in t else 0.01)
            total = sum(out) or 1.0
            return [p / total for p in out]

        return _fake_probs

    img = Image.new("RGB", (60, 140), (10, 10, 10))

    monkeypatch.setattr(ClipClassifier, "probs_imagen", staticmethod(_fake_probs_factory("jumpsuit")))
    cat, sub, conf, probs = analyzer.classify_category_detailed(img)
    assert cat == "dress"
    assert sub == "jumpsuit"
    assert conf > 0.7
    assert set(probs.keys()) == set(CLIP_CATEGORIES)

    monkeypatch.setattr(ClipClassifier, "probs_imagen", staticmethod(_fake_probs_factory("backpack")))
    cat_b, sub_b, _conf_b, _probs_b = analyzer.classify_category_detailed(img)
    assert cat_b == "bag"
    assert sub_b == "backpack"

    monkeypatch.setattr(ClipClassifier, "probs_imagen", staticmethod(_fake_probs_factory("blazer")))
    cat_o, sub_o, _conf_o, _probs_o = analyzer.classify_category_detailed(img)
    assert cat_o == "outwear"
    assert sub_o == "blazer"


@pytest.mark.unit
def test_recommender_ancla_dress_y_bag_y_remix_dress() -> None:
    garments = [
        {
            "id": "vestido-negro",
            "position": "dress",
            "colors": [{"h": 0.0, "s": 5.0, "v": 15.0, "hex": "#1a1a1a", "mass": 1.0}],
            "embedding": [1.0, 0.0],
            "aesthetic": "elegant",
        },
        {
            "id": "blazer-beige",
            "position": "outerwear",
            "colors": [{"h": 35.0, "s": 25.0, "v": 85.0, "hex": "#d9c6b0", "mass": 1.0}],
            "embedding": [0.9, 0.1],
            "aesthetic": "elegant",
        },
        {
            "id": "tacones-negros",
            "position": "footwear",
            "colors": [{"h": 0.0, "s": 5.0, "v": 10.0, "hex": "#111111", "mass": 1.0}],
            "embedding": [0.85, 0.15],
            "aesthetic": "elegant",
        },
        {
            "id": "bolso-dorado",
            "position": "bag",
            "colors": [{"h": 45.0, "s": 40.0, "v": 75.0, "hex": "#bfa35a", "mass": 1.0}],
            "embedding": [0.8, 0.2],
            "aesthetic": "elegant",
        },
        {
            "id": "camisa-extra",
            "position": "top",
            "colors": [{"h": 200.0, "s": 50.0, "v": 80.0, "hex": "#4488cc", "mass": 1.0}],
            "embedding": [0.1, 0.9],
            "aesthetic": "casual",
        },
    ]

    # Sin bottoms, igual arma outfit valido anclado en dress (+ outerwear/footwear/bag) y nunca mezcla top
    outfits = recommend_outfits(garments)
    assert len(outfits) >= 1
    top_outfit = outfits[0]
    pos_set = {g["position"] for g in top_outfit["garments"]}
    assert "dress" in pos_set
    assert "top" not in pos_set
    assert "bottom" not in pos_set
    assert "bag" in pos_set or any("bag" in {g["position"] for g in o["garments"]} for o in outfits)

    # Remix fijando el dress respeta exclusion de top/bottom y puede fijar bolso
    remixed = remix_outfit(garments, pinned_garment_ids=["vestido-negro", "bolso-dorado"])
    assert len(remixed) >= 1
    for o in remixed:
        ids = {g["id"] for g in o["garments"]}
        assert {"vestido-negro", "bolso-dorado"}.issubset(ids)
        assert "camisa-extra" not in ids
