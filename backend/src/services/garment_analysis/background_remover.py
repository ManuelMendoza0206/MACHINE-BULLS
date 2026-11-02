"""Segmentacion y remocion de fondo para prendas de vestir con rembg.

Utiliza rembg con la sesion 'u2net_cloth_seg' (especializada en segmentacion
de prendas textiles) para eliminar el fondo de las imagenes de ropa subidas
por los usuarios. Devuelve la imagen recortada en formato RGBA (con canal alfa).

Incluye cache thread-safe de la sesion del modelo y fallback seguro si rembg
o la descarga del modelo fallan.
"""

from __future__ import annotations

import io
import logging
import os
import threading
from typing import Any

from PIL import Image

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_rembg_session: Any = None
_rembg_available: bool | None = None


def is_rembg_available() -> bool:
    """Verifica si rembg y su backend onnxruntime estan disponibles.

    En ejecucion de tests (pytest sin USE_REAL_REMBG=1), se desactiva la descarga
    automatica de modelos pesados (~170MB) manteniendo los tests rapidos y offline.
    """
    global _rembg_available
    if _rembg_available is not None:
        return _rembg_available

    # Evitar descarga pesada de modelos ONNX durante CI/pytest rapido a menos que se solicite
    if os.environ.get("USE_REAL_REMBG") != "1" and (
        os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("REMBG_DISABLED") == "1"
    ):
        return False

    try:
        import rembg  # noqa: F401

        _rembg_available = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("rembg no disponible: %s", exc)
        _rembg_available = False
    return _rembg_available


def get_cloth_segmentation_session(model_name: str = "u2net_cloth_seg") -> Any:
    """Singleton perezoso de la sesion rembg para prendas de vestir."""
    global _rembg_session
    if _rembg_session is None and is_rembg_available():
        with _lock:
            if _rembg_session is None:
                try:
                    from rembg import new_session

                    logger.info("Cargando sesion rembg con modelo %s...", model_name)
                    _rembg_session = new_session(model_name)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Fallo al inicializar sesion rembg (%s): %s. Se intentara sin sesion fija.",
                        model_name,
                        exc,
                    )
                    _rembg_session = False
    return _rembg_session if _rembg_session is not False else None


def remove_background(
    image: Image.Image,
    model_name: str = "u2net_cloth_seg",
    fallback_to_original: bool = True,
) -> Image.Image:
    """Elimina el fondo de una prenda y devuelve una imagen RGBA con canal alfa.

    Args:
        image: Imagen de entrada (PIL Image en cualquier modo).
        model_name: Modelo de rembg (por defecto 'u2net_cloth_seg').
        fallback_to_original: Si falla la remocion, devuelve la original en RGBA.

    Returns:
        Image.Image en modo RGBA.
    """
    if not is_rembg_available():
        return image.convert("RGBA")

    try:
        from rembg import remove

        session = get_cloth_segmentation_session(model_name)
        if session is not None:
            result = remove(image, session=session)
        else:
            result = remove(image)

        if isinstance(result, bytes):
            result = Image.open(io.BytesIO(result))

        return result.convert("RGBA")
    except Exception as exc:
        logger.warning(
            "Error en remocion de fondo con rembg: %s. Aplicando fallback.", exc
        )
        if fallback_to_original:
            return image.convert("RGBA")
        raise
