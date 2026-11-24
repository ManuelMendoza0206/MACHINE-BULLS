"""Pruebas unitarias y de contrato para el Asesor de Moda Virtual (stylist)."""

from __future__ import annotations

import dataclasses
import json
import time
from typing import Any

import httpx
import jwt
import pytest

from config import settings
from db.session import SessionLocal
from domain.models import Garment, Outfit, OutfitGarment, User, new_uuid
from services.stylist import clear_advice_cache, get_stylist_advice
from services.stylist.advisor import _format_garments_summary


@pytest.fixture(autouse=True)
def _reset_stylist_cache() -> None:
    clear_advice_cache()


def _sample_garments() -> list[dict[str, Any]]:
    return [
        {
            "category": "shirt",
            "position": "top",
            "dominant_colors": [{"hex": "#FFFFFF"}],
            "aesthetic": "minimalist",
        },
        {
            "category": "pants",
            "position": "bottom",
            "dominant_colors": [{"hex": "#1B263B"}],
            "aesthetic": "minimalist",
        },
        {
            "category": "jacket",
            "position": "outerwear",
            "dominant_colors": [{"hex": "#2B2D42"}],
            "aesthetic": "minimalist",
        },
    ]


def _azure_cfg(**overrides: Any) -> Any:
    base = dataclasses.replace(
        settings,
        azure_openai_endpoint="https://styleme-ai-openai.openai.azure.com/",
        azure_openai_api_key="test-key-azure-123",
        azure_openai_deployment_name="styleme-gpt-5-mini",
        azure_openai_api_version="2024-12-01-preview",
        azure_openai_timeout_s=15.0,
    )
    return dataclasses.replace(base, **overrides) if overrides else base


@pytest.mark.unit
def test_stylist_rule_based_fallback_and_cache() -> None:
    """Sin configuracion Azure OpenAI usa reglas locales y cachea llamadas repetidas."""
    cfg_no_azure = dataclasses.replace(
        settings,
        azure_openai_endpoint=None,
        azure_openai_api_key=None,
        azure_openai_deployment_name=None,
    )

    first = get_stylist_advice(
        outfit_id="outfit-rules-1",
        aesthetic="minimalist",
        garments=_sample_garments(),
        chromatic_score=0.88,
        embedding_score=0.79,
        occasion="work",
        weather="cold",
        cfg=cfg_no_azure,
    )
    assert first.source == "rules"
    assert first.model is None
    assert first.cached is False
    assert first.why_it_works
    assert len(first.accessories) >= 1
    assert first.grooming_and_footwear
    assert first.event_adaptation

    second = get_stylist_advice(
        outfit_id="outfit-rules-1",
        aesthetic="minimalist",
        garments=_sample_garments(),
        chromatic_score=0.88,
        embedding_score=0.79,
        occasion="work",
        weather="cold",
        cfg=cfg_no_azure,
    )
    assert second.cached is True
    assert second.source == "rules"
    assert second.why_it_works == first.why_it_works


