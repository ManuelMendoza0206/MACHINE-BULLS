"""Proveedor de inferencia VTON (B4): Replicate `cuuupid/idm-vton` + HTTP + mock.

`VtonInferenceProvider` es la interfaz swappable que pide el spec de
vton-pipeline. Tres implementaciones:

- `ReplicateVtonProvider`: modelo real en Replicate (~$0.02/run, ~17s en
  A100). Recibe URLs o data-URIs, devuelve la URL del resultado.
- `HttpVtonProvider`: endpoint HTTP propio. Modo `catvton` apuntando al
  `CatVTON/server.py` local (GPU nAtaN del host) o a una VM con el modelo que
  sea. Contrato Replicate-compatible + `mask_type` opcional para las capas.
- `MockVtonProvider`: compone la prenda sobre la persona con PIL. Determinista
  y sin costo; existe para que la demo funcione sin token y para los tests de
  integracion del pipeline (que no deben llamar a la nube).

`build_provider()` elige segun `VTON_PROVIDER` (catvton|http|replicate|mock|auto):
en `auto` usa el endpoint HTTP si hay URL, despues Replicate, si no mock.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Any, Protocol

import httpx
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)

REPLICATE_API = "https://api.replicate.com/v1"
IDM_VTON_VERSION = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"

# El modelo acepta estas categorias; el mapping desde CLIP vive en domain.enums.
VTON_CATEGORIES = ("upper", "lower", "dresses")

# Tiempo estimado por prenda en Replicate (para estimated_time_seconds).
ESTIMATED_SECONDS_PER_LAYER = 18.0


class VtonInferenceProvider(Protocol):
    """Interfaz del proveedor de try-on."""

    name: str

    def try_on(
        self,
        human_image: bytes,
        garment_image: bytes,
        garment_description: str,
        category: str,
        mask_type: str | None = None,
    ) -> bytes:
        """Devuelve los bytes de la imagen resultante.

        `mask_type` es la extension multicapa (Layer Manager): el proveedor que
        use agnostic-masks generativas (CatVTON) la necesita para saber QUE
        region vestir y que regiones proteger del compuesto que llega
        (`inner`/`outer`); los proveedores cloud (Replicate) la ignoran.
        Valores validos: upper|lower|overall|inner|outer. None = se deriva de
        `category` en el destino.
        """
        ...


class ReplicateVtonProvider:
    """Try-on real contra Replicate `cuuupid/idm-vton` (no comercial)."""

    name = "replicate"

    def __init__(self, api_token: str, version: str = IDM_VTON_VERSION) -> None:
        self._token = api_token
        self._version = version

    def try_on(
        self,
        human_image: bytes,
        garment_image: bytes,
        garment_description: str,
        category: str,
        mask_type: str | None = None,
    ) -> bytes:
        """Try-on real contra Replicate. `mask_type` no aplica: el modelo cloud
        decide con `category`; se acepta y se ignora para compatibilidad."""
        if category not in VTON_CATEGORIES:
            # IDM-VTON solo entiende upper/lower/dresses; footwear y bag no
            # tienen soporte y el caller debe decidir que hacer (hoy: skip).
            raise ValueError(
                f"categoria {category!r} no soportada por IDM-VTON; "
                f"esperada una de {VTON_CATEGORIES}"
            )

        payload = {
            "version": self._version,
            "input": {
                "garm_img": _data_uri(garment_image),
                "human_img": _data_uri(human_image),
                "garment_des": garment_description,
                "category": category,
            },
        }
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        # Prefer: wait=60 le pide a Replicate que bloquee hasta 60s y devuelva
        # el resultado listo; si tarda mas, devuelve el prediction en
        # "processing" y hay que hacer polling (fuera del MVP: una prenda
        # tarda ~17s, bien dentro de 60).
        headers["Prefer"] = "wait=60"

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                f"{REPLICATE_API}/predictions", json=payload, headers=headers
            )
            resp.raise_for_status()
            data = resp.json()

            # Poll minimo por si no llego con wait.
            intentos = 0
            while data.get("status") in ("starting", "processing") and intentos < 30:
                import time

                time.sleep(2.0)
                intentos += 1
                poll = client.get(data["urls"]["get"], headers=headers)
                poll.raise_for_status()
                data = poll.json()

            if data.get("status") != "succeeded":
                raise RuntimeError(
                    f"Replicate VTON no termino bien: status={data.get('status')!r} "
                    f"error={data.get('error')!r}"
                )

            output_url = _first_output_url(data.get("output"))
            if not output_url:
                raise RuntimeError("Replicate VTON devolvio output vacio")
            img_resp = client.get(output_url)
            img_resp.raise_for_status()
            return img_resp.content


class HttpVtonProvider:
    """Try-on contra un endpoint HTTP propio (VM con IDM-VTON servido).

    Pensado para cuando el VTON corra en una maquina propia (VM con GPU) y no
    en Replicate. El contrato del endpoint es simple y deliberadamente igual
    al payload de Replicate:

        POST <VTON_HTTP_URL>
        Content-Type: application/json
        Authorization: Bearer <REPLICATE_API_TOKEN>   (opcional, si lo piden)
        {
          "garm_img":   "data:image/jpeg;base64,...",
          "human_img":  "data:image/jpeg;base64,...",
          "garment_des": "a pink t-shirt",
          "category":   "upper" | "lower" | "dresses"
        }

    Respuesta aceptada (cualquiera de las dos):
        - bytes crudos con `Content-Type: image/*` (lo mas simple: un server
          que devuelve `Response(content=jpg_bytes, media_type="image/jpeg")`),
        - JSON con `"output": "<url | data:image/...;base64,...>"`.

    Un wrapper minimo del modelo en la VM es ~30 lineas de FastAPI con este
    contrato; `VtonInferenceProvider` no cambia para nada.
    """

    name = "http"

    def __init__(self, endpoint: str, api_token: str | None = None, timeout_s: float = 300.0) -> None:
        self._endpoint = endpoint
        self._token = api_token
        self._timeout = timeout_s

    def try_on(
        self,
        human_image: bytes,
        garment_image: bytes,
        garment_description: str,
        category: str,
        mask_type: str | None = None,
    ) -> bytes:
        if category not in VTON_CATEGORIES:
            raise ValueError(
                f"categoria {category!r} no soportada; esperada una de {VTON_CATEGORIES}"
            )

        payload = {
            "garm_img": _data_uri(garment_image),
            "human_img": _data_uri(human_image),
            "garment_des": garment_description,
            "category": category,
        }
        if mask_type:
            # Extension multicapa del Layer Manager (CatVTON la entiende como
            # upper|lower|overall|inner|outer). Un server viejo la ignora.
            payload["mask_type"] = mask_type
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"

        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(self._endpoint, json=payload, headers=headers)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if content_type.startswith("image/"):
                return resp.content
            data = resp.json()
            output_url = _first_output_url(data.get("output") if isinstance(data, dict) else data)
            if not output_url:
                raise RuntimeError(
                    f"VTON HTTP devolvio respuesta sin output: {str(data)[:200]}"
                )
            if output_url.startswith("data:"):
                # data-URI directo: decodificar sin segunda llamada.
                import base64 as b64

                return b64.b64decode(output_url.split(",", 1)[1])
            img = client.get(output_url)
            img.raise_for_status()
            return img.content


class MockVtonProvider:
    """Fallback determinista: pega la prenda sobre la persona con PIL.

    No es un try-on real y no pretende serlo: es el fallback para demos sin
    token y para tests. La prenda va centrada arriba de la persona, escalada
    al 40% del ancho, con transparencia al 85% para que se vea la composicion.
    """

    name = "mock"

    def try_on(
        self,
        human_image: bytes,
        garment_image: bytes,
        garment_description: str,
        category: str,
        mask_type: str | None = None,
    ) -> bytes:
        """Compone con PIL; mask_type no aplica al mock."""
        persona = Image.open(io.BytesIO(human_image)).convert("RGB")
        prenda = Image.open(io.BytesIO(garment_image)).convert("RGBA")

        ancho = max(1, int(persona.width * 0.4))
        alto = max(1, int(prenda.height * (ancho / prenda.width)))
        prenda = prenda.resize((ancho, alto))

        x = (persona.width - ancho) // 2
        y = int(persona.height * 0.15)
        capa = Image.new("RGBA", persona.size, (0, 0, 0, 0))
        capa.paste(prenda, (x, y), prenda)

        resultado = Image.alpha_composite(persona.convert("RGBA"), capa)
        buf = io.BytesIO()
        resultado.convert("RGB").save(buf, format="JPEG", quality=90)
        return buf.getvalue()


def _data_uri(content: bytes) -> str:
    """Data URI base64 que Replicate acepta como input de imagen."""
    return "data:image/jpeg;base64," + base64.b64encode(content).decode("ascii")


def _first_output_url(output: Any) -> str | None:
    """El output de Replicate puede ser str, list o dict."""
    if isinstance(output, str):
        return output
    if isinstance(output, list) and output:
        return str(output[0])
    if isinstance(output, dict):
        for valor in output.values():
            if isinstance(valor, str) and valor.startswith("http"):
                return valor
    return None


def build_provider() -> VtonInferenceProvider:
    """Fabrica el proveedor segun configuracion (orden de prioridad).

    1. `VTON_PROVIDER=mock`      -> fallback local (PIL), siempre funciona.
    2. `VTON_PROVIDER=catvton`   -> server.py de CatVTON via `VTON_HTTP_URL`
       (GPU local del host: modo A del MVP).
    3. `VTON_PROVIDER=http`      -> cualquier endpoint HTTP propio
       (`VTON_HTTP_URL` obligatoria).
    4. `VTON_PROVIDER=replicate` -> `REPLICATE_API_TOKEN` (obligatoria).
    5. `VTON_PROVIDER=auto` (default) -> http/catvton si hay `VTON_HTTP_URL`
       (la opcion mas barata), despues Replicate, si no mock.
    """
    modo = settings.vton_provider.lower()
    if modo == "mock":
        return MockVtonProvider()
    if modo in ("catvton", "http"):
        if not settings.vton_http_url:
            raise RuntimeError(
                f"VTON_PROVIDER={modo} pero falta VTON_HTTP_URL "
                "(ej. http://127.0.0.1:7861/tryon del server CatVTON local)"
            )
        return HttpVtonProvider(
            settings.vton_http_url,
            api_token=None,  # catvton local no pide auth; VM propia la agrega si quiere
            timeout_s=settings.vton_http_timeout_s,
        )
    if modo == "replicate":
        if not settings.replicate_api_token:
            raise RuntimeError("VTON_PROVIDER=replicate pero falta REPLICATE_API_TOKEN")
        return ReplicateVtonProvider(settings.replicate_api_token)
    # auto
    if settings.vton_http_url:
        return HttpVtonProvider(
            settings.vton_http_url,
            api_token=settings.replicate_api_token,
            timeout_s=settings.vton_http_timeout_s,
        )
    if settings.replicate_api_token:
        return ReplicateVtonProvider(settings.replicate_api_token)
    logger.warning("VTON en modo auto sin VTON_HTTP_URL ni token: usando MockVtonProvider")
    return MockVtonProvider()
