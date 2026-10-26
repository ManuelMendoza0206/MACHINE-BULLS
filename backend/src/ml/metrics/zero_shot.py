"""Evaluacion zero-shot de CLIP: metricas, resumen y CLI (historia bccv).

Extraido de `notebooks/03_clip_zero_shot.ipynb`, que ahora importa de aca. La
motiva��on es la misma que en `models/clip_classifier.py`: si la logica vive solo
en el notebook, corre en Colab, necesita GPU y nadie la puede revalidar desde CI.

Partido en dos, igual que el clasificador:

- **Sin dependencias**: `wilson`, `macro_f1`, `mcnemar_exact`,
  `nombre_de_imagen`, `parsear_nombre_imagen` y `evaluar_desde_registros`. Solo
  stdlib, asi que `testing/test_zero_shot.py` las ejercita en CI.
- **Con GPU**: `evaluar_imagenes` y `main`, que importan `torch`,
  `transformers` y PIL de forma perezosa.

Sobre `macro_f1`: en el notebook recibia un DataFrame de pandas. Aqui recibe
secuencias. No es cosmetico, pandas no esta en las dependencias del backend y
mientras la funcion lo necesitara no habria forma de testearla sin instalarlo.

El AC de bccv pide un evaluation script ejecutable. Este modulo es ese script:
`uv run python -m ml.metrics.zero_shot --etiquetas ... --nivel CATEGORIA`
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from ..models.clip_classifier import MODEL_NAME
from ..models.prompts import TEMPLATES

# Los objetivos salen de plan-base.md 9.1. El de categoria funcional es el que
# el proyecto mide; el de subcategoria quedo por debajo y asi se reporta.
NIVELES: dict[str, dict[str, Any]] = {
    "CATEGORIA": {
        "titulo": "Categoria funcional",
        "slug": "grueso",
        "objetivo": 0.82,
        "plantilla": "clip_labels_grueso.csv",
    },
    "SUBCATEGORIA": {
        "titulo": "Subcategoria (subtipo de bolso)",
        "slug": "fino",
        "objetivo": 0.75,
        "plantilla": "clip_labels_fino.csv",
    },
}


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Intervalo de confianza de Wilson para una proporcion.

    Se usa Wilson y no Wald porque con n chico el de Wald se sale de [0, 1] y
    subestima la varianza. Con 30 y 45 muestras la diferencia es visible: es lo
    que separa "el IC95% supera el objetivo" de "no se puede afirmar".
    """
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    centro = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, centro - half), min(1.0, centro + half))


def macro_f1(real: Sequence[str], pred: Sequence[str]) -> float:
    """F1 macro sobre las clases presentes en `real` o en `pred`.

    `plan-base.md` 9.1 pide F1 macro y no accuracy. Con clases desbalanceadas las
    dos divergen, asi que se reportan las dos; el reporte explica por que.
    """
    if len(real) != len(pred):
        raise ValueError(f"real ({len(real)}) y pred ({len(pred)}) de distinto largo")
    if not real:
        return 0.0

    clases = sorted(set(real) | set(pred))
    acum = 0.0
    for clase in clases:
        tp = sum(1 for r, q in zip(real, pred) if r == clase and q == clase)
        fp = sum(1 for r, q in zip(real, pred) if r != clase and q == clase)
        fn = sum(1 for r, q in zip(real, pred) if r == clase and q != clase)
        denom = 2 * tp + fp + fn
        acum += (2 * tp / denom) if denom else 0.0
    return acum / len(clases)


def mcnemar_exact(b: int, c: int) -> float:
    """Test pareado exacto del ensemble de prompts contra el prompt base.

    `b` son las imagenes que el ensemble acerto y el base no; `c` al reves. Con
    las redes discordantes contadas, el p bilateral dice si el ensemble se
    distingue del prompt unico o es ruido de muestra. Con 30 o 45 muestras
    casi siempre da alto, y por eso el reporte recomienda la version mas simple.
    """
    if b < 0 or c < 0:
        raise ValueError("b y c son conteos, no pueden ser negativos")
    discordantes = b + c
    if discordantes == 0:
        return 1.0
    k = min(b, c)
    p = 2 * sum(math.comb(discordantes, i) for i in range(k + 1)) / (2**discordantes)
    return min(1.0, p)


def nombre_de_imagen(indice: int, garment_id: str) -> str:
    """Nombre del archivo con el que el notebook guarda la foto de una prenda.

    `clip_grueso/01_100002074_3.jpg`. El indice va adelante para que el orden
    del `ls` coincida con el del CSV.
    """
    return f"{indice:02d}_{garment_id}.jpg"


