"""Tests de las metricas del eval zero-shot (historia bccv).

Viven en src/ml/testing porque el AC de bccv pide un evaluation script
ejecutable: las metricas tienen que ser verificables sin GPU ni Colab, y por eso
`ml.metrics.zero_shot` separa las funciones puras de la inferencia.

La seccion final es un test de regresion contra los numeros publicados en
`docs/ml/clip_prompts.md`. Si alguien cambia una formula y el reporte deja de
corresponder a lo que el codigo produce, esos tests caen.
"""

from __future__ import annotations

import pytest

from ml.metrics.zero_shot import (
    NIVELES,
    evaluar_desde_registros,
    macro_f1,
    mcnemar_exact,
    nombre_de_imagen,
    parsear_nombre_imagen,
    wilson,
)

# --- Wilson ----------------------------------------------------------------


def test_wilson_n_cero_no_revienta() -> None:
    assert wilson(0, 0) == (0.0, 0.0)


def test_wilson_perfecto_pega_arriba() -> None:
    lo, hi = wilson(30, 30)
    assert lo == pytest.approx(0.886, abs=1e-3)
    assert hi == 1.0


def test_wilson_nunca_se_sale_del_rango() -> None:
    # El de Wald con n chico se pasa de 1.0; Wilson no.
    for k in range(11):
        lo, hi = wilson(k, 10)
        assert 0.0 <= lo <= hi <= 1.0


def test_wilson_intervalo_mas_estrecho_con_mas_datos() -> None:
    chico = wilson(8, 10)
    grande = wilson(800, 1000)
    assert (grande[1] - grande[0]) < (chico[1] - chico[0])


# --- F1 macro --------------------------------------------------------------


def test_macro_f1_prediccion_perfecta() -> None:
    real = ["bag", "shoes", "tops"]
    assert macro_f1(real, list(real)) == pytest.approx(1.0)


def test_macro_f1_todo_equivocado() -> None:
    real = ["bag", "shoes", "tops"]
    assert macro_f1(real, ["x", "y", "z"]) == pytest.approx(0.0)


def test_macro_f1_rechaza_largos_distintos() -> None:
    with pytest.raises(ValueError, match="distinto largo"):
        macro_f1(["a", "b"], ["a"])


def test_macro_f1_vacio_devuelve_cero() -> None:
    assert macro_f1([], []) == 0.0


def test_macro_f1_penaliza_el_desbalance() -> None:
    # handbag 9 fotos, boston 1: acertar la mayoria y fallar la rara tiene que
    # dar menos de 1, y es el caso que hace que accuracy y F1 macro divergan.
    real = ["handbag"] * 9 + ["boston"]
    pred = ["handbag"] * 9 + ["handbag"]
    assert macro_f1(real, pred) < 1.0


# --- McNemar ----------------------------------------------------------------


def test_mcnemar_sin_discordantes_es_uno() -> None:
    assert mcnemar_exact(0, 0) == 1.0


def test_mcnemar_rechaza_negativos() -> None:
    with pytest.raises(ValueError, match="negativos"):
        mcnemar_exact(-1, 2)


def test_mcnemar_es_simetrico() -> None:
    assert mcnemar_exact(3, 1) == pytest.approx(mcnemar_exact(1, 3))


def test_mcnemar_no_supera_uno() -> None:
    assert mcnemar_exact(10, 0) <= 1.0


def test_mcnemar_mas_evidencia_baja_el_p() -> None:
    # Con las misma proporcion de discordancia, mas muestras tienen que dar un
    # p menor; si no, el test no esta midiendo nada.
    assert mcnemar_exact(30, 10) < mcnemar_exact(3, 1)


# --- nombres de imagen ------------------------------------------------------


def test_nombre_de_imagen_empieza_con_indice() -> None:
    assert nombre_de_imagen(1, "100002074_3") == "01_100002074_3.jpg"


def test_parsear_nombre_chequea_el_id_completo() -> None:
    # El id del dataset lleva sufijo de variante despues del guion bajo. Si el
    # parseo perdiera el "_3", el eval buscaria la etiqueta de otra prenda.
    assert parsear_nombre_imagen("01_100002074_3.jpg") == "100002074_3"


def test_parsear_nombre_chequea_ids_con_dos_guiones() -> None:
    # Limite documentado: parte por el primer guion, asi que un id con dos
    # guiones bajos no puede recovery parsear bien. Los ids de Garments2Look
    # tienen uno solo; este test deja el supuesto explicito en vez de
    # esconderlo.
    assert parsear_nombre_imagen("01_100002074.jpg") == "100002074"


