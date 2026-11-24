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
    GarmentPosition.DRESS,
    GarmentPosition.OUTERWEAR,
    GarmentPosition.FOOTWEAR,
    GarmentPosition.BAG,
)

# Cuantas prendas por posicion se consideran en la generacion.
MAX_PER_POSITION = 8


def _por_posicion(garments: list[dict[str, Any]]) -> dict[GarmentPosition, list[dict[str, Any]]]:
    """Agrupa prendas por posicion, descartando las que no tienen posicion valida."""
    agrupadas: dict[GarmentPosition, list[dict[str, Any]]] = {p: [] for p in GarmentPosition}
    for g in garments:
        pos_raw = g.get("position")
        if pos_raw is None:
            continue
        try:
            posicion = (
                pos_raw if isinstance(pos_raw, GarmentPosition) else GarmentPosition(str(pos_raw))
            )
        except ValueError:
            continue
        # Ya vienen ordenadas por created_at desc desde el repo; corto a MAX.
        if len(agrupadas[posicion]) < MAX_PER_POSITION:
            agrupadas[posicion].append(g)
    return agrupadas


def _mejores_accesorios(
    nucleo: list[dict[str, Any]],
    candidatos: list[dict[str, Any]],
    max_items: int,
) -> list[dict[str, Any] | None]:
    """Selecciona los mejores complementos (calzado/bolso) por afinidad cromatica con el nucleo."""
    if not candidatos:
        return [None]
    if len(candidatos) <= max_items:
        return list(candidatos)
    rankeados = sorted(
        candidatos,
        key=lambda item: score_outfit([*nucleo, item]),
        reverse=True,
    )
    return list(rankeados[:max_items])


def _acoplar_complementos(
    nucleos: list[list[dict[str, Any]]],
    shoes: list[dict[str, Any]],
    bags: list[dict[str, Any]],
    shoes_fijos: bool = False,
    bags_fijos: bool = False,
) -> list[list[dict[str, Any]]]:
    """Acopla calzado y bolso sobre nucleos de cuerpo evitando explosion combinatoria."""
    combos: list[list[dict[str, Any]]] = []
    for nucleo in nucleos:
        shoes_opt: list[dict[str, Any] | None] = (
            list(shoes) if shoes_fijos and shoes else _mejores_accesorios(nucleo, shoes, max_items=2)
        )
        for shoe in shoes_opt:
            base = [*nucleo, shoe] if shoe is not None else list(nucleo)
            if bags_fijos and bags:
                for bag in bags:
                    combos.append([*base, bag])
            elif bags:
                mejores_bags = _mejores_accesorios(base, bags, max_items=1)
                for bag in mejores_bags:
                    if bag is not None:
                        combos.append([*base, bag])
                if len(combos) < 250:
                    combos.append(base)
            else:
                combos.append(base)
    return combos


def _combinaciones(
    agrupadas: dict[GarmentPosition, list[dict[str, Any]]],
) -> list[list[dict[str, Any]]]:
    """Combina prendas con doble ancla: Top+Bottom o Dress (+Outerwear, Footwear y Bag).

    - Ancla A: bottom + top (+ outerwear opcional).
    - Ancla B: dress (+ outerwear opcional), sin mezclar top/bottom.
    - Calzado y bolso se acoplan sobre los nucleos manteniendo costo acotado.
    """
    tops = agrupadas[GarmentPosition.TOP]
    bottoms = agrupadas[GarmentPosition.BOTTOM]
    dresses = agrupadas[GarmentPosition.DRESS]
    outers: list[dict[str, Any] | None] = (
        [*agrupadas[GarmentPosition.OUTERWEAR], None]
        if agrupadas[GarmentPosition.OUTERWEAR]
        else [None]
    )
    shoes = agrupadas[GarmentPosition.FOOTWEAR]
    bags = agrupadas[GarmentPosition.BAG]

    nucleos: list[list[dict[str, Any]]] = []
    for bottom in bottoms:
        for top in tops:
            for outer in outers:
                capas = [c for c in (bottom, top, outer) if c is not None]
                nucleos.append(capas)

    for dress in dresses:
        for outer in outers:
            capas = [c for c in (dress, outer) if c is not None]
            nucleos.append(capas)

    return _acoplar_complementos(nucleos, shoes=shoes, bags=bags)


