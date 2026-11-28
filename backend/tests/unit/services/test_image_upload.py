from __future__ import annotations

from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from services.image_upload import read_validated_image


def _upload(image: Image.Image, fmt: str = "JPEG") -> UploadFile:
    output = BytesIO()
    image.save(output, format=fmt)
    output.seek(0)
    return UploadFile(filename=f"test.{fmt.lower()}", file=output)


def test_read_validated_image_accepts_supported_image() -> None:
    content, image = read_validated_image(_upload(Image.new("RGB", (12, 8))), "photo")
    assert content.startswith(b"\xff\xd8")
    assert image.size == (12, 8)


def test_read_validated_image_rejects_oversized_bytes(monkeypatch: pytest.MonkeyPatch) -> None:
    from dataclasses import replace

    from config import settings
    from services import image_upload

    monkeypatch.setattr(image_upload, "settings", replace(settings, max_upload_bytes=8))
    with pytest.raises(HTTPException) as error:
        read_validated_image(UploadFile(filename="large.jpg", file=BytesIO(b"x" * 9)), "photo")
    assert error.value.status_code == 413


def test_read_validated_image_rejects_non_image() -> None:
    with pytest.raises(HTTPException) as error:
        read_validated_image(UploadFile(filename="bad.jpg", file=BytesIO(b"not-image")), "photo")
    assert error.value.status_code == 400


def test_read_validated_image_rejects_unsupported_format() -> None:
    image = Image.new("RGB", (8, 8))
    with pytest.raises(HTTPException) as error:
        read_validated_image(_upload(image, "BMP"), "photo")
    assert error.value.status_code == 415