def parsear_nombre_imagen(nombre: str) -> str:
    """Extrae el `garment_id` de un nombre generado por `nombre_de_imagen`.

    Parte por el primer guion bajo, asi que depende de que el `garment_id` tenga
    uno solo. Los ids del dataset son del tipo `100002074_3`, con sufijo de
    variante, y cumplen. Un id con dos guiones bajos volveria mal la funcion;
    `test_parsear_nombre_chequea_ids_con_dos_guiones` fija ese limite a proposito
    para que quede explicito.
    """
    _, _, resto = nombre.partition("_")
    if not resto or not nombre.endswith(".jpg"):
        raise ValueError(f"nombre de imagen con formato inesperado: {nombre!r}")
    return resto[: -len(".jpg")]


def evaluar_desde_registros(
    reales: Sequence[str],
    predicciones: Sequence[str],
    objetivo: float,
) -> dict[str, Any]:
    """Resumen de metricas a partir de listas paralelas de real y predicho.

    Separa el calculo del eval de la inferencia: lo unico que necesita GPU es
    producir `predicciones`. Con eso, las metricas y el test pareado quedan
    verificables en CI y el AC de bccv deja de depender de una sesion de Colab.
    """
    n = len(reales)
    if n != len(predicciones):
        raise ValueError(f"reales ({n}) y predicciones ({len(predicciones)}) de distinto largo")
    if n == 0:
        raise ValueError("no hay registros para evaluar")

    aciertos = sum(1 for r, p in zip(reales, predicciones) if r == p)
    return {
        "n": n,
        "n_categorias": len(set(reales)),
        "top1": aciertos / n,
        "ic95": wilson(aciertos, n),
        "f1_macro": macro_f1(reales, predicciones),
        "objetivo": objetivo,
        "ic95_supera_objetivo": wilson(aciertos, n)[0] > objetivo,
    }


def _cargar_etiquetas(ruta: Path) -> list[tuple[str, str]]:
    """Lee el CSV de plantilla y devuelve pares (image_id, manual_label).

    Solo stdlib a proposito: el modulo de metricas no deberia arrastrar pandas.
    """
    import csv

    with ruta.open(encoding="utf-8", newline="") as fh:
        return [(row["image_id"], row["manual_label"]) for row in csv.DictReader(fh)]


def evaluar_imagenes(
    directorio: Path,
    etiquetas: Path,
    nivel: str,
    modelo_nombre: str = MODEL_NAME,
    device: str | None = None,
) -> dict[str, Any]:
    """Evalua las fotos de un nivel contra sus etiquetas manuales. Necesita GPU.

    Sale la inferencia por `models.clip_classifier.ClipClassifier`, que hace el
    promedio sobre los templates del nivel. El bucle promedia las tres
    redacciones de cada clase y compara ensemble contra prompt unico, que es lo
    que despues mide `mcnemar_exact`.
    """
    if nivel not in NIVELES:
        raise KeyError(f"nivel desconocido: {nivel!r}; esperado {sorted(NIVELES)}")

    try:
        import torch
        from PIL import Image
        from transformers import CLIPModel, CLIPProcessor
    except ImportError as exc:
        raise RuntimeError(
            "evaluar_imagenes necesita torch, transformers y pillow. Se importan de "
            "forma perezosa para que las metricas corran en CI sin GPU. Para "
            "inferencia, corré esto en una máquina con GPU."
        ) from exc

    from ..models.clip_classifier import ClipClassifier

    cfg = NIVELES[nivel]
    modelo = CLIPModel.from_pretrained(modelo_nombre)
    procesador = CLIPProcessor.from_pretrained(modelo_nombre)
    destino = device or ("cuda" if torch.cuda.is_available() else "cpu")
    modelo = modelo.to(destino).eval()

    mapeo = dict(_cargar_etiquetas(etiquetas))
    categorias = sorted({v.strip() for v in mapeo.values() if v.strip()})
    if len(categorias) < 2:
        raise ValueError(f"se necesitan 2 categorias o mas en {etiquetas}")

    textos_por_template = [[t.format(c=c) for c in categorias] for t in TEMPLATES[nivel]]
    fotos = sorted(directorio.glob("*.jpg"))
    if not fotos:
        raise ValueError(f"no encontre fotos .jpg en {directorio}")

    reales: list[str] = []
    ensemble: list[str] = []
    base: list[str] = []
    sin_etiqueta = 0

    for archivo in fotos:
        garment_id = parsear_nombre_imagen(archivo.name)
        verdad = (mapeo.get(garment_id) or "").strip()
        if not verdad or verdad == "sin_catalogo":
            sin_etiqueta += 1
            continue
        imagen = Image.open(archivo).convert("RGB")

        probs = [
            ClipClassifier.probs_imagen(modelo, procesador, imagen, t, destino)
            for t in textos_por_template
        ]
        probs_ens = [sum(p[i] for p in probs) / len(probs) for i in range(len(categorias))]
        reales.append(verdad)
        ensemble.append(categorias[max(range(len(categorias)), key=lambda i: probs_ens[i])])
        base.append(categorias[max(range(len(categorias)), key=lambda i: probs[0][i])])

    resumen = evaluar_desde_registros(reales, ensemble, cfg["objetivo"])
    arreglo = sum(1 for r, e, b in zip(reales, ensemble, base) if r == e and r != b)
    rompio = sum(1 for r, e, b in zip(reales, ensemble, base) if r != e and r == b)
    resumen.update(
        {
            "nivel": nivel,
            "titulo": cfg["titulo"],
            "modelo": modelo_nombre,
            "device": destino,
            "categorias": categorias,
            "top1_base": sum(1 for r, b in zip(reales, base) if r == b) / len(reales),
            "delta_top1": resumen["top1"]
            - sum(1 for r, b in zip(reales, base) if r == b) / len(reales),
            "arreglo": arreglo,
            "rompio": rompio,
            "mcnemar_p": mcnemar_exact(arreglo, rompio),
            "fotos_sin_etiqueta": sin_etiqueta,
        }
    )
    return resumen