def _ordenar_capas(garment_dicts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ordena las prendas del outfit segun LAYER_ORDER para el layering."""

    def clave(g: dict[str, Any]) -> int:
        try:
            return LAYER_ORDER.index(GarmentPosition(g["position"]))
        except ValueError:
            return len(LAYER_ORDER)

    return sorted(garment_dicts, key=clave)


# Caché en memoria para evitar recalcular distancias cromáticas y de embeddings
_COMBO_SCORES_CACHE: dict[tuple[str, ...], tuple[float, float]] = {}

_BUSY_PATTERNS = frozenset({"striped", "plaid", "floral", "graphic"})


def _rankear_y_explicar_combos(
    combos: list[list[dict[str, Any]]],
    disliked_combinations: list[set[str]] | None = None,
    preferred_aesthetics: list[str] | None = None,
    occasion: str | None = None,
    weather: str | None = None,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """Aplica scoring multimodal (cromático + embedding + contexto + feedback) y explicabilidad."""
    rankeados: list[dict[str, Any]] = []
    for capas in combos:
        capa_ids = {g["id"] for g in capas if "id" in g}
        if disliked_combinations and any(
            capa_ids == d_set or (len(d_set) > 1 and d_set.issubset(capa_ids))
            for d_set in disliked_combinations
        ):
            continue

        cache_key = tuple(sorted(capa_ids))
        if cache_key in _COMBO_SCORES_CACHE:
            chroma, emb = _COMBO_SCORES_CACHE[cache_key]
        else:
            chroma = score_outfit(capas)
            emb = embedding_score([g["embedding"] for g in capas if g.get("embedding")])
            if len(_COMBO_SCORES_CACHE) > 5000:
                _COMBO_SCORES_CACHE.clear()
            _COMBO_SCORES_CACHE[cache_key] = (chroma, emb)

        score = WEIGHTS["chromatic"] * chroma + WEIGHTS["embedding"] * emb
        capas_ordenadas = _ordenar_capas(capas)
        estetica = _estetica_dominante(capas_ordenadas)

        # 1. Modulación por feedback previo (Memoria de estilo)
        if preferred_aesthetics and estetica in preferred_aesthetics:
            score = min(1.0, score + 0.10)

        # 2. Modulación por contexto térmico (Clima)
        has_outer = any(g.get("position") in (GarmentPosition.OUTERWEAR.value, GarmentPosition.OUTERWEAR) for g in capas)
        if weather == "cold":
            if has_outer:
                score = min(1.0, score + 0.12)
            else:
                score = max(0.0, score - 0.15)
        elif weather == "warm":
            if has_outer:
                score = max(0.0, score - 0.20)
            else:
                score = min(1.0, score + 0.08)

        # 3. Modulación por ocasión
        if occasion:
            occ_lower = occasion.lower()
            if occ_lower in ("formal", "work") and estetica in ("formal", "minimalist", "old money") or occ_lower in ("sport", "outdoor") and estetica in ("gorpcore", "casual") or occ_lower in ("party", "night") and estetica in ("starboy", "y2k", "streetwear"):
                score = min(1.0, score + 0.15)
            elif occ_lower in ("university", "casual") and estetica in ("casual", "vintage", "soft boy"):
                score = min(1.0, score + 0.10)

        # 4. Modulación por estampados (pattern clash vs equilibrio con piezas lisas)
        patrones = [
            str(g.get("pattern")).strip().lower()
            for g in capas
            if g.get("pattern")
        ]
        busy_count = sum(1 for p in patrones if p in _BUSY_PATTERNS)
        solid_count = sum(1 for p in patrones if p == "solid")
        pattern_note: str | None = None
        if busy_count >= 2:
            score = max(0.0, score - 0.14)
        elif busy_count == 1 and solid_count >= 1:
            score = min(1.0, score + 0.04)
            pattern_note = "equilibrio entre estampado y piezas lisas"

        # Generación de explicación explicable para el usuario
        explicacion_partes = []
        if chroma >= 0.75:
            explicacion_partes.append(f"Alta armonía de color ({round(chroma * 100)}%)")
        else:
            explicacion_partes.append(f"Contraste tonal equilibrado ({round(chroma * 100)}%)")

        if pattern_note:
            explicacion_partes.append(pattern_note)

        if weather == "cold" and has_outer:
            explicacion_partes.append("capa exterior térmica para bajas temperaturas")
        elif weather == "warm" and not has_outer:
            explicacion_partes.append("composición ligera y fresca para clima cálido")

        if occasion:
            explicacion_partes.append(f"adecuado para ocasión {occasion}")
        else:
            explicacion_partes.append(f"estilo {estetica}")

        reason = ", ".join(explicacion_partes).capitalize() + "."

        rankeados.append(
            {
                "aesthetic": estetica,
                "garments": capas_ordenadas,
                "chromatic_score": round(chroma, 4),
                "embedding_score": round(emb, 4),
                "occasion": occasion,
                "weather": weather,
                "reason": reason,
                "_score": round(score, 4),
            }
        )

    rankeados.sort(key=lambda r: -r["_score"])
    return rankeados[:limit]


def recommend_outfits(
    garments: list[dict[str, Any]],
    target_aesthetic: str | None = None,
    limit: int = 6,
    disliked_combinations: list[set[str]] | None = None,
    preferred_aesthetics: list[str] | None = None,
    occasion: str | None = None,
    weather: str | None = None,
) -> list[dict[str, Any]]:
    """Devuelve los mejores outfits armados con `garments`, aplicando personalizacion y contexto.

    Descarta automáticamente prendas cuyo status sea diferente de 'AVAILABLE'.
    """
    # Excluir prendas en lavandería, reparación o inactivas
    disponibles = [g for g in garments if g.get("status", "AVAILABLE") == "AVAILABLE"]
    if not disponibles:
        return []

    if target_aesthetic:
        filtradas = [g for g in disponibles if g.get("aesthetic") == target_aesthetic]
        if filtradas:
            disponibles = filtradas

    agrupadas = _por_posicion(disponibles)
    combos = _combinaciones(agrupadas)
    return _rankear_y_explicar_combos(
        combos,
        disliked_combinations=disliked_combinations,
        preferred_aesthetics=preferred_aesthetics,
        occasion=occasion,
        weather=weather,
        limit=limit,
    )


def remix_outfit(
    garments: list[dict[str, Any]],
    pinned_garment_ids: list[str],
    target_aesthetic: str | None = None,
    limit: int = 6,
    disliked_combinations: list[set[str]] | None = None,
    preferred_aesthetics: list[str] | None = None,
    occasion: str | None = None,
    weather: str | None = None,
) -> list[dict[str, Any]]:
    """Genera alternativas de outfit anclando estrictamente las prendas fijadas en `pinned_garment_ids`.

    Las prendas no ancladas se completan con prendas del guardarropa que estén 'AVAILABLE'.
    """
    pinned_set = set(pinned_garment_ids)
    pinned_garments = [g for g in garments if g.get("id") in pinned_set]
    if not pinned_garments:
        return recommend_outfits(
            garments,
            target_aesthetic=target_aesthetic,
            limit=limit,
            disliked_combinations=disliked_combinations,
            preferred_aesthetics=preferred_aesthetics,
            occasion=occasion,
            weather=weather,
        )

    # Identificar prendas ancladas por posición
    pinned_by_pos: dict[str, dict[str, Any]] = {}
    for g in pinned_garments:
        pos = g.get("position")
        if pos:
            # Si pos es un enum, extraer .value
            pos_str = pos.value if hasattr(pos, "value") else str(pos)
            pinned_by_pos[pos_str] = g

    # Prendas disponibles para las posiciones restantes
    libres = [
        g for g in garments
        if g.get("id") not in pinned_set and g.get("status", "AVAILABLE") == "AVAILABLE"
    ]
    if target_aesthetic:
        filtradas = [g for g in libres if g.get("aesthetic") == target_aesthetic]
        if filtradas:
            libres = filtradas

    agrupadas = _por_posicion(libres)

    # Armado condicional de capas respetando las fijadas (doble ancla: top+bottom o dress)
    outers: list[dict[str, Any] | None]
    if GarmentPosition.OUTERWEAR.value in pinned_by_pos:
        outers = [pinned_by_pos[GarmentPosition.OUTERWEAR.value]]
    elif agrupadas[GarmentPosition.OUTERWEAR]:
        outers = [*agrupadas[GarmentPosition.OUTERWEAR], None]
    else:
        outers = [None]

    shoes_fijos = GarmentPosition.FOOTWEAR.value in pinned_by_pos
    shoes = (
        [pinned_by_pos[GarmentPosition.FOOTWEAR.value]]
        if shoes_fijos
        else agrupadas[GarmentPosition.FOOTWEAR]
    )

    bags_fijos = GarmentPosition.BAG.value in pinned_by_pos
    bags = (
        [pinned_by_pos[GarmentPosition.BAG.value]]
        if bags_fijos
        else agrupadas[GarmentPosition.BAG]
    )

    nucleos: list[list[dict[str, Any]]] = []
    has_pinned_dress = GarmentPosition.DRESS.value in pinned_by_pos
    has_pinned_split = (
        GarmentPosition.TOP.value in pinned_by_pos
        or GarmentPosition.BOTTOM.value in pinned_by_pos
    )

    if has_pinned_dress:
        dress = pinned_by_pos[GarmentPosition.DRESS.value]
        for outer in outers:
            nucleos.append([c for c in (dress, outer) if c is not None])
    else:
        tops = (
            [pinned_by_pos[GarmentPosition.TOP.value]]
            if GarmentPosition.TOP.value in pinned_by_pos
            else agrupadas[GarmentPosition.TOP]
        )
        bottoms = (
            [pinned_by_pos[GarmentPosition.BOTTOM.value]]
            if GarmentPosition.BOTTOM.value in pinned_by_pos
            else agrupadas[GarmentPosition.BOTTOM]
        )
        for bottom in bottoms:
            for top in tops:
                for outer in outers:
                    nucleos.append([c for c in (bottom, top, outer) if c is not None])

        if not has_pinned_split:
            for dress in agrupadas[GarmentPosition.DRESS]:
                for outer in outers:
                    nucleos.append([c for c in (dress, outer) if c is not None])

    combos = [
        capas
        for capas in _acoplar_complementos(
            nucleos,
            shoes=shoes,
            bags=bags,
            shoes_fijos=shoes_fijos,
            bags_fijos=bags_fijos,
        )
        if pinned_set.issubset({g["id"] for g in capas if "id" in g})
    ]

    return _rankear_y_explicar_combos(
        combos,
        disliked_combinations=disliked_combinations,
        preferred_aesthetics=preferred_aesthetics,
        occasion=occasion,
        weather=weather,
        limit=limit,
    )


def evaluate_manual_combo(
    garments: list[dict[str, Any]],
    occasion: str | None = None,
    weather: str | None = None,
) -> dict[str, Any]:
    """Evalúa una combinación elegida manualmente por el usuario."""
    resultados = _rankear_y_explicar_combos(
        [garments],
        occasion=occasion,
        weather=weather,
        limit=1,
    )
    return resultados[0]


def _estetica_dominante(capas: list[dict[str, Any]]) -> str:
    """Estetica mas repetida entre las prendas; empate -> top o dress."""
    conteo: dict[str, int] = {}
    for g in capas:
        a = g.get("aesthetic") or "casual"
        conteo[a] = conteo.get(a, 0) + 1
    ancla = next(
        (
            g
            for g in capas
            if g["position"] in (GarmentPosition.TOP.value, GarmentPosition.DRESS.value)
        ),
        None,
    )
    if ancla and (ancla.get("aesthetic") or "casual") in conteo:
        return ancla["aesthetic"] or "casual"
    return max(conteo.items(), key=lambda kv: kv[1])[0]
