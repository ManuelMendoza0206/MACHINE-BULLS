"""Tests para la gestión de foto canónica con consentimiento y borrado seguro."""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image


def _jpg(color: tuple[int, int, int] = (200, 180, 160)) -> BytesIO:
    img = Image.new("RGB", (64, 64), color)
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def test_get_canonical_photo_when_empty(client: Any) -> None:
    res = client.get("/api/v1/me/canonical-photo")
    assert res.status_code == 200
    assert res.json()["has_canonical"] is False
    assert res.json()["photo_url"] is None


def test_upload_canonical_photo_without_consent_fails(client: Any) -> None:
    res = client.post(
        "/api/v1/me/canonical-photo",
        data={"consent": False},
        files={"file": ("canon.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 400
    assert "consentimiento" in res.text.lower()


def test_upload_and_delete_canonical_photo_lifecycle(client: Any) -> None:
    # 1. Upload con consentimiento
    res = client.post(
        "/api/v1/me/canonical-photo",
        data={"consent": True},
        files={"file": ("canon.jpg", _jpg(), "image/jpeg")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["has_canonical"] is True
    assert body["photo_url"] is not None
    assert body["consent_at"] is not None

    # 2. Get confirma que existe
    get_res = client.get("/api/v1/me/canonical-photo")
    assert get_res.status_code == 200
    assert get_res.json()["has_canonical"] is True
    assert get_res.json()["photo_url"] == body["photo_url"]

    # 3. Delete revoca y limpia
    del_res = client.delete("/api/v1/me/canonical-photo")
    assert del_res.status_code == 200
    assert del_res.json()["has_canonical"] is False

    # 4. Get confirma que ya no existe
    get_after = client.get("/api/v1/me/canonical-photo")
    assert get_after.status_code == 200
    assert get_after.json()["has_canonical"] is False