def _formatear(resumen: Mapping[str, Any]) -> str:
    lo, hi = resumen["ic95"]
    p_texto = (
        "no se distingue del prompt unico"
        if resumen["mcnemar_p"] > 0.05
        else "diferencia estadisticamente detectable"
    )
    veredicto = (
        "el IC95% completo supera el objetivo"
        if resumen["ic95_supera_objetivo"]
        else "el IC95% entra bajo el objetivo: no se puede afirmar que se alcance"
    )
    return (
        f"[OK] {resumen['titulo']}: n={resumen['n']} sobre {resumen['n_categorias']} categorias\n"
        f"     accuracy {resumen['top1']:.3f} (IC95% [{lo:.3f}, {hi:.3f}]) | "
        f"F1 macro {resumen['f1_macro']:.3f}\n"
        f"     objetivo {resumen['objetivo']:.2f}: {veredicto}\n"
        f"     ensemble vs prompt unico: delta {resumen['delta_top1']:+.3f} "
        f"(arreglo {resumen['arreglo']}, rompio {resumen['rompio']}, "
        f"McNemar p={resumen['mcnemar_p']:.3f}) -> {p_texto}"
    )


def main(argv: list[str] | None = None) -> int:
    """CLI del eval zero-shot. Necesita GPU para la inferencia.

        uv run python -m ml.metrics.zero_shot \\
            --fotos sample_data/clip_grueso \\
            --etiquetas sample_data/clip_labels_grueso.csv \\
            --nivel CATEGORIA --salida sample_data/clip_eval_categoria.json

    El JSON de salida es material crudo. La interpretacion de los numeros vive
    en `docs/ml/clip_prompts.md`, escrita a mano: automatizar el juicio es
    justamente lo que haria que el reporte dejara de ser honesto.
    """
    parser = argparse.ArgumentParser(
        prog="ml.metrics.zero_shot",
        description="Eval zero-shot de CLIP sobre las fotos etiquetadas a mano.",
    )
    parser.add_argument("--fotos", type=Path, required=True, help="directorio con .jpg")
    parser.add_argument("--etiquetas", type=Path, required=True, help="CSV con manual_label")
    parser.add_argument("--nivel", choices=sorted(NIVELES), default="CATEGORIA")
    parser.add_argument("--modelo", default=MODEL_NAME)
    parser.add_argument("--device", default=None)
    parser.add_argument("--salida", type=Path, default=None, help="JSON de metricas")
    args = parser.parse_args(argv)

    try:
        resumen = evaluar_imagenes(
            args.fotos, args.etiquetas, args.nivel, modelo_nombre=args.modelo, device=args.device
        )
    except (RuntimeError, ValueError) as exc:
        print(f"[ERROR] {exc}")
        return 1

    print(_formatear(resumen))
    if args.salida:
        args.salida.parent.mkdir(parents=True, exist_ok=True)
        args.salida.write_text(
            json.dumps(resumen, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"[OK] metricas escritas en {args.salida}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
