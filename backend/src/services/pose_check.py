"""Validacion de A-Pose del protocolo de entrada (4.1.5 del product goal).

Mandato del MVP: la foto del usuario debe venir en A-Pose (brazos ~45, piernas
separadas, frontal) antes de gastar GPU en inferencia VTON. MediaPipe
PoseLandmarker (`pose_landmarker_full.task`, commiteado en la raiz del repo)
valida que:
    1. hay exactamente 1 persona detectable,
    2. los landmarks necesarios son visibles (shoulders/hips/elbows/wrists/
       knees/ankles),
    3. el cuerpo esta vertical (shoulders arriba de hips),
    4. los brazos cuelgan sin pegarse al torso (10-60) y con codo recto,
    5. las piernas estan separadas.

Es una validacion de entrada, no de calidad: rechaza capturas que romperian la
alineacion geometrica del garment warping. Devuelve razon en espanol para el
error del job / detail HTTP.
"""

from __future__ import annotations

import io
import logging
import math
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Landmarks que deben ser visibles (ids del modelo full de MediaPipe):
# 11/12 shoulders, 23/24 hips, 13/14 elbows, 15/16 wrists, 25/26 knees, 27/28 ankles
_LANDMARKS_REQUERIDOS = (11, 12, 23, 24, 13, 14, 15, 16, 25, 26, 27, 28)

_MIN_VISIBILIDAD = 0.5
# El dataset de CatVTON (VITON/DressCode) trae brazos colgados ~10-20 grados:
# apurar ~45 rechazaria toda la muestra real. Umbral de oclusion: el brazo
# NO puede quedar pegado al torso (rompe la region de la prenda).
_ANGULO_BRAZO_MIN = 10.0
_ANGULO_BRAZO_MAX = 60.0  # en T-pose el protocolo pide volver a capturar
# Codo casi recto: la mano-en-cadera tipica (foto fallback) mide el mismo
# angulo de brazo que un A-Pose colgado, pero el codo va doblado ~90-120.
_CODO_MIN = 130.0  # grados de apertura del codo (180 = recto)
_MIN_SEPARACION_PIERNAS = 0.04  # fraccion del ancho normalizado entre tobillos


@dataclass(frozen=True)
class PoseCheck:
    """Resultado de la validacion. `reason` en espanol cuando no pasa."""

    ok: bool
    reason: str | None = None
    details: dict = field(default_factory=dict)


# --- funciones puras (test unitario sin el modelo de MediaPipe) --------------


def _angulo_respecto_vertical(dx: float, dy: float) -> float:
    """Angulo (grados, 0-90) de un vector respecto al eje vertical hacia abajo.

    En imagenes, +y es hacia abajo: brazo colgando vertical responde 0,
    brazo horizontal responde 90. A-Pose == ~45.
    """
    norma = math.hypot(dx, dy)
    if norma == 0:
        return 90.0
    coseno = dy / norma
    return math.degrees(math.acos(max(-1.0, min(1.0, coseno))))


def _angulo_en_codo(lms: dict[int, dict[str, float]], hombro: int, codo: int, muneca: int) -> float:
    """Apertura del codo en grados (180 = brazo recto, ~90 = mano en la cadera).

    Vector codo->hombro vs codo->muneca: angulo interior del codo.
    """
    ax = lms[hombro]["x"] - lms[codo]["x"]
    ay = lms[hombro]["y"] - lms[codo]["y"]
    bx = lms[muneca]["x"] - lms[codo]["x"]
    by = lms[muneca]["y"] - lms[codo]["y"]
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na == 0 or nb == 0:
        return 180.0
    coseno = (ax * bx + ay * by) / (na * nb)
    return math.degrees(math.acos(max(-1.0, min(1.0, coseno))))


