"""Tests de integración para /try-on usando foto canónica persistente."""

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


def test_try_on_with_canonical_fails_if_not_configured(client: Any) -> None:
    # Asegurar que no hay foto canónica
    client.delete("/api/v1/me/canonical-photo")

    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])

    res = client.post(
        "/api/v1/vton/try-on",
        data={"garment_layers": layers, "use_canonical": True},
    )
    assert res.status_code == 400
    assert "foto canónica" in res.text.lower()


def test_try_on_succeeds_using_canonical_photo(client: Any) -> None:
    # 1. Registrar foto canónica
    reg = client.post(
        "/api/v1/me/canonical-photo",
        data={"consent": True},
        files={"file": ("canon.jpg", _jpg(), "image/jpeg")},
    )
    assert reg.status_code == 200

    # 2. Ejecutar try-on sin enviar archivo user_image
    garment_id = _upload_garment(client, "remera")
    layers = json.dumps([{"garment_id": garment_id, "position": "top"}])

    res = client.post(
        "/api/v1/vton/try-on",
        data={"garment_layers": layers, "use_canonical": True},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["job_id"]
    assert body["status"] == "processing"
