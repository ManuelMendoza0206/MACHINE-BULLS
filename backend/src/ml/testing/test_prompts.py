"""Tests de los prompts de CLIP (historia bccv).

Viven aparte porque el spec de `garment-analysis-service` §6 trata los prompts
como archivo propio (`prompts.py`), separado del clasificador. Esta es la misma
separacion.
"""

from __future__ import annotations

import pytest

from ml.models.clip_classifier import TEMPLATES as T_CLASIFICADOR
from ml.models.prompts import (
    NIVELES,
    TEMPLATES,
    expandir_prompts,
    prompts_planos,
    prompts_por_clase,
    slices_por_clase,
)


def test_cada_nivel_tiene_tres_redacciones() -> None:
    for nivel in NIVELES:
        assert len(TEMPLATES[nivel]) == 3


def test_expandir_reemplaza_clase_en_todos_los_templates() -> None:
    for nivel in NIVELES:
        prompts = expandir_prompts(nivel, "handbag")
        assert len(prompts) == len(TEMPLATES[nivel])
        assert all("handbag" in p for p in prompts)
        assert not any("{c}" in p for p in prompts)


def test_subcategoria_fija_bolso() -> None:
    # SUBCATEGORIA evalua subtipos de bolso, asi que el "bag" va fijo. Si alguien
    # lo saca, la celda de subcategoria del notebook evalua otra cosa.
    assert all("bag" in p for p in expandir_prompts("SUBCATEGORIA", "boston"))


def test_nivel_desconocido_falla() -> None:
    with pytest.raises(KeyError):
        expandir_prompts("INVENTADO", "handbag")


def test_clase_vacia_falla_antes_de_generar_prompt_roto() -> None:
    with pytest.raises(ValueError, match="vacia"):
        expandir_prompts("CATEGORIA", "   ")


def test_templates_estan_ordenados() -> None:
    # El ensemble promedia en el orden de la lista y compara contra el primero
    # como base. Reordenar cambiaria los numeros del reporte.
    assert TEMPLATES["CATEGORIA"][0] == "a photo of a {c}"
    assert TEMPLATES["SUBCATEGORIA"][0] == "a photo of a {c} bag"


def test_prompts_por_clase_respeta_el_orden() -> None:
    grupos = prompts_por_clase(["handbag", "boston"], "SUBCATEGORIA")
    assert len(grupos) == 2
    assert "boston" in grupos[1][0]


def test_prompts_planos_es_clase_major() -> None:
    planos = prompts_planos(["a", "b"], "CATEGORIA")
    assert len(planos) == 6
    assert "a" in planos[0]
    assert "b" in planos[3]


def test_slices_cubren_la_lista_plana() -> None:
    clases = ["a", "b", "c"]
    slices = slices_por_clase(clases, "CATEGORIA")
    planos = prompts_planos(clases, "CATEGORIA")
    assert [(s.start, s.stop) for s in slices] == [(0, 3), (3, 6), (6, 9)]
    for s in slices:
        assert all(planos[i] for i in range(s.start, s.stop))
    assert slices[-1].stop == len(planos)


def test_slices_sin_clases_da_lista_vacia() -> None:
    assert slices_por_clase([], "CATEGORIA") == []


def test_clip_classifier_reexporta_la_misma_fuente() -> None:
    # Si alguien vuelve a definir TEMPLATES en el clasificador, el notebook y el
    # modulo evaluador pueden divergir del doc de prompts sin que nada lo note.
    assert T_CLASIFICADOR is TEMPLATES
