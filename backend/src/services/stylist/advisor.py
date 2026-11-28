"""Asesor de Moda Virtual con Azure OpenAI y fallback experto local.

Implementa explicabilidad en dos niveles:
1. Generación instantánea basada en reglas cromáticas, ocasión, clima y piezas.
2. Enriquecimiento estructurado mediante Azure OpenAI (`gpt-5-mini`) bajo demanda,
   con fallback resiliente (sin cachear fallos transitorios).
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from config import Settings, settings
from domain.schemas import StylistAdviceResponse

logger = logging.getLogger(__name__)

ADVICE_CACHE_TTL_SECONDS = 3600.0
MAX_CACHE_ENTRIES = 500
_ADVICE_CACHE: dict[tuple[str, str, str, str], tuple[float, dict[str, Any]]] = {}

_WEATHER_LABELS = {
    "cold": "clima frío",
    "mild": "clima templado",
    "warm": "clima cálido",
}

_PATTERN_LABELS = {
    "solid": "liso",
    "striped": "a rayas",
    "plaid": "a cuadros",
    "floral": "floral",
    "graphic": "estampado gráfico",
}

_OCCASION_TIPS = {
    "work": (
        "Mochila o portafolio estructurado en tono neutro",
        "Reloj metálico discreto o pulsera minimalista",
        "Cinturón de cuero liso haciendo juego con el calzado",
    ),
    "formal": (
        "Clutch o bolso compacto estructurado",
        "Joyería sutil en acabado dorado o plateado",
        "Cinturón fino de hebilla clásica",
    ),
    "party": (
        "Bolso cruzado pequeño con detalle metálico",
        "Aretes o cadena protagonista que ilumine el rostro",
        "Gafas oscuras o pañuelo de seda como acento",
    ),
    "sport": (
        "Riñonera o tote ligera de tela técnica",
        "Gorra limpia en tono neutro del conjunto",
        "Reloj deportivo o banda minimalista",
    ),
}

_DEFAULT_ACCESSORIES = (
    "Reloj minimalista de correa limpia",
    "Bolso o bandolera estructurada en tono neutro",
    "Lentes de sol clásicos o pañuelo ligero de contraste",
)

_SYSTEM_PROMPT = (
    "Eres un asesor de moda y estilista personal profesional. Hablas en español usando "
    "'tú', con un tono directo, práctico, elegante y cercano. Responde ÚNICAMENTE con un "
    "objeto JSON válido (sin markdown ni texto adicional) con exactamente estas 4 claves:\n"
    '- "why_it_works": string (2-3 frases explicando armonía cromática, proporciones y capas).\n'
    '- "accessories": array de 3 strings cortos y accionables (bolso, joyería, cinturón, etc.).\n'
    '- "grooming_and_footwear": string (recomendación concreta de calzado y arreglo/peinado).\n'
    '- "event_adaptation": string (cómo transformar o ajustar este look para otro momento del día).'
)


def clear_advice_cache() -> None:
    """Limpia la caché en memoria de consejos de estilista (útil en tests)."""
    _ADVICE_CACHE.clear()


def _is_azure_openai_configured(cfg: Settings) -> bool:
    return bool(
        cfg.azure_openai_endpoint
        and cfg.azure_openai_api_key
        and cfg.azure_openai_deployment_name
    )


def _format_garments_summary(garments: list[dict[str, Any]]) -> str:
    if not garments:
        return "Sin detalle de prendas."
    partes: list[str] = []
    for g in garments:
        pos = g.get("position") or "prenda"
        cat = g.get("category") or pos
        subcat = g.get("subcategory")
        pattern_raw = str(g.get("pattern") or "").strip().lower()
        cat_txt = f"{cat} ({subcat})" if subcat and subcat != cat else str(cat)
        pattern_txt = (
            f" · estampado: {_PATTERN_LABELS.get(pattern_raw, pattern_raw)}"
            if pattern_raw
            else ""
        )
        colors = g.get("dominant_colors") or g.get("colors") or []
        hexes = [c.get("hex") for c in colors if isinstance(c, dict) and c.get("hex")]
        color_txt = f" (colores: {', '.join(hexes[:2])})" if hexes else ""
        partes.append(f"- {pos}: {cat_txt}{pattern_txt}{color_txt}")
    return "\n".join(partes)


def _build_rule_based_advice(context: dict[str, Any]) -> dict[str, Any]:
    """Genera los 4 bloques de asesoramiento estilístico de forma determinista y local."""
    aesthetic = str(context.get("aesthetic") or "casual").replace("_", " ")
    garments: list[dict[str, Any]] = context.get("garments") or []
    chroma_pct = round(float(context.get("chromatic_score") or 0.0) * 100)
    emb_pct = round(float(context.get("embedding_score") or 0.0) * 100)
    occasion = (context.get("occasion") or "").strip().lower()
    weather = (context.get("weather") or "").strip().lower()
    user_note = (context.get("user_note") or "").strip()

    positions = {str(g.get("position") or "") for g in garments}
    categories = [
        str(g.get("subcategory") or g.get("category") or g.get("position") or "prenda")
        for g in garments
    ]
    piezas_txt = ", ".join(categories[:4]) if categories else "tus prendas seleccionadas"

    patrones = [str(g.get("pattern") or "").strip().lower() for g in garments if g.get("pattern")]
    busy_patterns = [p for p in patrones if p in ("striped", "plaid", "floral", "graphic")]
    has_solid = "solid" in patrones

    clima_txt = _WEATHER_LABELS.get(weather, "uso diario versátil")
    ocasion_txt = f"para {occasion}" if occasion else "para un plan versátil"

    why_parts = [
        f"Este conjunto de estética {aesthetic} equilibra {piezas_txt} con una armonía cromática del {chroma_pct}% y afinidad de estilo del {emb_pct}%.",
    ]
    if busy_patterns and has_solid:
        pattern_label = _PATTERN_LABELS.get(busy_patterns[0], busy_patterns[0])
        why_parts.append(
            f"El protagonismo del patrón {pattern_label} queda bien contenido gracias a las piezas lisas que equilibran la mirada."
        )
    elif len(busy_patterns) >= 2:
        why_parts.append(
            "Al combinar más de un estampado, mantén los accesorios en tonos sólidos y neutros para unificar el conjunto."
        )
    if "outerwear" in positions:
        why_parts.append(
            f"La capa exterior aporta estructura visual y hace el conjunto especialmente funcional en {clima_txt}."
        )
    else:
        why_parts.append(
            f"Las líneas limpias entre la parte superior e inferior mantienen proporciones ordenadas, ideales {ocasion_txt} en {clima_txt}."
        )
    if user_note:
        why_parts.append(f"Considerando tu nota ('{user_note}'), prioriza comodidad y balance en las capas.")

    accessories = list(_OCCASION_TIPS.get(occasion, _DEFAULT_ACCESSORIES))
    if len(busy_patterns) >= 2:
        accessories[0] = "Cinturón o bolso liso en tono neutro sólido para anclar los estampados"

    has_footwear = "footwear" in positions
    if occasion in ("work", "formal"):
        footwear = (
            "Mantén el calzado protagonista limpio y pulido"
            if has_footwear
            else "Complétalo con mocasines de cuero, botines minimalistas o zapatos derby limpios"
        )
        grooming = "Un peinado ordenado con acabado natural y líneas pulidas refuerza la presencia profesional."
    elif weather == "cold":
        footwear = (
            "Acompaña el calzado incluido con medias térmicas discretas"
            if has_footwear
            else "Elige botines cerrados de suela firme o zapatillas de cuero limpias"
        )
        grooming = "Un acabado natural con bálsamo hidratante y capas bien asentadas en cuello y hombros elevará el conjunto."
    else:
        footwear = (
            "El calzado elegido cierra bien la silueta; asegúrate de mantener contraste limpio en la suela"
            if has_footwear
            else "Remata con zapatillas blancas minimalistas, loafers suaves o botines urbanos según tu ritmo del día"
        )
        grooming = "Lleva un peinado relajado pero intencional para equilibrar la estética general."
    grooming_and_footwear = f"{footwear}. {grooming}"

    if "outerwear" in positions:
        event_adaptation = (
            "Si pasas a un ambiente interior o nocturno, retira la capa exterior y deja a la vista la prenda "
            "superior sumando un accesorio metálico para cambiar el registro al instante."
        )
    elif weather == "warm":
        event_adaptation = (
            "Para extender el look hacia la tarde o noche, incorpora una sobrecamisa ligera o blazer desestructurado "
            "y cambia a un bolso más compacto."
        )
    else:
        event_adaptation = (
            "Puedes volverlo más formal agregando un blazer o abrigo recto en tono neutro, o relajarlo "
            "arremangando ligeramente la parte superior y cambiando a zapatillas limpias."
        )

    return {
        "why_it_works": " ".join(why_parts),
        "accessories": accessories,
        "grooming_and_footwear": grooming_and_footwear,
        "event_adaptation": event_adaptation,
    }


def _parse_stylist_json(raw_content: str) -> dict[str, Any]:
    """Valida y normaliza la respuesta JSON devuelta por Azure OpenAI."""
    data = json.loads(raw_content.strip())
    if not isinstance(data, dict):
        raise TypeError("La respuesta de Azure OpenAI no es un objeto JSON")

    why = str(data.get("why_it_works") or "").strip()
    grooming = str(data.get("grooming_and_footwear") or "").strip()
    adaptation = str(data.get("event_adaptation") or "").strip()
    raw_accessories = data.get("accessories")

    if not why or not grooming or not adaptation or not isinstance(raw_accessories, list):
        raise ValueError("Faltan campos requeridos en la respuesta de Azure OpenAI")

    accessories = [str(item).strip() for item in raw_accessories if str(item).strip()][:4]
    if not accessories:
        raise ValueError("La lista accessories está vacía")

    return {
        "why_it_works": why,
        "accessories": accessories,
        "grooming_and_footwear": grooming,
        "event_adaptation": adaptation,
    }


def _call_azure_openai(context: dict[str, Any], cfg: Settings) -> dict[str, Any]:
    """Invoca Azure OpenAI Chat Completions (sin temperature para compatibilidad gpt-5-mini)."""
    endpoint = (cfg.azure_openai_endpoint or "").rstrip("/")
    deployment = cfg.azure_openai_deployment_name or ""
    api_version = cfg.azure_openai_api_version or "2024-12-01-preview"
    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

    chroma_pct = round(float(context.get("chromatic_score") or 0.0) * 100)
    emb_pct = round(float(context.get("embedding_score") or 0.0) * 100)
    user_lines = [
        f"Estética principal: {context.get('aesthetic') or 'casual'}",
        f"Armonía cromática: {chroma_pct}% | Afinidad CLIP: {emb_pct}%",
        f"Ocasión: {context.get('occasion') or 'versátil'}",
        f"Clima: {context.get('weather') or 'templado'}",
    ]
    if context.get("reason"):
        user_lines.append(f"Resumen base: {context['reason']}")
    if context.get("user_note"):
        user_lines.append(f"Nota adicional del usuario: {context['user_note']}")
    user_lines.append("Prendas del conjunto:")
    user_lines.append(_format_garments_summary(context.get("garments") or []))

    payload = {
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": "\n".join(user_lines)},
        ],
        "response_format": {"type": "json_object"},
        "max_completion_tokens": 1200,
        "reasoning_effort": "minimal",
    }
    headers = {
        "api-key": cfg.azure_openai_api_key or "",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=cfg.azure_openai_timeout_s) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()

    choices = body.get("choices") or []
    if not choices:
        raise ValueError("Azure OpenAI devolvió choices vacío")
    content = choices[0].get("message", {}).get("content")
    if not content or not isinstance(content, str):
        raise ValueError("Azure OpenAI devolvió content vacío")

    return _parse_stylist_json(content)


def _store_cache(cache_key: tuple[str, str, str, str], entry: dict[str, Any], now: float) -> None:
    if len(_ADVICE_CACHE) >= MAX_CACHE_ENTRIES:
        _ADVICE_CACHE.clear()
    _ADVICE_CACHE[cache_key] = (now, entry)


def get_stylist_advice(
    outfit_id: str,
    aesthetic: str,
    garments: list[dict[str, Any]],
    chromatic_score: float,
    embedding_score: float,
    occasion: str | None = None,
    weather: str | None = None,
    reason: str | None = None,
    user_note: str | None = None,
    cfg: Settings | None = None,
) -> StylistAdviceResponse:
    """Devuelve asesoramiento estilístico usando Azure OpenAI con fallback local resiliente."""
    active_cfg = cfg or settings
    cache_key = (
        outfit_id,
        occasion or "",
        weather or "",
        (user_note or "").strip().lower(),
    )
    now = time.time()

    cached_entry = _ADVICE_CACHE.get(cache_key)
    if cached_entry is not None:
        cached_at, payload = cached_entry
        if now - cached_at < ADVICE_CACHE_TTL_SECONDS:
            return StylistAdviceResponse(
                outfit_id=outfit_id,
                **payload,
                cached=True,
            )

    context = {
        "outfit_id": outfit_id,
        "aesthetic": aesthetic,
        "garments": garments,
        "chromatic_score": chromatic_score,
        "embedding_score": embedding_score,
        "occasion": occasion,
        "weather": weather,
        "reason": reason,
        "user_note": user_note,
    }

    if _is_azure_openai_configured(active_cfg):
        try:
            advice = _call_azure_openai(context, active_cfg)
            entry = {
                **advice,
                "source": "azure_openai",
                "model": active_cfg.azure_openai_deployment_name,
            }
            _store_cache(cache_key, entry, now)
            return StylistAdviceResponse(outfit_id=outfit_id, **entry, cached=False)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Fallo al consultar Azure OpenAI para outfit %s (%s); usando asesor local",
                outfit_id,
                exc,
            )
            fallback = _build_rule_based_advice(context)
            return StylistAdviceResponse(
                outfit_id=outfit_id,
                **fallback,
                source="rules",
                model=None,
                cached=False,
            )

    local_advice = _build_rule_based_advice(context)
    entry = {
        **local_advice,
        "source": "rules",
        "model": None,
    }
    _store_cache(cache_key, entry, now)
    return StylistAdviceResponse(outfit_id=outfit_id, **entry, cached=False)
