"""Servicio de clima para recomendaciones contextuales de outfits.

Consulta WeatherAPI (o fallback a Open-Meteo sin API key requerida) y mapea
la temperatura y condiciones a tipos térmicos aplicables a vestimenta (cold, mild, warm).
Incluye caché en memoria de 30 minutos para evitar saturación de red.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Caché simple en memoria: clave -> (timestamp, data)
_WEATHER_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 7200.0  # 2 horas (ahorro de cuota de API externa)

# Coordenadas por defecto (La Paz, Bolivia) si no se proveen
DEFAULT_LAT = -16.5000
DEFAULT_LON = -68.1500
DEFAULT_CITY = "La Paz"

KNOWN_CITY_COORDS: dict[str, tuple[float, float]] = {
    "la paz": (-16.5000, -68.1500),
    "el alto": (-16.5047, -68.1633),
    "cochabamba": (-17.3935, -66.1570),
    "santa cruz": (-17.7833, -63.1821),
    "sucre": (-19.0333, -65.2627),
    "tarija": (-21.5355, -64.7296),
    "oruro": (-17.9833, -67.1500),
    "potosi": (-19.5836, -65.7531),
    "potosí": (-19.5836, -65.7531),
}


def _classify_thermal_type(temp_c: float, is_raining: bool) -> str:
    """Clasifica la temperatura en tipo térmico para moda."""
    if is_raining or temp_c < 16.0:
        return "cold"
    if 16.0 <= temp_c <= 23.0:
        return "mild"
    return "warm"


def get_current_weather(
    city: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """Obtiene el clima actual y su clasificación para moda."""
    key = api_key or os.environ.get("WEATHER_API_KEY") or os.environ.get("WEATHERAPI_KEY")
    has_coords = lat is not None and lon is not None
    norm_city = city.strip().lower() if city else ""
    norm_lat = round(lat, 2) if has_coords and lat is not None else None
    norm_lon = round(lon, 2) if has_coords and lon is not None else None
    cache_key = f"{norm_city}_{norm_lat}_{norm_lon}"
    now = time.time()

    if cache_key in _WEATHER_CACHE:
        cached_time, cached_data = _WEATHER_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    resolved_label = city.strip() if city and city.strip() else ("Tu ubicación" if has_coords else DEFAULT_CITY)

    # 1. Intentar con WeatherAPI si hay API Key
    if key:
        query = f"{lat},{lon}" if has_coords else resolved_label
        url = f"http://api.weatherapi.com/v1/current.json?key={key}&q={query}&aqi=no"
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    temp_c = float(data["current"]["temp_c"])
                    condition_text = data["current"]["condition"]["text"]
                    precip_mm = float(data["current"].get("precip_mm", 0.0))
                    is_raining = precip_mm > 0.0 or any(
                        r in condition_text.lower() for r in ("rain", "drizzle", "shower", "thunderstorm", "snow")
                    )
                    weather_type = _classify_thermal_type(temp_c, is_raining)
                    resolved_city = data["location"].get("name", resolved_label)

                    result = {
                        "city": resolved_city,
                        "temp_c": round(temp_c, 1),
                        "condition": condition_text,
                        "weather_type": weather_type,
                        "is_raining": is_raining,
                        "source": "weatherapi",
                    }
                    _WEATHER_CACHE[cache_key] = (now, result)
                    return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallo en WeatherAPI (%s), intentando Open-Meteo fallback...", exc)

    # 2. Fallback a Open-Meteo (100% libre, sin API key)
    if has_coords and lat is not None and lon is not None:
        actual_lat, actual_lon = lat, lon
    else:
        actual_lat, actual_lon = KNOWN_CITY_COORDS.get(norm_city, (DEFAULT_LAT, DEFAULT_LON))

    open_meteo_url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={actual_lat}&longitude={actual_lon}"
        "&current=temperature_2m,precipitation,weather_code"
    )
    try:
        with httpx.Client(timeout=5.0) as client:
            res = client.get(open_meteo_url)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                temp_c = float(current.get("temperature_2m", 15.0))
                precip = float(current.get("precipitation", 0.0))
                is_raining = precip > 0.1
                weather_type = _classify_thermal_type(temp_c, is_raining)

                result = {
                    "city": resolved_label,
                    "temp_c": round(temp_c, 1),
                    "condition": "Rainy" if is_raining else ("Clear" if temp_c > 18.0 else "Cool"),
                    "weather_type": weather_type,
                    "is_raining": is_raining,
                    "source": "open-meteo",
                }
                _WEATHER_CACHE[cache_key] = (now, result)
                return result
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo en Open-Meteo fallback (%s), usando estimación segura...", exc)

    # 3. Fallback estático de resiliencia
    fallback_res = {
        "city": resolved_label,
        "temp_c": 15.0,
        "condition": "Mild / Season",
        "weather_type": "mild",
        "is_raining": False,
        "source": "fallback",
    }
    _WEATHER_CACHE[cache_key] = (now, fallback_res)
    return fallback_res


# Alias conveniente
get_weather = get_current_weather