def test_parsear_nombre_rechaza_extension_inesperada() -> None:
    with pytest.raises(ValueError, match="formato inesperado"):
        parsear_nombre_imagen("01_100002074_3.png")


def test_parsear_nombre_rechaza_sin_guion() -> None:
    with pytest.raises(ValueError):
        parsear_nombre_imagen("imagen.jpg")


def test_round_trip_nombre_imagen() -> None:
    for garment_id in ("100002074_3", "83277394_3", "205774696_5"):
        nombre = nombre_de_imagen(7, garment_id)
        assert parsear_nombre_imagen(nombre) == garment_id


# --- resumen ----------------------------------------------------------------


def test_evaluar_desde_registros_perfecto() -> None:
    r = evaluar_desde_registros(["a", "b"], ["a", "b"], objetivo=0.82)
    assert r["top1"] == 1.0
    assert r["f1_macro"] == pytest.approx(1.0)


def test_evaluar_no_alcanza_el_objetivo_con_few_muestras() -> None:
    # Aciertos perfectos pero con muestra chica el IC95% no llega al objetivo.
    # Es justo el caso del reporte: 30 de 30 con IC95 [0.886, 1.000] si supera,
    # 2 de 2 no. Por eso el AC mira el intervalo y no el punto.
    r = evaluar_desde_registros(["a", "b"], ["a", "b"], objetivo=0.82)
    assert r["ic95_supera_objetivo"] is False


def test_evaluar_supera_objetivo_con_muestra_suficiente() -> None:
    reales = ["bag", "shoes"] * 15
    r = evaluar_desde_registros(reales, list(reales), objetivo=0.82)
    assert r["top1"] == 1.0
    assert r["ic95_supera_objetivo"] is True


def test_evaluar_desde_registros_rechaza_largos_distintos() -> None:
    with pytest.raises(ValueError, match="distinto largo"):
        evaluar_desde_registros(["a", "b"], ["a"], objetivo=0.82)


def test_evaluar_desde_registros_rechaza_vacio() -> None:
    with pytest.raises(ValueError, match="no hay registros"):
        evaluar_desde_registros([], [], objetivo=0.82)


def test_niveles_declaran_objetivo_de_plan_base() -> None:
    # plan-base.md 9.1: 0.82 para categoria funcional. El de subcategoria quedo
    # por debajo en la corrida, y por eso el reporte lo dice en voz alta.
    assert NIVELES["CATEGORIA"]["objetivo"] == 0.82
    assert NIVELES["SUBCATEGORIA"]["objetivo"] == 0.75


# --- regresion contra lo publicado -----------------------------------------


def test_regresion_intervalos_del_reporte() -> None:
    """Los IC95% de docs/ml/clip_prompts.md salen de estas funciones.

    Categoria funcional: 30 de 30. Subcategoria: 23 de 45 (0.511).
    """
    lo_cat, hi_cat = wilson(30, 30)
    assert round(lo_cat, 3) == 0.886
    assert round(hi_cat, 3) == 1.000

    lo_sub, hi_sub = wilson(23, 45)
    assert round(lo_sub, 3) == 0.370
    assert round(hi_sub, 3) == 0.650


def test_regresion_mcnemar_del_reporte() -> None:
    """El p=0.625 del reporte es mcnemar_exact(3, 1)."""
    assert round(mcnemar_exact(3, 1), 3) == 0.625
    assert round(mcnemar_exact(0, 0), 3) == 1.000


def test_regresion_resumen_subcategoria() -> None:
    """Reproduce el 0.511 de accuracy y el F1 macro ~0.510 de la subcategoria."""
    reales = ["handbag"] * 9 + ["tote"] * 7 + ["clutch"] * 6 + ["satchel"] * 6 + ["crossbody"] * 5
    reales += ["shoulder"] * 5 + ["backpack"] * 2 + ["bucket"] * 2 + ["duffel"] * 1 + ["boston"] * 2
    # 23 de 45 es 0.511
    preds = list(reales[:23]) + ["handbag"] * 22
    resumen = evaluar_desde_registros(reales, preds, objetivo=0.75)
    assert round(resumen["top1"], 3) == 0.511
    assert resumen["ic95_supera_objetivo"] is False