@pytest.mark.unit
def test_stylist_azure_openai_success_and_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    """Invoca Azure OpenAI respetando contrato gpt-5-mini y cachea respuestas validas."""
    captured: list[dict[str, Any]] = []
    valid_json = {
        "why_it_works": "El blanco puro ilumina el rostro frente al azul marino y la chaqueta estructura los hombros.",
        "accessories": [
            "Reloj de acero cepillado con correa de cuero negro",
            "Portafolio estructurado en gris grafito",
            "Cinturon liso a tono con el calzado",
        ],
        "grooming_and_footwear": "Derby o botines limpios en cuero oscuro y peinado pulido con acabado natural.",
        "event_adaptation": "Para la noche, cambia el portafolio por un tarjetero minimalista y desabotona el cuello.",
    }

    def fake_post(self: httpx.Client, url: str, **kwargs: Any) -> httpx.Response:
        captured.append({"url": url, "headers": kwargs.get("headers"), "json": kwargs.get("json")})
        return httpx.Response(
            status_code=200,
            json={"choices": [{"message": {"content": json.dumps(valid_json)}}]},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    cfg = _azure_cfg()

    res1 = get_stylist_advice(
        outfit_id="outfit-az-1",
        aesthetic="minimalist",
        garments=_sample_garments(),
        chromatic_score=0.91,
        embedding_score=0.84,
        occasion="work",
        weather="cold",
        user_note="Tengo presentacion con directorio",
        cfg=cfg,
    )

    assert res1.source == "azure_openai"
    assert res1.model == "styleme-gpt-5-mini"
    assert res1.cached is False
    assert res1.why_it_works == valid_json["why_it_works"]
    assert res1.accessories == valid_json["accessories"]
    assert len(captured) == 1

    req_info = captured[0]
    assert req_info["url"] == (
        "https://styleme-ai-openai.openai.azure.com/openai/deployments/"
        "styleme-gpt-5-mini/chat/completions?api-version=2024-12-01-preview"
    )
    assert req_info["headers"]["api-key"] == "test-key-azure-123"
    body = req_info["json"]
    assert "temperature" not in body
    assert body["max_completion_tokens"] == 1200
    assert body["reasoning_effort"] == "minimal"
    assert body["response_format"] == {"type": "json_object"}
    assert "Tengo presentacion con directorio" in body["messages"][1]["content"]

    res2 = get_stylist_advice(
        outfit_id="outfit-az-1",
        aesthetic="minimalist",
        garments=_sample_garments(),
        chromatic_score=0.91,
        embedding_score=0.84,
        occasion="work",
        weather="cold",
        user_note="  tengo presentacion con directorio ",
        cfg=cfg,
    )
    assert res2.cached is True
    assert res2.source == "azure_openai"
    assert res2.model == "styleme-gpt-5-mini"
    assert len(captured) == 1


@pytest.mark.unit
@pytest.mark.parametrize("failure_mode", ["http_500", "timeout", "bad_json"])
def test_stylist_azure_transient_failures_fallback_and_do_not_cache(
    monkeypatch: pytest.MonkeyPatch,
    failure_mode: str,
) -> None:
    """Ante error HTTP/timeout/JSON invalido cae a rules sin cachear el fallo."""
    calls = {"count": 0}
    recovered_json = {
        "why_it_works": "Combinacion recuperada con equilibrio cromatico neutro.",
        "accessories": ["Reloj limpio", "Bandolera compacta"],
        "grooming_and_footwear": "Zapatillas limpias de cuero blanco.",
        "event_adaptation": "Suma un blazer para elevar el conjunto.",
    }

    def fake_post(self: httpx.Client, url: str, **kwargs: Any) -> httpx.Response:
        calls["count"] += 1
        req = httpx.Request("POST", url)
        if calls["count"] == 1:
            if failure_mode == "http_500":
                return httpx.Response(status_code=500, text="upstream error", request=req)
            if failure_mode == "timeout":
                raise httpx.TimeoutException("Azure timed out", request=req)
            return httpx.Response(
                status_code=200,
                json={"choices": [{"message": {"content": "{no es json valido"}}]},
                request=req,
            )
        return httpx.Response(
            status_code=200,
            json={"choices": [{"message": {"content": json.dumps(recovered_json)}}]},
            request=req,
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    cfg = _azure_cfg()

    res_fail = get_stylist_advice(
        outfit_id=f"outfit-fail-{failure_mode}",
        aesthetic="casual",
        garments=_sample_garments(),
        chromatic_score=0.80,
        embedding_score=0.72,
        cfg=cfg,
    )
    assert res_fail.source == "rules"
    assert res_fail.model is None
    assert res_fail.cached is False

    # Si no se cacheo el fallo, la segunda llamada vuelve a consultar Azure y se recupera.
    res_retry = get_stylist_advice(
        outfit_id=f"outfit-fail-{failure_mode}",
        aesthetic="casual",
        garments=_sample_garments(),
        chromatic_score=0.80,
        embedding_score=0.72,
        cfg=cfg,
    )
    assert calls["count"] == 2
    assert res_retry.source == "azure_openai"
    assert res_retry.cached is False
    assert res_retry.why_it_works == recovered_json["why_it_works"]


@pytest.mark.contract
def test_stylist_advice_endpoint_contract_and_authorization(client: Any) -> None:
    """Verifica 200 en outfit propio, 404 en inexistente y 403 ante usuario ajeno."""
    session = SessionLocal()
    try:
        owner = User(id=new_uuid(), email=f"owner-{new_uuid()}@styles.com")
        session.add(owner)
        session.flush()

        top = Garment(
            id=new_uuid(),
            owner_id=owner.id,
            category="shirt",
            position="top",
            image_path="garments/top.jpg",
            processed_image_path="garments/top.png",
            dominant_colors=[{"hex": "#FFFFFF", "pct": 1.0, "h": 0, "s": 0, "v": 100}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.1] * 128,
        )
        bottom = Garment(
            id=new_uuid(),
            owner_id=owner.id,
            category="pants",
            position="bottom",
            image_path="garments/bot.jpg",
            processed_image_path="garments/bot.png",
            dominant_colors=[{"hex": "#1B263B", "pct": 1.0, "h": 215, "s": 54, "v": 23}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.1] * 128,
        )
        session.add_all([top, bottom])
        session.flush()

        outfit = Outfit(
            id=new_uuid(),
            user_id=owner.id,
            aesthetic="casual",
            occasion="casual",
            weather="mild",
            reason="Armonia neutra",
            chromatic_score=0.85,
            embedding_score=0.78,
        )
        session.add(outfit)
        session.flush()
        session.add_all(
            [
                OutfitGarment(outfit_id=outfit.id, garment_id=bottom.id, position="bottom", layer_index=0),
                OutfitGarment(outfit_id=outfit.id, garment_id=top.id, position="top", layer_index=1),
            ]
        )
        session.commit()
        outfit_id = outfit.id
        owner_id = owner.id
        owner_email = owner.email
    finally:
        session.close()

    # 1. Outfit inexistente -> 404
    res_404 = client.post("/api/v1/outfits/no-existe-id/stylist-advice", json={})
    assert res_404.status_code == 404

    # 2. Usuario propietario autenticado -> 200
    owner_token = jwt.encode(
        {
            "sub": owner_id,
            "email": owner_email,
            "aud": "authenticated",
            "exp": int(time.time()) + 300,
        },
        settings.supabase_jwt_secret or "test-secret",
        algorithm="HS256",
    )
    res_200 = client.post(
        f"/api/v1/outfits/{outfit_id}/stylist-advice",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"occasion": "work", "weather": "cold", "user_note": "Voy en bus"},
    )
    assert res_200.status_code == 200
    body = res_200.json()
    assert body["outfit_id"] == outfit_id
    assert body["source"] == "rules"
    assert len(body["accessories"]) >= 1
    assert "Voy en bus" in body["why_it_works"]

    # 3. Otro usuario autenticado distinto al dueno -> 403
    intruder_token = jwt.encode(
        {
            "sub": new_uuid(),
            "email": "intruso@styles.com",
            "aud": "authenticated",
            "exp": int(time.time()) + 300,
        },
        settings.supabase_jwt_secret or "test-secret",
        algorithm="HS256",
    )
    res_403 = client.post(
        f"/api/v1/outfits/{outfit_id}/stylist-advice",
        headers={"Authorization": f"Bearer {intruder_token}"},
        json={},
    )
    assert res_403.status_code == 403


@pytest.mark.unit
def test_format_garments_summary_includes_subcategory_and_pattern() -> None:
    """El prompt al estilista incluye subcategoria y estampado cuando existen."""
    summary = _format_garments_summary(
        [
            {
                "category": "top",
                "subcategory": "blazer",
                "position": "outerwear",
                "pattern": "plaid",
                "dominant_colors": [{"hex": "#2B2D42"}],
            },
            {
                "category": "bottom",
                "subcategory": "jeans",
                "position": "bottom",
                "pattern": "solid",
                "dominant_colors": [{"hex": "#1B263B"}],
            },
        ]
    )
    assert "top (blazer)" in summary
    assert "a cuadros" in summary
    assert "liso" in summary

    cfg_no_azure = dataclasses.replace(
        settings,
        azure_openai_endpoint=None,
        azure_openai_api_key=None,
        azure_openai_deployment_name=None,
    )
    advice = get_stylist_advice(
        outfit_id="outfit-pattern-balance",
        aesthetic="old_money",
        garments=[
            {"category": "top", "subcategory": "blazer", "position": "outerwear", "pattern": "plaid"},
            {"category": "bottom", "subcategory": "trousers", "position": "bottom", "pattern": "solid"},
        ],
        chromatic_score=0.86,
        embedding_score=0.80,
        cfg=cfg_no_azure,
    )
    assert "a cuadros" in advice.why_it_works
    assert "blazer" in advice.why_it_works
