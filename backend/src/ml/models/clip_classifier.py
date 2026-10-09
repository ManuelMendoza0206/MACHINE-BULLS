"""Clasificador zero-shot con CLIP (historia bccv) y dataset de pares (bcdj).

Vive en `ml.models` y no en `services/garment_analysis/` a proposito: esta es la
libreria ML reutilizable, y el servicio que la consume (`garment-analysis-service`,
Sprint 3, sin iniciar) la importara desde aca cuando se construya. Ver
`openspec/specs/backend/garment-analysis-service/spec.md`, que lista
`src/services/garment_analysis/clip_classifier.py` como capa de servicio.

El modulo esta partido en dos, y la division es deliberada:

- **Sin GPU ni dependencias pesadas**: `derivar_pares`, `split_por_texto` y la
  validacion de splits. Solo stdlib, asi que corren en CI y en cualquier maquina.
  Son las funciones que `testing/test_clip_classifier.py` ejercita. Los prompts
  viven aparte, en `ml/models/prompts.py`, que es la separacion que pide el
  spec de `garment-analysis-service`.
- **Con GPU**: `ClipClassifier` y `probabilidades_imagen`. Necesitan `torch` y
  `transformers`, asi que se importan de forma perezosa dentro del metodo.

Motivo del split: el notebook 03 corre la inferencia en Colab porque la mayoria
del equipo no tiene GPU local. Si la logica de datos viviera solo en el notebook,
nadie podria revalidar el dataset sin GPU. Con esta division, regenerar y
verificar los splits es CPU, y la inferencia sigue siendo tarea de quien tenga
GPU.

Relacion con el notebook: `notebooks/03_clip_zero_shot.ipynb` importa de este
modulo en vez de redefinir la logica. Si algo cambia aca, el notebook hereda el
cambio.

Sobre la ruta: el spec de `garment-analysis-service` §6 pide este archivo en
`src/services/garment_analysis/`. Vive en `ml/models/` por decision registrada
en `docs/adr/adr-sprint-4/ADR-401-clip-classifier-location.md`: el servicio
todavia no existe, y esta es codigo ML reutilizable que lo va a importar.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

from .prompts import (
    TEMPLATES,
    expandir_prompts,
    prompts_planos,
    slices_por_clase,
)

MODEL_NAME = "openai/clip-vit-base-patch32"

NIVELES = ("train", "val", "test")
DEFAULT_SEED = 42
RATIOS = {"train": 0.8, "val": 0.1, "test": 0.1}

Par = dict[str, str]

# Re-exportado para que los que importaban desde aca sigan funcionando. La
# definicion vive en prompts.py; esto es compatibilidad, no duplicacion.
__all__ = [
    "DEFAULT_SEED",
    "MODEL_NAME",
    "NIVELES",
    "TEMPLATES",
    "ClipClassifier",
    "derivar_pares",
    "escribir_jsonl",
    "expandir_prompts",
    "leer_jsonl",
    "main",
    "split_por_texto",
    "tipo_de_prenda",
    "validar_splits",
]


def derivar_pares(
    catalogo: Mapping[str, Mapping[str, Any]], limite: int | None = None
) -> list[Par]:
    """Deriva pares (garment_id, texto) del catalogo de prendas.

    El texto sale de los metadatos, no de una imagen: nombre, color y tipo. Por
    eso se pueden generar ~12.000 pares sin descargar los shards de fotos, que
    son varios GB.

    Descarta prendas sin nombre o sin tipo porque sin ambos no hay texto
    utilizable. El color es opcional.
    """
    pares: list[Par] = []
    for gid, meta in catalogo.items():
        nombre = (meta.get("name") or "").strip()
        tipo = (meta.get("type") or "").strip()
        if not nombre or not tipo:
            continue
        color = (meta.get("color") or "").strip()
        texto = f"{nombre}, {color} {tipo}" if color else f"{nombre}, {tipo}"
        pares.append({"garment_id": gid, "text": texto})
        if limite is not None and len(pares) >= limite:
            break
    return pares


def tipo_de_prenda(par: Par) -> str:
    """Ultimo segmento del texto del par, que es el tipo de prenda.

    El texto se arma como "nombre, [color] tipo", asi que el tipo queda al
    final despues de la ultima coma. Sirve para estratificar: reparte los tipos
    raros entre los splits en vez de dejarlos para un solo lado.
    """
    texto = par.get("text") or ""
    return texto.rsplit(",", 1)[-1].strip() if "," in texto else texto.strip()


def _grupos_por_texto(pares: Iterable[Par]) -> list[list[Par]]:
    """Agrupa los pares que comparten texto exacto.

    Esta es la pieza que evita la fuga entre splits. Partir por `garment_id` deja
    pasar pares con texto identico: seis prendas distintas con la descripcion
    "Women's Dark Wash Skinny Jeans, Dark Blue pants" pueden caer en train y en
    val a la vez, y el modelo memoriza la descripcion en vez de aprender a
    generalizar sobre ella.

    Agrupar por texto manda el grupo completo a un solo split. Cuesta una parte
    de los pares, que es el precio de un split honesto.
    """
    grupos: dict[str, list[Par]] = {}
    for par in pares:
        grupos.setdefault(par["text"], []).append(par)
    return list(grupos.values())


def _repartir_grupos(grupos: Sequence[list[Par]], seed: int) -> dict[str, list[list[Par]]]:
    """Reparte grupos en splits 80/10/10, estratificando por tipo de prenda.

    La estratificacion existe por los tipos raros: un tipo con una sola prenda no
    puede estar en los tres splits, y si cae entero en test el modelo no tiene
    forma de aprenderlo. Cuando un tipo no alcanza para los tres splits, sus
    grupos se reparten solo entre los que puede, en orden de cuota descendente.

    Dentro de un tipo con grupos suficientes, el reparto es proporcional al
    numero de grupos (80/10/10) y los grupos mas grandes van primero al split
    que mas deficit tiene. Asignarlos en round-robin daria 33/33/33 y dejaria
    train y test con el mismo volumen de pares.
    """
    rng = random.Random(seed)
    for grupo in grupos:
        rng.shuffle(grupo)

    por_tipo: dict[str, list[list[Par]]] = {}
    for grupo in grupos:
        por_tipo.setdefault(tipo_de_prenda(grupo[0]), []).append(grupo)

    splits: dict[str, list[list[Par]]] = {n: [] for n in NIVELES}

    def mas_deficit() -> str:
        """Split que mas lejos esta de su cuota, medido en pares acumulados.

        Se usa para los tipos raros. Con un orden fijo (train, val, test) todos
        los tipos de un solo grupo caerian en train y test se quedaria sin
        nada: el dataset tendria 4,8% de test en vez de 10%.
        """
        total = sum(len(p) for g in grupos for p in g) or 1
        return max(NIVELES, key=lambda n: -(len(splits[n]) / (total * RATIOS[n])))

    for tipo in sorted(por_tipo):
        items = sorted(por_tipo[tipo], key=lambda g: (-len(g), g[0]["text"]))

        if len(items) < len(NIVELES):
            for grupo in items:
                splits[mas_deficit()].append(grupo)
            continue

        crudo = {n: len(items) * RATIOS[n] for n in NIVELES}
        cupos = {n: int(crudo[n]) for n in NIVELES}
        sobrantes = len(items) - sum(cupos.values())
        for n in sorted(NIVELES, key=lambda n: -(crudo[n] - cupos[n]))[:sobrantes]:
            cupos[n] += 1

        pendientes = dict(cupos)
        for grupo in items:
            destino = max(NIVELES, key=lambda n: (pendientes[n], RATIOS[n]))
            splits[destino].append(grupo)
            pendientes[destino] -= 1

    return splits


def split_por_texto(
    pares: Iterable[Par],
    seed: int = DEFAULT_SEED,
    minimo: int = 10_000,
) -> dict[str, list[Par]]:
    """Reparte los pares en train/val/test sin fuga entre splits.

    Agrupa por texto (ver `_grupos_por_texto`) y estratifica por tipo de prenda.
    Es determinista para un `seed` dado, que es lo que permite que `pytest`
    verifique el resultado y que otra persona regenere el dataset obtenga los
    mismos archivos.

    `minimo` es el piso del AC de bcdj ("10K+ pares de calidad"). Si el catalogo
    no llega, falla en voz alta en vez de dejar un dataset truncado en silencio.
    """
    grupos = _grupos_por_texto(pares)
    if not grupos:
        raise ValueError("no hay pares para dividir")

    distribucion = _repartir_grupos(grupos, seed)
    resultado: dict[str, list[Par]] = {}
    for nombre in NIVELES:
        aplanados = [par for grupo in distribucion[nombre] for par in grupo]
        if not aplanados:
            raise ValueError(f"el split {nombre!r} quedo vacio")
        aplanados.sort(key=lambda p: p["garment_id"])
        resultado[nombre] = aplanados

    total = sum(len(v) for v in resultado.values())
    if total < minimo:
        raise ValueError(
            f"solo {total} pares de calidad, insuficientes para el AC de bcdj (piso {minimo})"
        )
    return resultado


def validar_splits(splits: Mapping[str, Sequence[Par]], minimo: int = 10_000) -> None:
    """Verifica que los splits no fuguen y alcancen el piso del AC. Falla si no.

    Es la red que el notebook 03 no tenia: alla la validacion era un `assert`
    de que el split no estaba vacio, que no alcanza para descartar fuga entre
    train y val.
    """
    faltantes = [n for n in NIVELES if n not in splits]
    if faltantes:
        raise ValueError(f"faltan splits: {faltantes}")

    for nombre, pares in splits.items():
        if not pares:
            raise ValueError(f"el split {nombre!r} quedo vacio")
        for par in pares:
            faltando = {"garment_id", "text"} - set(par)
            if faltando:
                raise ValueError(f"{nombre}: par sin {sorted(faltando)}: {par!r}")
            if not str(par["text"]).strip():
                raise ValueError(f"{nombre}: par con texto vacio: {par!r}")

    ids: dict[str, set[str]] = {}
    textos: dict[str, set[str]] = {}
    for nombre, pares in splits.items():
        ids[nombre] = {p["garment_id"] for p in pares}
        textos[nombre] = {p["text"] for p in pares}

    for a in NIVELES:
        for b in NIVELES:
            if a >= b:
                continue
            if ids[a] & ids[b]:
                raise ValueError(
                    f"fuga de garment_id entre {a!r} y {b!r}: {len(ids[a] & ids[b])} solapados"
                )
            if textos[a] & textos[b]:
                raise ValueError(
                    f"fuga de texto entre {a!r} y {b!r}: "
                    f"{len(textos[a] & textos[b])} descripciones identicas "
                    f"pueden memorizarse en {a!r} y cobrarse en {b!r}"
                )

    total = sum(len(splits[n]) for n in NIVELES)
    if total < minimo:
        raise ValueError(f"total {total} por debajo del piso {minimo} del AC de bcdj")


def escribir_jsonl(splits: Mapping[str, Sequence[Par]], destino: Path) -> dict[str, int]:
    """Escribe un JSONL por split y devuelve los conteos."""
    destino.mkdir(parents=True, exist_ok=True)
    conteos: dict[str, int] = {}
    for nombre in NIVELES:
        archivo = destino / f"clip_pairs_{nombre}.jsonl"
        with archivo.open("w", encoding="utf-8") as fh:
            for par in splits[nombre]:
                fh.write(json.dumps(par, ensure_ascii=False) + "\n")
        conteos[nombre] = len(splits[nombre])
    return conteos


def leer_jsonl(ruta: Path) -> list[Par]:
    """Lee un JSONL de pares, fallando si una linea no parsea."""
    pares: list[Par] = []
    with ruta.open(encoding="utf-8") as fh:
        for numero, linea in enumerate(fh, start=1):
            if not linea.strip():
                continue
            try:
                pares.append(json.loads(linea))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{ruta}:{numero} no es JSON valido: {exc}") from exc
    return pares


class ClipClassifier:
    """CLIP zero-shot sobre categorias de prenda.

    Los templates se promedian por clase: CLIP cambia de opinion segun como este
    redactado el prompt, y una sola redaccion deja ruido. Para un item concreto
    se expone `expandir_prompts` sin cargar el modelo.

    Importa `torch` y `transformers` de forma perezosa, asi que el modulo se
    puede importar en una maquina sin GPU (lo necesita `pytest`). Los errores
    de dependencia se re-lanzan con un mensaje que dice que falta que.
    """

    def __init__(self, nivel: str = "CATEGORIA", device: str | None = None) -> None:
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor
        except ImportError as exc:
            raise RuntimeError(
                "ClipClassifier necesita torch y transformers. Se importan de forma "
                "perezosa para que el resto del modulo funcione en CPU y en CI; "
                "instalalos para correr inferencia."
            ) from exc

        self.nivel = nivel
        self._torch = torch
        self._processor = CLIPProcessor.from_pretrained(MODEL_NAME)
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = CLIPModel.from_pretrained(MODEL_NAME).to(self.device).eval()

    @staticmethod
    def candidates(clases: Sequence[str], nivel: str = "CATEGORIA") -> list[str]:
        """Lista plana de prompts para pasar al modelo. Delega en prompts.py."""
        return prompts_planos(clases, nivel)

    @staticmethod
    def slices(clases: Sequence[str], nivel: str = "CATEGORIA") -> list[slice]:
        """Slice de cada clase en la lista plana. Delega en prompts.py."""
        return slices_por_clase(clases, nivel)

    @staticmethod
    def probs_imagen(
        modelo: Any,
        processor: Any,
        imagen: Any,
        textos: Sequence[str],
        device: str,
    ) -> list[float]:
        """Distribucion de probabilidad sobre los prompts para una imagen.

        Usa `logits_per_image` y no `get_image_features`: la forma de retorno de
        `get_*_features` cambio entre versiones de transformers, mientras que
        `logits_per_image` devuelve el tensor estable.
        """
        import torch

        entrada = processor(text=list(textos), images=imagen, return_tensors="pt", padding=True)
        entrada = {k: v.to(device) for k, v in entrada.items()}
        with torch.no_grad():
            logits = modelo(**entrada).logits_per_image
        return logits.softmax(dim=1)[0].tolist()


def leer_pares(args: argparse.Namespace) -> list[Par]:
    """Arma la lista de pares desde el catalogo o desde JSONL existentes.

    `--desde-pares` existe porque el catalogo de `Garments2Look` esta gated: para
    redividir los splits no hace falta volver a bajarlo cuando los JSONL ya
    estan en disco. Evita pedirle a otra persona el token de Hugging Face para un
    simple reshuffle.
    """
    if args.catalogo:
        with args.catalogo.open(encoding="utf-8") as fh:
            catalogo = json.load(fh)
        if not isinstance(catalogo, dict):
            raise ValueError(f"{args.catalogo} no es un objeto JSON {{garment_id: metadatos}}")
        return derivar_pares(catalogo, limite=args.limite)

    assert args.desde_pares is not None
    origen = args.desde_pares
    archivos = sorted(origen.glob("clip_pairs_*.jsonl")) if origen.is_dir() else [origen]
    if not archivos:
        raise ValueError(f"no encontre clip_pairs_*.jsonl bajo {origen}")

    vistos: set[str] = set()
    pares: list[Par] = []
    for archivo in archivos:
        for par in leer_jsonl(archivo):
            # Un mismo garment_id puede repetirse entre archivos viejos; el
            # catalogo es un dict, asi que cada id existe una sola vez.
            if par["garment_id"] in vistos:
                continue
            vistos.add(par["garment_id"])
            pares.append(par)
    return pares


def main(argv: list[str] | None = None) -> int:
    """CLI para derivar y dividir los pares.

    Desde el catalogo (metadata JSON, no necesita GPU):

        python -m ml.models.clip_classifier \\
            --catalogo catalogo.json --salida sample_data --seed 42

    Desde JSONL que ya estan en disco, sin volver a bajar el catalogo gated:

        python -m ml.models.clip_classifier \\
            --desde-pares sample_data --salida sample_data --seed 42
    """
    parser = argparse.ArgumentParser(
        prog="ml.models.clip_classifier",
        description="Deriva pares imagen-texto y los divide en splits sin fuga.",
    )
    origen = parser.add_mutually_exclusive_group(required=True)
    origen.add_argument(
        "--catalogo",
        type=Path,
        help="JSON {garment_id: metadatos} del dataset",
    )
    origen.add_argument(
        "--desde-pares",
        type=Path,
        help="directorio con clip_pairs_*.jsonl, o un JSONL suelto",
    )
    parser.add_argument("--salida", type=Path, required=True, help="directorio de salida")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--minimo", type=int, default=10_000, help="piso de pares del AC bcdj")
    parser.add_argument("--limite", type=int, default=None, help="corte los pares (pruebas)")
    args = parser.parse_args(argv)

    try:
        pares = leer_pares(args)
        splits = split_por_texto(pares, seed=args.seed, minimo=args.minimo)
        validar_splits(splits, minimo=args.minimo)
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        return 1

    conteos = escribir_jsonl(splits, args.salida)
    total = sum(conteos.values())
    grupos = len({p["text"] for p in pares})
    print(f"[OK] {total} pares en {grupos} textos distintos (seed {args.seed})")
    print("[OK] " + " / ".join(f"{k}: {v}" for k, v in conteos.items()))
    print("[OK] sin fuga de garment_id ni de texto entre splits")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
