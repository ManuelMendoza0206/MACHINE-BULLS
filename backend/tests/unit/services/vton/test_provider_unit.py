"""Tests unitarios adicionales para proveedores VTON (URL resolution, HTTP/Replicate, build_provider)."""

from __future__ import annotations

import base64
from dataclasses import replace
from unittest.mock import MagicMock, patch

import httpx
import pytest

from services.vton import provider as vton_provider


def test_resolve_catvton_url_variants(monkeypatch):
    monkeypatch.delenv("RUNNING_IN_DOCKER", raising=False)
    with patch("services.vton.provider.is_running_in_docker", return_value=False):
        assert vton_provider.resolve_catvton_url(None) == vton_provider.DEFAULT_CATVTON_LOCAL_URL
    with patch("services.vton.provider.is_running_in_docker", return_value=True):
        assert vton_provider.resolve_catvton_url("") == vton_provider.DEFAULT_CATVTON_DOCKER_URL

    assert vton_provider.resolve_catvton_url("http://127.0.0.1:7861") == "http://127.0.0.1:7861/tryon"
    assert vton_provider.resolve_catvton_url("http://10.0.0.2:7861/custom") == "http://10.0.0.2:7861/custom"


def test_is_catvton_server_reachable_paths():
    assert vton_provider.is_catvton_server_reachable("not-a-url") is False

    ok_resp = MagicMock(status_code=200)
    client = MagicMock()
    client.get.return_value = ok_resp
    cm = MagicMock()
    cm.__enter__.return_value = client
    cm.__exit__.return_value = False
    with patch("services.vton.provider.httpx.Client", return_value=cm):
        assert vton_provider.is_catvton_server_reachable("http://127.0.0.1:7861/tryon") is True

    client_err = MagicMock()
    client_err.get.side_effect = httpx.ConnectError("refused")
    cm_err = MagicMock()
    cm_err.__enter__.return_value = client_err
    cm_err.__exit__.return_value = False
    with patch("services.vton.provider.httpx.Client", return_value=cm_err):
        assert vton_provider.is_catvton_server_reachable("http://127.0.0.1:7861/tryon") is False


def test_first_output_url_formats():
    assert vton_provider._first_output_url("https://img.example/a.jpg") == "https://img.example/a.jpg"
    assert vton_provider._first_output_url(["https://img.example/b.jpg"]) == "https://img.example/b.jpg"
    assert vton_provider._first_output_url({"url": "https://img.example/c.jpg"}) == "https://img.example/c.jpg"
    assert vton_provider._first_output_url({"status": "empty"}) is None


def test_http_vton_provider_responses():
    prov = vton_provider.HttpVtonProvider("http://127.0.0.1:7861/tryon", api_token="tok")
    with pytest.raises(ValueError, match="no soportada"):
        prov.try_on(b"h", b"g", "desc", "footwear")

    # 1) Direct image/* response
    img_resp = MagicMock(headers={"content-type": "image/jpeg"}, content=b"jpeg-bytes")
    client = MagicMock()
    client.post.return_value = img_resp
    cm = MagicMock()
    cm.__enter__.return_value = client
    cm.__exit__.return_value = False
    with patch("services.vton.provider.httpx.Client", return_value=cm):
        out = prov.try_on(b"h", b"g", "shirt", "upper", mask_type="upper")
    assert out == b"jpeg-bytes"

    # 2) data-URI output in JSON
    b64_payload = base64.b64encode(b"decoded-bytes").decode("ascii")
    json_resp = MagicMock(headers={"content-type": "application/json"})
    json_resp.json.return_value = {"output": f"data:image/png;base64,{b64_payload}"}
    client.post.return_value = json_resp
    with patch("services.vton.provider.httpx.Client", return_value=cm):
        out_uri = prov.try_on(b"h", b"g", "shirt", "upper")
    assert out_uri == b"decoded-bytes"

    # 3) ConnectError turns into actionable RuntimeError
    client.post.side_effect = httpx.ConnectError("down")
    with (
        patch("services.vton.provider.httpx.Client", return_value=cm),
        pytest.raises(RuntimeError, match="No se pudo conectar"),
    ):
        prov.try_on(b"h", b"g", "shirt", "upper")


def test_replicate_vton_provider_poll_and_error():
    prov = vton_provider.ReplicateVtonProvider("rep-tok")
    with pytest.raises(ValueError, match="no soportada"):
        prov.try_on(b"h", b"g", "desc", "shoes")

    post_resp = MagicMock()
    post_resp.json.return_value = {"status": "processing", "urls": {"get": "https://api.replicate.com/p/1"}}
    poll_resp = MagicMock()
    poll_resp.json.return_value = {"status": "succeeded", "output": ["https://cdn.example/out.png"]}
    dl_resp = MagicMock(content=b"final-img")

    client = MagicMock()
    client.post.return_value = post_resp
    client.get.side_effect = [poll_resp, dl_resp]
    cm = MagicMock()
    cm.__enter__.return_value = client
    cm.__exit__.return_value = False
    with patch("services.vton.provider.httpx.Client", return_value=cm), patch("time.sleep"):
        result = prov.try_on(b"h", b"g", "shirt", "upper")
    assert result == b"final-img"


def test_build_provider_modes(monkeypatch):
    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, vton_provider="mock"),
    )
    assert isinstance(vton_provider.build_provider(), vton_provider.MockVtonProvider)

    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, vton_provider="catvton", vton_http_url="http://127.0.0.1:7861"),
    )
    assert isinstance(vton_provider.build_provider(), vton_provider.HttpVtonProvider)

    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, vton_provider="http", vton_http_url=""),
    )
    with pytest.raises(RuntimeError, match="falta VTON_HTTP_URL"):
        vton_provider.build_provider()

    monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)
    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, vton_provider="replicate", replicate_api_token=""),
    )
    with pytest.raises(RuntimeError, match="falta REPLICATE_API_TOKEN"):
        vton_provider.build_provider()

    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, vton_provider="auto", vton_http_url="", replicate_api_token=""),
    )
    with patch("services.vton.provider.is_catvton_server_reachable", return_value=False):
        assert isinstance(vton_provider.build_provider(), vton_provider.HttpVtonProvider)