def _chequear_landmarks(lms: dict[int, dict[str, float]]) -> PoseCheck:
    """Logica de A-Pose sobre {id: {x, y, visibility}} normalizado 0-1."""
    # 1) visibilidad de los 12 puntos
    faltantes = sorted(
        set(_LANDMARKS_REQUERIDOS)
        - {
            i
            for i in _LANDMARKS_REQUERIDOS
            if lms.get(i, {}).get("visibility", 0.0) >= _MIN_VISIBILIDAD
        }
    )
    if faltantes:
        return PoseCheck(
            ok=False,
            reason=f"persona incompleta o con oclusiones (landmarks poco visibles: {faltantes})",
            details={"no_visibles": faltantes},
        )

    # 2) cuerpo vertical: ambos hombros por encima de sus caderas
    if not (lms[11]["y"] < lms[23]["y"] and lms[12]["y"] < lms[24]["y"]):
        return PoseCheck(
            ok=False,
            reason="el cuerpo no esta en vista frontal vertical (hombros deben estar arriba de las caderas)",
        )

    # 3) brazos: separados del torso (no pegados, no en T) y codos rectos
    for lado, (hombro_i, codo_i, muneca_i) in {
        "izquierdo": (11, 13, 15),
        "derecho": (12, 14, 16),
    }.items():
        dx = lms[muneca_i]["x"] - lms[hombro_i]["x"]
        dy = lms[muneca_i]["y"] - lms[hombro_i]["y"]
        ang = _angulo_respecto_vertical(dx, dy)
        if ang < _ANGULO_BRAZO_MIN:
            return PoseCheck(
                ok=False,
                reason=f"brazo {lado} pegado al torso (separalo un poco; angulo={ang:.0f})",
                details={"brazo": lado, "angulo": round(ang, 1)},
            )
        if ang > _ANGULO_BRAZO_MAX:
            return PoseCheck(
                ok=False,
                reason=f"brazo {lado} demasiado elevado (T-pose no es A-Pose; angulo={ang:.0f})",
                details={"brazo": lado, "angulo": round(ang, 1)},
            )
        # codo recto (sin illnesses): mano en la cadera = codo doblado, ocluye prenda
        codo = _angulo_en_codo(lms, hombro_i, codo_i, muneca_i)
        if codo < _CODO_MIN:
            return PoseCheck(
                ok=False,
                reason=f"codo {lado} doblado (apoyando la mano? dejalo colgado recto; apertura={codo:.0f})",
                details={"brazo": lado, "codo": round(codo, 1)},
            )

# 4) piernas levemente separadas
    sep = abs(lms[27]["x"] - lms[28]["x"])
    if sep < _MIN_SEPARACION_PIERNAS:
        return PoseCheck(
            ok=False,
            reason="piernas juntas (separalas levemente)",
            details={"separacion": round(sep, 3)},
        )

    return PoseCheck(ok=True, details={"separacion": round(sep, 3)})


# --- integracion MediaPipe ----------------------------------------------------

_landmarker_cache: list = []  # la instancia es cara y thread-safe para detect


def _landmarker(model_path: Path):
    """PoseLandmarker singleton (carga el .task una sola vez por proceso)."""
    if _landmarker_cache:
        return _landmarker_cache[0]
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision

    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        num_poses=1,
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)
    _landmarker_cache.append(landmarker)
    return landmarker


def _personas_del_resultado(result) -> list[dict[int, dict[str, float]]]:
    """Landmarks de MediaPipe -> [ {id: {x,y,visibility}} ] por persona detectada."""
    personas: list[dict[int, dict[str, float]]] = []
    for persona in result.pose_landmarks or []:
        personas.append(
            {
                i: {
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "visibility": float(getattr(lm, "visibility", 1.0)),
                }
                # la posicion de la lista ES el id del landmark
                for i, lm in enumerate(persona)
            }
        )
    return personas


def _default_model_path() -> Path:
    """Ruta del pose landmarker (raiz del repo en dev; override env en contenedor).

    En el contenedor el contexto de build es backend/, la raiz del repo queda
    fuera de la imagen: compose monta el archivo y lo pasa por POSE_MODEL_PATH.
    """
    override = os.environ.get("POSE_MODEL_PATH")
    if override:
        return Path(override)
    # services -> src -> backend -> raiz del repo
    return Path(__file__).resolve().parents[3] / "pose_landmarker_full.task"


def validate_apose(imagen_bytes: bytes, model_path: Path | None = None) -> PoseCheck:
    """Valida la imagen del usuario contra el protocolo A-Pose.

    Se puede apagar (POSE_VALIDATION=off) para demos/tes: chequea el env por
    llamada, no al importar, para que el toggle sea runtime y la suite de
    tests lo controle con monkeypatch.
    """
    if os.environ.get("POSE_VALIDATION", "on").lower() == "off":
        return PoseCheck(ok=True, reason=None, details={"validacion": "off"})
    try:
        img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
    except Exception as exc:  # noqa: BLE001 - imagen corrupta es rechazo, no crash
        return PoseCheck(ok=False, reason=f"imagen no legible: {exc}")

    ruta = model_path or _default_model_path()
    if not ruta.exists():
        raise FileNotFoundError(
            f"pose_landmarker no esta en {ruta}; descarga el modelo o desactiva con POSE_VALIDATION=off"
        )

    import mediapipe as mp

    try:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(img))
        result = _landmarker(ruta).detect(mp_image)
    except Exception as exc:  # noqa: BLE001 - deteccion que crashea tambien es rechazo
        return PoseCheck(ok=False, reason=f"validacion de pose fallo: {exc}")

    personas = _personas_del_resultado(result)
    if len(personas) == 0:
        return PoseCheck(ok=False, reason="no se detecta ninguna persona de cuerpo completo")
    if len(personas) > 1:
        return PoseCheck(ok=False, reason=f"se detectan {len(personas)} personas; debe haber una")
    return _chequear_landmarks(personas[0])
