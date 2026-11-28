"""Tests unitarios para el servicio de clima (WeatherAPI -> Open-Meteo -> fallback estático)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from services import weather


def _mock_client(response: MagicMock | None = None, side_effect: Exception | None = None):
    client = MagicMock()
    if side_effect is not None:
        client.get.side_effect = side_effect
    else:
        client.get.return_value = response
    cm = MagicMock()
    cm.__enter__.return_value = client
    cm.__exit__.return_value = False
    return cm


def test_classify_thermal_type():
    assert weather._classify_thermal_type(10.0, False) == "cold"
    assert weather._classify_thermal_type(25.0, True) == "cold"
    assert weather._classify_thermal_type(19.0, False) == "mild"
    assert weather._classify_thermal_type(27.0, False) == "warm"


def test_get_current_weather_weatherapi_and_cache():
    weather._WEATHER_CACHE.clear()
    resp = MagicMock(status_code=200)
    resp.json.return_value = {
        "location": {"name": "La Paz"},
        "current": {"temp_c": 12.4, "condition": {"text": "Light rain"}, "precip_mm": 1.2},
    }

    with patch("services.weather.httpx.Client", return_value=_mock_client(resp)) as mock_cls:
        res1 = weather.get_current_weather(city="La Paz", api_key="fake-key")
        res2 = weather.get_current_weather(city="La Paz", api_key="fake-key")

    assert res1["source"] == "weatherapi"
    assert res1["weather_type"] == "cold"
    assert res1["is_raining"] is True
    assert res2 == res1
    assert mock_cls.call_count == 1
    client = mock_cls.return_value.__enter__.return_value
    assert client.get.call_args.args[0].startswith("https://")
    assert client.get.call_args.kwargs["params"]["key"] == "fake-key"


def test_get_current_weather_open_meteo_fallback():
    weather._WEATHER_CACHE.clear()
    resp_meteo = MagicMock(status_code=200)
    resp_meteo.json.return_value = {
        "current": {"temperature_2m": 26.2, "precipitation": 0.0, "weather_code": 0}
    }

    with patch(
        "services.weather.httpx.Client",
        side_effect=[
            _mock_client(side_effect=RuntimeError("WeatherAPI down")),
            _mock_client(resp_meteo),
        ],
    ):
        res = weather.get_current_weather(city="Santa Cruz", api_key="fake-key")

    assert res["source"] == "open-meteo"
    assert res["weather_type"] == "warm"
    assert res["condition"] == "Clear"


def test_get_current_weather_static_fallback():
    weather._WEATHER_CACHE.clear()
    with patch(
        "services.weather.httpx.Client",
        return_value=_mock_client(side_effect=RuntimeError("network error")),
    ):
        res = weather.get_current_weather(city="Cochabamba", api_key=None)

    assert res["source"] == "fallback"
    assert res["weather_type"] == "mild"
    assert res["city"] == "Cochabamba"


def test_get_current_weather_rechaza_coordenadas_fuera_de_rango():
    import pytest

    with pytest.raises(ValueError):
        weather.get_current_weather(lat=91)
    with pytest.raises(ValueError):
        weather.get_current_weather(lon=-181)
