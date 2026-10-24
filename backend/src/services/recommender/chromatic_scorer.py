"""Score de armonia cromatica entre prendas (B3, MVP sin Triplet Loss).

Reglas de color tradicionales aplicadas a los colores dominantes en HSV:

- Neutrales (baja saturacion): combinan con todo, aportan score alto.
- Armonias reales (complementario, analogo, triadic, monocromatico): score
  proporcional a la "cercania" a una armonia canonica.
- Contraste de valor (claro + oscuro): bonus, es lo que hace legible un outfit.

El score final es un promedio ponderado por masa de color de cada prenda
(peso relativo del color dominante sobre los demas). Va en [0,1] porque el
Zod del frontend lo valida asi (`OutfitSchema.chromatic_score`).

Cuando entre el fine-tuning con Triplet Loss (historia por hacer), esta
funcion se reemplaza por el scoring con embedding aprendido; la interfaz
`score_pair` no cambia.
"""

from __future__ import annotations

import math
from typing import Any

# Umbrales de armonia en grados de hue.
_ANALOGO_MAX = 45.0
# Banda complementaria (hue ~180 ± 30) como lista de bandas, igual que _TRIADICO.
_COMPLEMENTARIO = ((150.0, 210.0),)
_TRIADICO = ((90.0, 150.0), (210.0, 270.0))
_SAT_NEUTRO = 20.0  # s < 20% se considera neutral (gris/negro/blanco)


def _distancia_hue(a: float, b: float) -> float:
    """Distancia circular entre dos hues en grados."""
    d = abs(a - b) % 360.0
    return min(d, 360.0 - d)


def _es_neutral(color: dict[str, Any]) -> bool:
    return color["s"] < _SAT_NEUTRO


def _armonia_hue(h1: float, h2: float) -> float:
    """Score de armonia entre dos hues puros, en [0,1]."""
    d = _distancia_hue(h1, h2)
    if d <= _ANALOGO_MAX:
        # Analogo: interpolacion lineal, cuanto mas cerca mejor.
        return 1.0 - 0.2 * (d / _ANALOGO_MAX)
    for lo, hi in _COMPLEMENTARIO:
        if lo <= d <= hi:
            # Complementario: ideal ~180, decae hacia los extremos de la banda.
            centro = (lo + hi) / 2.0
            return 0.95 - 0.25 * (abs(d - centro) / (hi - lo) * 2.0)
    for banda in _TRIADICO:
        lo, hi = banda
        if lo <= d <= hi:
            centro = (lo + hi) / 2.0
            return 0.85 - 0.25 * (abs(d - centro) / (hi - lo) * 2.0)
    # Fuera de toda armonia canonica: decae suavemente con la distancia.
    return max(0.3, 0.55 - (d - 270.0) / 360.0)


def _valor_contraste(v1: float, v2: float) -> float:
    """Bonus por diferencia de valor (claro vs oscuro), en [0,1]."""
    diff = abs(v1 - v2) / 100.0
    return 0.5 + 0.5 * diff


def score_pair(
    colors_a: list[dict[str, Any]],
    colors_b: list[dict[str, Any]],
) -> float:
    """Armonia cromatica entre dos prendas, en [0,1].

    Promedia el mejor score entre los colores de A y los de B, ponderado por
    la masa de cada color (el dominante pesa mas). Neutrales en cualquier lado
    tiran el score hacia arriba porque combinan con todo.
    """
    if not colors_a or not colors_b:
        return 0.5  # sin datos cromaticos: neutral, no castiga

    total_peso = 0.0
    acum = 0.0
    for ca in colors_a:
        for cb in colors_b:
            peso = ca.get("mass", 0.5) * cb.get("mass", 0.5)
            if _es_neutral(ca) or _es_neutral(cb):
                sub = 0.85
            else:
                hue = _armonia_hue(ca["h"], cb["h"])
                valor = _valor_contraste(ca["v"], cb["v"])
                sub = 0.75 * hue + 0.25 * valor
            acum += sub * peso
            total_peso += peso
    if total_peso == 0:
        return 0.5
    return min(1.0, max(0.0, acum / total_peso))


def score_outfit(garments: list[dict[str, Any]]) -> float:
    """Armonia global de un outfit: promedio de todos los pares, en [0,1]."""
    if len(garments) < 2:
        return 0.8  # una sola prenda no puede discordar consigo misma
    scores = []
    for i in range(len(garments)):
        for j in range(i + 1, len(garments)):
            scores.append(score_pair(garments[i]["colors"], garments[j]["colors"]))
    return min(1.0, max(0.0, sum(scores) / len(scores)))


def embedding_score(embeddings: list[list[float]]) -> float:
    """Similitud coseno promedio entre embeddings CLIP de las prendas, en [0,1].

    CLIP vive en [-1,1]; se desplaza a [0,1] para cumplir el contrato Zod. Es
    el proxy del embedding_score hasta que exista el Triplet Loss entrenado.
    """
    if len(embeddings) < 2:
        return 0.5
    sims = []
    for i in range(len(embeddings)):
        for j in range(i + 1, len(embeddings)):
            sims.append(_cosine(embeddings[i], embeddings[j]))
    prom = sum(sims) / len(sims)
    return min(1.0, max(0.0, (prom + 1.0) / 2.0))


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
