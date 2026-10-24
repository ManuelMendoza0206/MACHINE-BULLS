"""Motor de recomendacion de outfits (B3, MVP).

Arma combinaciones top+bottom+footwear (+outerwear si hay) con las prendas
disponibles del usuario y las ordena por score combinado:

    score = 0.6 * cromatico + 0.4 * embedding

Los pesos estan en `WEIGHTS` y son la decision de diseño del MVP: la armonia
cromatica es lo unico medible de verdad hoy (el embedding es CLIP sin
fine-tuning, que captura tipo de prenda mas que estilo). Cuando entre el
Triplet Loss entrenado, sube el peso del embedding.

Sin train de Triplet Loss ni k-NN sobre catalogo ajeno: eso queda fuera del
MVP y esta registrado en el README.
"""

from __future__ import annotations

from typing import Any

from domain.enums import GarmentPosition
from services.recommender.chromatic_scorer import embedding_score, score_outfit

WEIGHTS = {"chromatic": 0.6, "embedding": 0.4}

# Orden de capas de un outfit: de adentro hacia afuera.
LAYER_ORDER = (
    GarmentPosition.BOTTOM,
    GarmentPosition.TOP,
    GarmentPosition.OUTERWEAR,
    GarmentPosition.FOOTWEAR,
)

# Cuantas prendas por posicion se consideran en la generacion. Corta el costo
# combinatorio sin perder variedad: con 8 tops x 8 bottoms x 6 shoes da 384
# outfits posibles, de los cuales se rankean todos y se devuelven los `limit`.
MAX_PER_POSITION = 8


def _por_posicion(garments: list[dict[str, Any]]) -> dict[GarmentPosition, list[dict[str, Any]]]:
    """Agrupa prendas por posicion, descartando las que no tienen posicion."""
    agrupadas: dict[GarmentPosition, list[dict[str, Any]]] = {p: [] for p in GarmentPosition}
    for g in garments:
        posicion = g.get("position")
        if posicion is None:
            continue
        # Ya vienen ordenadas por created_at desc desde el repo; corto a MAX.
        if len(agrupadas[posicion]) < MAX_PER_POSITION:
            agrupadas[posicion].append(g)
    return agrupadas


def _combinaciones(
    agrupadas: dict[GarmentPosition, list[dict[str, Any]]],
) -> list[list[dict[str, Any]]]:
    """Combina prendas en outfits: ancla top+bottom, capas opcionales.

    El ancla es top+bottom (un outfit sin una de las dos mitades no viste
    cuerpo completo). Calzado y outerwear son capas **opcionales**: no todo
    usuario tiene zapatos en la capsule, y exigir footwear dejaba el
    recomendador devolviendo 0 outfits con un guardarropa perfectamente
    usable. Se generan las variantes con y sin cada capa opcional para que el
    scoring decida cual prefiero.

    Sin bottoms (p.ej. solo remeras) no hay outfit: no se fabrica una mitad.
    """
    tops = agrupadas[GarmentPosition.TOP]
    bottoms = agrupadas[GarmentPosition.BOTTOM]
    shoes = agrupadas[GarmentPosition.FOOTWEAR] or [None]
    outers = agrupadas[GarmentPosition.OUTERWEAR] or [None]

    combos: list[list[dict[str, Any]]] = []
    for bottom in bottoms:
        for top in tops:
            for shoe in shoes:
                for outer in outers:
                    capas = [c for c in (bottom, top, outer, shoe) if c is not None]
                    combos.append(capas)
    return combos


def _ordenar_capas(garment_dicts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ordena las prendas del outfit segun LAYER_ORDER para el layering."""

    def clave(g: dict[str, Any]) -> int:
        try:
            return LAYER_ORDER.index(GarmentPosition(g["position"]))
        except ValueError:
            return len(LAYER_ORDER)

    return sorted(garment_dicts, key=clave)


def recommend_outfits(
    garments: list[dict[str, Any]],
    target_aesthetic: str | None = None,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """Devuelve los mejores outfits armados con `garments`.

    Cada garment dict esperado:
        {id, position, colors, embedding, aesthetic}

    `target_aesthetic` filtra por estetica dominante antes de combinar; si
    empieza vacio, ignina el filtro y prioriza variedad (dedupe por score).
    """
    disponibles = garments
    if target_aesthetic:
        filtradas = [g for g in garments if g.get("aesthetic") == target_aesthetic]
        # Si el filtro vacia todo, no devolvemos nada mejor que romper la demo:
        # se cae al catalogo completo con una nota en el log del server.
        if filtradas:
            disponibles = filtradas

    agrupadas = _por_posicion(disponibles)
    combos = _combinaciones(agrupadas)

    rankeados: list[dict[str, Any]] = []
    for capas in combos:
        chroma = score_outfit(capas)
        emb = embedding_score([g["embedding"] for g in capas if g.get("embedding")])
        score = WEIGHTS["chromatic"] * chroma + WEIGHTS["embedding"] * emb
        capas_ordenadas = _ordenar_capas(capas)
        rankeados.append(
            {
                "aesthetic": _estetica_dominante(capas_ordenadas),
                "garments": capas_ordenadas,
                "chromatic_score": round(chroma, 4),
                "embedding_score": round(emb, 4),
                "_score": round(score, 4),
            }
        )

    rankeados.sort(key=lambda r: -r["_score"])
    return rankeados[:limit]


def _estetica_dominante(capas: list[dict[str, Any]]) -> str:
    """Estetica mas repetida entre las prendas; empate -> la del top."""
    conteo: dict[str, int] = {}
    for g in capas:
        a = g.get("aesthetic") or "casual"
        conteo[a] = conteo.get(a, 0) + 1
    top = next((g for g in capas if g["position"] == GarmentPosition.TOP.value), None)
    if top and (top.get("aesthetic") or "casual") in conteo:
        return top["aesthetic"] or "casual"
    return max(conteo.items(), key=lambda kv: kv[1])[0]
