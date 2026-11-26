"""Tests de parámetros de inferencia en los proveedores VTON."""

from __future__ import annotations

import httpx
import pytest

from services.vton.provider import HttpVtonProvider, MockVtonProvider


def test_mock_vton_provider_accepts_inference_parameters() -> None:
    provider = MockVtonProvider()
    fake_human = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff"
        b"\xc0\x00\x0b\x08\x00\x10\x00\x10\x01\x01\x11\x00\xff\xc4\x00\x1f"
        b"\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00"
        b"\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08"
        b"\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )
    result = provider.try_on(
        human_image=fake_human,
        garment_image=fake_human,
        garment_description="t-shirt",
        category="upper",
        mask_type="upper",
        num_inference_steps=30,
        guidance_scale=2.0,
        seed=123,
    )
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_http_vton_provider_serializes_inference_parameters(monkeypatch) -> None:
    captured_payload = {}

    def mock_post(self, url, json=None, headers=None):
        nonlocal captured_payload
        captured_payload = json
        req = httpx.Request("POST", str(url))
        return httpx.Response(200, request=req, content=b"fake_output_jpeg", headers={"content-type": "image/jpeg"})

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    provider = HttpVtonProvider("http://localhost:7861/tryon")
    res = provider.try_on(
        human_image=b"fake_human",
        garment_image=b"fake_garment",
        garment_description="jacket",
        category="upper",
        mask_type="outer",
        num_inference_steps=40,
        guidance_scale=3.0,
        seed=777,
    )

    assert res == b"fake_output_jpeg"
    assert captured_payload["num_inference_steps"] == 40
    assert captured_payload["guidance_scale"] == 3.0
    assert captured_payload["seed"] == 777
    assert captured_payload["mask_type"] == "outer"
