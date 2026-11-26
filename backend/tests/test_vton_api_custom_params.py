"""Tests de la API para parámetros de inferencia CatVTON en /try-on."""

from __future__ import annotations

import json
from io import BytesIO
from typing import Any

from PIL import Image


def _jpg(color: tuple[int, int, int] = (200, 180, 160)) -> BytesIO:
    img = Image.new("RGB", (64, 64), color)
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def _upload_garment(client: Any, name: str = "remera") -> str:
    buf = _jpg()
    r = client.post(
        "/api/v1/garments/upload",
        files={"file": (f"{name}.jpg", buf, "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    return r.json()["garment_id"]


def test_try_on_rejects_out_of_range_steps(client: Any) -> None:
    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])
    res = client.post(
        "/api/v1/vton/try-on",
        data={"garment_layers": layers, "steps": 5},
        files={"user_image": ("persona.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 422
    assert "steps debe estar entre 10 y 100" in res.text


def test_try_on_rejects_out_of_range_guidance(client: Any) -> None:
    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])
    res = client.post(
        "/api/v1/vton/try-on",
        data={"garment_layers": layers, "guidance": 15.0},
        files={"user_image": ("persona.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 422
    assert "guidance debe estar entre 1.0 y 10.0" in res.text


def test_try_on_rejects_invalid_layer_mode(client: Any) -> None:
    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])
    res = client.post(
        "/api/v1/vton/try-on",
        data={"garment_layers": layers, "layer_mode": "unsupported"},
        files={"user_image": ("persona.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 422
    assert "layer_mode debe ser 'sequential' o 'from_original'" in res.text


def test_try_on_accepts_valid_custom_parameters(client: Any) -> None:
    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])
    res = client.post(
        "/api/v1/vton/try-on",
        data={
            "garment_layers": layers,
            "steps": 45,
            "guidance": 3.0,
            "seed": 999,
            "layer_mode": "sequential",
        },
        files={"user_image": ("persona.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["job_id"]
    assert data["status"] == "processing"
