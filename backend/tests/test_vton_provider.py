"""Tests del proveedor VTON: Replicate (payload, sin red) y mock (composicion).

`ReplicateVtonProvider.try_on` hace HTTP real; aca se stubbea `httpx.Client`
para verificar el payload que sale (version fijada, data-URIs, Prefer: wait)
sin tocar la nube. El mock se prueba de verdad porque corre local.
"""

from __future__ import annotations

import base64
import json
from typing import Any, Self

import pytest
from PIL import Image

from services.vton.provider import (
    IDM_VTON_VERSION,
    HttpVtonProvider,
    MockVtonProvider,
    ReplicateVtonProvider,
    _first_output_url,
    build_provider,
)


def _jpg(color: tuple[int, int, int] = (10, 20, 30)) -> bytes:
    img = Image.new("RGB", (32, 32), color)
    import io

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class _FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.content = json.dumps(payload).encode()

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class _FakeClient:
    """Captura la ultima peticion POST y devuelve la prediccion succeeded."""

    def __init__(self, result_url: str = "https://replicate.delivery/x.jpg") -> None:
        self.last_post: dict[str, Any] | None = None
        self._result_url = result_url

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def post(self, url: str, json: dict, headers: dict) -> _FakeResponse:
        self.last_post = {"url": url, "json": json, "headers": headers}
        return _FakeResponse(
            {
                "status": "succeeded",
                "output": self._result_url,
                "urls": {"get": "https://api.replicate.com/v1/predictions/abc"},
            }
        )

    def get(self, url: str, headers: dict | None = None) -> _FakeResponse:
        if url.startswith("https://replicate.delivery"):
            return _FakeResponse({}, status_code=200)
        return _FakeResponse({"status": "succeeded", "output": self._result_url})


def test_replicate_payload_correcto(monkeypatch: pytest.MonkeyPatch) -> None:
    """Version fijada, inputs con data-URI y Prefer: wait (para respuesta sincrona)."""
    fake = _FakeClient()
    monkeypatch.setattr("services.vton.provider.httpx.Client", lambda **kw: fake)

    p = ReplicateVtonProvider(api_token="tok-abc")
    out = p.try_on(
        human_image=_jpg(),
        garment_image=_jpg((200, 0, 0)),
        garment_description="a red t-shirt",
        category="upper",
    )
    assert out  # devolvio bytes

    assert fake.last_post is not None
    body = fake.last_post["json"]
    assert body["version"] == IDM_VTON_VERSION
    entrada = body["input"]
    assert entrada["category"] == "upper"
    assert entrada["garment_des"] == "a red t-shirt"
    assert entrada["garm_img"].startswith("data:image/jpeg;base64,")
    assert entrada["human_img"].startswith("data:image/jpeg;base64,")
    # Los data-URIs decodifican a bytes validos.
    dec = base64.b64decode(entrada["garm_img"].split(",", 1)[1])
    assert dec.startswith(b"\xff\xd8")  # magic JPEG
    # Authorization y Prefer.
    assert fake.last_post["headers"]["Authorization"] == "Bearer tok-abc"
    assert fake.last_post["headers"]["Prefer"] == "wait=60"


def test_replicate_rechaza_categoria_no_soportada() -> None:
    """IDM-VTON solo acepta upper/lower/dresses; footwear/bag deben fallar claro."""
    p = ReplicateVtonProvider(api_token="tok")
    with pytest.raises(ValueError, match="no soportada"):
        p.try_on(
            human_image=_jpg(),
            garment_image=_jpg(),
            garment_description="shoes",
            category="footwear",
        )


def test_mock_composicion_devuelve_jpeg() -> None:
    """El mock pega la prenda sobre la persona y devuelve JPEG valido."""
    out = MockVtonProvider().try_on(
        human_image=_jpg((200, 180, 160)),
        garment_image=_jpg((30, 60, 200)),
        garment_description="a blue shirt",
        category="upper",
    )
    assert out.startswith(b"\xff\xd8")
    img = Image.open(__import__("io").BytesIO(out))
    assert img.size == (32, 32)


def test_first_output_url_formas() -> None:
    """El output de Replicate puede ser str, list o dict."""
    assert _first_output_url("https://a/x.jpg") == "https://a/x.jpg"
    assert _first_output_url(["https://a/x.jpg"]) == "https://a/x.jpg"
    assert _first_output_url({"image": "https://a/x.jpg"}) == "https://a/x.jpg"
    assert _first_output_url([]) is None
    assert _first_output_url(None) is None


