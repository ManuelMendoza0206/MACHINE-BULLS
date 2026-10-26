"""Tests del clasificador CLIP y del dataset de pares (historias bccv y bcdj).

Viven en src/ml/testing porque el AC de bcdj pide splits "validados": esta
archivo es esa validacion. En el notebook 03 el chequeo era un `assert len(v) > 0`,
que no descarta fuga entre train y val; aca la fuga es un fallo de test.

Ninguno de estos tests necesita GPU ni `torch`: el modulo importa las
dependencias pesadas de forma perezosa, asi que CI los puede correr.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from ml.models.clip_classifier import (
    NIVELES,
    TEMPLATES,
    derivar_pares,
    escribir_jsonl,
    expandir_prompts,
    leer_jsonl,
    split_por_texto,
    tipo_de_prenda,
    validar_splits,
)


def _catalogo(n: int) -> dict[str, dict[str, str]]:
    return {f"gid{i}": {"name": f"Prenda {i}", "type": "bag", "color": "Black"} for i in range(n)}


# --- prompts ---------------------------------------------------------------


def test_expandir_reemplaza_clase_en_todos_los_templates() -> None:
    for nivel in ("CATEGORIA", "SUBCATEGORIA"):
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


# --- derivacion de pares ---------------------------------------------------


def test_derivar_pares_usa_nombre_color_tipo() -> None:
    pares = derivar_pares({"g1": {"name": "Givenchy Bag", "type": "bag", "color": "Black"}})
    assert pares == [{"garment_id": "g1", "text": "Givenchy Bag, Black bag"}]


def test_derivar_pares_sin_color_no_deja_coma_sobra() -> None:
    pares = derivar_pares({"g1": {"name": "Givenchy Bag", "type": "bag"}})
    assert pares[0]["text"] == "Givenchy Bag, bag"


@pytest.mark.parametrize(
    "meta",
    [
        {"name": "", "type": "bag"},
        {"name": "Sin tipo", "type": ""},
        {"name": "   ", "type": "bag"},
    ],
)
def test_derivar_pares_descarta_prenda_texto_insuficiente(meta: dict[str, str]) -> None:
    assert derivar_pares({"g1": meta}) == []


def test_tipo_de_prenda_extrema_el_ultimo_segmento() -> None:
    par = {"garment_id": "g1", "text": "Black Skinny Jeans, Dark Blue pants"}
    assert tipo_de_prenda(par) == "Dark Blue pants"


def test_tipo_de_prenda_sin_coma() -> None:
    assert tipo_de_prenda({"garment_id": "g1", "text": "loose"}) == "loose"


# --- el bug que motiva el agrupamiento por texto ---------------------------


def test_split_por_texto_no_deja_fuga_de_texto() -> None:
    # Seis prendas distintas con la misma descripcion, mas texto suficiente para
    # llenar los tres splits. Partiendo por garment_id, los seis jeans caen en
    # train y en val a la vez.
    pares = [{"garment_id": f"j{i}", "text": "Jeans, Blue pants"} for i in range(6)]
    pares += [{"garment_id": f"g{i}", "text": f"Prenda {i}, Black bag"} for i in range(40)]
    splits = split_por_texto(pares, minimo=1)
    validar_splits(splits, minimo=1)

    donde = {n: {p["text"] for p in splits[n]} for n in NIVELES}
    for a in NIVELES:
        for b in NIVELES:
            if a < b:
                assert not donde[a] & donde[b], f"fuga de texto entre {a} y {b}"


def test_split_por_texto_manda_el_grupo_entero_a_un_split() -> None:
    pares = [{"garment_id": f"j{i}", "text": "Jeans, Blue pants"} for i in range(6)]
    pares += [{"garment_id": f"g{i}", "text": f"Prenda {i}, Black bag"} for i in range(40)]
    splits = split_por_texto(pares, minimo=1)
    con_jeans = [n for n in NIVELES if any("Jeans" in p["text"] for p in splits[n])]
    assert len(con_jeans) == 1, f"el grupo se partio entre {con_jeans}"


def test_split_por_texto_se_niega_a_partir_un_grupo_unico() -> None:
    # Un solo texto no puede llenar tres splits sin fugarse. Prefiere fallar a
    # repartir las seis prendas y que test se contamine con lo que vio train.
    with pytest.raises(ValueError, match="vacio"):
        split_por_texto(
            [{"garment_id": f"g{i}", "text": "Jeans, Blue pants"} for i in range(6)], minimo=1
        )


def test_split_por_texto_respeta_las_proporciones() -> None:
    # El reparto es 80/10/10 en numero de grupos, no round-robin.
    splits = split_por_texto(_pares_sinteticos(1000), minimo=1)
    total = sum(len(splits[n]) for n in NIVELES)
    proporcion_train = len(splits["train"]) / total
    assert 0.7 < proporcion_train < 0.9, f"train quedo en {proporcion_train:.2f}"


def test_split_por_texto_no_fuga_garment_id() -> None:
    splits = split_por_texto(_pares_sinteticos(500), minimo=1)
    validar_splits(splits, minimo=1)
    ids = {n: {p["garment_id"] for p in splits[n]} for n in NIVELES}
    for a in NIVELES:
        for b in NIVELES:
            if a < b:
                assert not ids[a] & ids[b]


def test_split_por_texto_es_determinista_con_el_mismo_seed() -> None:
    pares = _pares_sinteticos(500)
    a = split_por_texto(pares, seed=7, minimo=1)
    b = split_por_texto(pares, seed=7, minimo=1)
    assert {k: [p["garment_id"] for p in v] for k, v in a.items()} == {
        k: [p["garment_id"] for p in v] for k, v in b.items()
    }


def test_tipo_raro_no_queda_huerfano_en_un_solo_split() -> None:
    # Un tipo con una sola prenda no puede estar en los tres splits; si cae
    # entero en test, el modelo no tiene forma de aprenderlo.
    pares = [{"garment_id": "raro", "text": "Unica, Rare accessory"}]
    pares += [{"garment_id": f"g{i}", "text": f"Prenda {i}, Black bag"} for i in range(50)]
    splits = split_por_texto(pares, minimo=1)
    assert len(splits["train"]) + len(splits["val"]) + len(splits["test"]) == 51
    assert any("Rare" in p["text"] for p in splits["train"])


def test_split_rechaza_piso_de_pares_no_alcanzado() -> None:
    with pytest.raises(ValueError, match="insuficientes"):
        split_por_texto(_pares_sinteticos(100), minimo=10_000)


def test_split_sin_pares_falla() -> None:
    with pytest.raises(ValueError, match="no hay pares"):
        split_por_texto([], minimo=1)


def test_split_vacio_en_un_split_falla() -> None:
    with pytest.raises(ValueError):
        split_por_texto([{"garment_id": "g1", "text": "Unica, bag"}], minimo=1)


# --- validacion ------------------------------------------------------------


def test_validar_detecta_fuga_de_texto() -> None:
    splits = {n: [] for n in NIVELES}
    splits["train"] = [{"garment_id": "a", "text": "X, bag"}]
    splits["val"] = [{"garment_id": "b", "text": "X, bag"}]
    splits["test"] = [{"garment_id": "c", "text": "Y, bag"}]
    with pytest.raises(ValueError, match="fuga de texto"):
        validar_splits(splits, minimo=1)


def test_validar_detecta_fuga_de_garment_id() -> None:
    splits = {n: [] for n in NIVELES}
    splits["train"] = [{"garment_id": "a", "text": "X, bag"}]
    splits["val"] = [{"garment_id": "a", "text": "Y, bag"}]
    splits["test"] = [{"garment_id": "c", "text": "Z, bag"}]
    with pytest.raises(ValueError, match="fuga de garment_id"):
        validar_splits(splits, minimo=1)


def test_validar_rechaza_split_vacio() -> None:
    splits = {n: [] for n in NIVELES}
    splits["train"] = [{"garment_id": "a", "text": "X, bag"}]
    with pytest.raises(ValueError, match="vacio"):
        validar_splits(splits, minimo=1)


def test_validar_rechaza_texto_vacio() -> None:
    splits = {n: [] for n in NIVELES}
    splits["train"] = [{"garment_id": "a", "text": "   "}]
    splits["val"] = [{"garment_id": "b", "text": "Y, bag"}]
    splits["test"] = [{"garment_id": "c", "text": "Z, bag"}]
    with pytest.raises(ValueError, match="texto vacio"):
        validar_splits(splits, minimo=1)


def test_validar_exige_los_tres_splits() -> None:
    with pytest.raises(ValueError, match="faltan splits"):
        validar_splits({"train": [{"garment_id": "a", "text": "X, bag"}]}, minimo=1)


# --- ida y vuelta de disco -------------------------------------------------


def test_escribir_y_leer_jsonl_preserva_contenido(tmp_path) -> None:
    splits = split_por_texto(_pares_sinteticos(300), minimo=1)
    conteos = escribir_jsonl(splits, tmp_path)
    for nombre, total in conteos.items():
        leidos = leer_jsonl(tmp_path / f"clip_pairs_{nombre}.jsonl")
        assert len(leidos) == total
        assert all(set(p) == {"garment_id", "text"} for p in leidos)


def test_leer_jsonl_falla_con_linea_rota(tmp_path) -> None:
    p = tmp_path / "roto.jsonl"
    p.write_text('{"garment_id":"a","text":"X, bag"}\nno-es-json\n', encoding="utf-8")
    with pytest.raises(ValueError, match="no es JSON valido"):
        leer_jsonl(p)


# --- sobre los archivos versionados ---------------------------------------


def test_pares_versionados_pasan_la_validacion_del_ac() -> None:
    """Valida los `sample_data/clip_pairs_*.jsonl` que se commitean.

    Es el test que hace que el AC de bcdj ("splits validados") quede sostenido
    por CI y no por un `print` de una sesion de Colab. Si alguien regenera los
    archivos con una fuga, este test cae.
    """
    raiz = Path(__file__).resolve().parents[4]
    directorio = raiz / "sample_data"
    splits = {}
    for nombre in NIVELES:
        ruta = directorio / f"clip_pairs_{nombre}.jsonl"
        if not ruta.exists():
            pytest.skip(f"{ruta} no existe todavia")
        splits[nombre] = leer_jsonl(ruta)

    validar_splits(splits, minimo=10_000)
    total = sum(len(splits[n]) for n in NIVELES)
    assert total >= 10_000, f"solo {total} pares, el AC pide 10K+"
    for nombre in NIVELES:
        assert splits[nombre], f"{nombre} vacio"


def _pares_sinteticos(n: int) -> list[dict[str, str]]:
    """Pares con tipos repetidos, para que la estratificacion tenga trabajo."""
    tipos = ["Black bag", "Blue pants", "Red top", "Green shoes", "White accessory"]
    pares = []
    for i in range(n):
        tipo = tipos[i % len(tipos)]
        pares.append({"garment_id": f"gid{i:05d}", "text": f"Prenda {i}, {tipo}"})
    return pares