# --- HttpVtonProvider (VM propia) -------------------------------------------


class _FakeHttpResponse:
    def __init__(self, content: bytes, content_type: str = "image/jpeg") -> None:
        self.content = content
        self.headers = {"content-type": content_type}
        self.status_code = 200

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self) -> dict:
        import json as _json

        return _json.loads(self.content)


class _FakeHttpSession:
    def __init__(self, response: _FakeHttpResponse) -> None:
        self.last: dict[str, Any] | None = None
        self._response = response

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def post(self, url: str, json: dict, headers: dict) -> _FakeHttpResponse:
        self.last = {"url": url, "json": json, "headers": headers}
        return self._response


def test_http_provider_devuelve_imagen_cruda(monkeypatch: pytest.MonkeyPatch) -> None:
    """La VM puede devolver bytes de imagen directos (Content-Type: image/*)."""
    resultado = _jpg((9, 9, 9))
    fake = _FakeHttpSession(_FakeHttpResponse(resultado, "image/jpeg"))
    monkeypatch.setattr("services.vton.provider.httpx.Client", lambda **kw: fake)

    p = HttpVtonProvider("http://vm-interna:8000/vton")
    out = p.try_on(
        human_image=_jpg(),
        garment_image=_jpg((200, 0, 0)),
        garment_description="a red t-shirt",
        category="upper",
    )
    assert out == resultado
    assert fake.last is not None
    assert fake.last["url"] == "http://vm-interna:8000/vton"
    assert fake.last["json"]["category"] == "upper"
    assert fake.last["json"]["garm_img"].startswith("data:image/jpeg;base64,")


def test_http_provider_json_con_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """Acepta la alternativa JSON: {"output": "<url>"}."""
    import io
    import json as _json

    resultado = _jpg((7, 7, 7))
    resp_json = _FakeHttpResponse(
        _json.dumps({"output": "https://cdn.vm/result.jpg"}).encode(), "application/json"
    )
    delivered = False

    class _Session(_FakeHttpSession):
        def get(self, url: str, headers: dict | None = None) -> _FakeHttpResponse:
            nonlocal delivered
            delivered = True
            return _FakeHttpResponse(resultado, "image/jpeg")

    fake = _Session(resp_json)
    monkeypatch.setattr("services.vton.provider.httpx.Client", lambda **kw: fake)

    p = HttpVtonProvider("http://vm:8000/vton", api_token="sec")
    out = p.try_on(_jpg(), _jpg(), "x", "lower")
    assert out == resultado
    assert delivered  # bajo la URL del output
    assert fake.last is not None
    assert fake.last["headers"]["Authorization"] == "Bearer sec"
    assert io.BytesIO is not None  # sin import ruff


def test_http_provider_rechaza_footwear() -> None:
    p = HttpVtonProvider("http://vm:8000/vton")
    with pytest.raises(ValueError, match="no soportada"):
        p.try_on(_jpg(), _jpg(), "shoes", "footwear")


def test_build_provider_seleccion(monkeypatch: pytest.MonkeyPatch) -> None:
    """Orden de prioridad: mock explicito > http explicito > auto(http>replicate>mock)."""
    import dataclasses

    from config import settings as base

    actual = base

    def _set(**kwargs: Any) -> None:
        """settings es frozen: se reemplaza el objeto en el modulo del provider."""
        nonlocal actual
        actual = dataclasses.replace(actual, **kwargs)
        monkeypatch.setattr("services.vton.provider.settings", actual)

    # mock explicito gana aunque haya token y url
    _set(vton_provider="mock", vton_http_url="http://vm/v", replicate_api_token="tok")
    assert build_provider().name == "mock"

    # http explicito
    _set(vton_provider="http")
    assert build_provider().name == "http"

    # auto con URL -> http (VM propia antes que Replicate)
    _set(vton_provider="auto")
    assert build_provider().name == "http"

    # auto sin URL pero con token -> replicate
    _set(vton_http_url=None)
    assert build_provider().name == "replicate"

    # auto sin nada -> mock (fallback local que siempre funciona)
    _set(replicate_api_token=None)
    assert build_provider().name == "mock"
