"""Tests del validador A-Pose (svc pose_check).

Las funciones puras (`_angulo_respecto_vertical`, `_chequear_landmarks`) se
prueban con landmarks sinteticos: no dependen de MediaPipe ni del .task.
La validacion real con modelo corre integrada al final (skip si falta el
archivo o mediapipe) sobre `sample_data/usuario_apose.jpg`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from services.pose_check import PoseCheck, _angulo_respecto_vertical, _chequear_landmarks


def _lm(x: float, y: float, vis: float | None = 1.0) -> dict[str, float]:
    lm = {"x": x, "y": y}
    if vis is not None:
        lm["visibility"] = vis
    return lm


def _apose_valida() -> dict[int, dict[str, float]]:
    """A-Pose canonica: torso vertical, brazos ~45, piernas algo separadas."""
    return {
        11: _lm(0.35, 0.25), 12: _lm(0.65, 0.25),   # shoulders
        23: _lm(0.40, 0.55), 24: _lm(0.60, 0.55),   # hips
        13: _lm(0.23, 0.40), 14: _lm(0.77, 0.40),   # elbows
        15: _lm(0.18, 0.57), 16: _lm(0.82, 0.57),   # wrists
        25: _lm(0.37, 0.78), 26: _lm(0.63, 0.78),   # knees
        27: _lm(0.34, 0.95), 28: _lm(0.66, 0.95),   # ankles
    }


# --- angulo respecto al eje vertical -----------------------------------------


def test_angulo_brazo_colgando_es_cero() -> None:
    assert _angulo_respecto_vertical(0.0, 1.0) == pytest.approx(0.0)


def test_angulo_brazo_horizontal_es_90() -> None:
    assert _angulo_respecto_vertical(1.0, 0.0) == pytest.approx(90.0)


def test_angulo_apose_45() -> None:
    assert _angulo_respecto_vertical(1.0, 1.0) == pytest.approx(45.0)


def test_angulo_vector_cero_rechaza_grace() -> None:
    """Vector degenerado no debe romper: responde 90 (invalido pero firmado)."""
    assert _angulo_respecto_vertical(0.0, 0.0) == 90.0


# --- chequeo de A-Pose sobre landmarks ---------------------------------------


def test_apose_valida_pasa() -> None:
    check = _chequear_landmarks(_apose_valida())
    assert check.ok
    assert check.reason is None


def test_brazo_pegado_al_torso_rechaza() -> None:
    lms = _apose_valida()
    lms[15] = _lm(0.36, 0.60)  # muneca pegada al hombro izquierdo (casi vertical)
    lms[13] = _lm(0.34, 0.42)
    check = _chequear_landmarks(lms)
    assert not check.ok
    assert "pegado al torso" in (check.reason or "")


def test_brazo_en_t_rechaza() -> None:
    lms = _apose_valida()
    lms[13] = _lm(0.05, 0.25)  # codo a la altura del hombro
    lms[15] = _lm(0.0, 0.25)  # muneca horizontal (T-pose)
    check = _chequear_landmarks(lms)
    assert not check.ok
    assert "T-pose" in (check.reason or "")


def test_piernas_juntas_rechaza() -> None:
    lms = _apose_valida()
    lms[27] = _lm(0.49, 0.95)
    lms[28] = _lm(0.51, 0.95)
    check = _chequear_landmarks(lms)
    assert not check.ok
    assert "piernas" in (check.reason or "")


def test_landmark_no_visible_rechaza_razon_explicita() -> None:
    lms = _apose_valida()
    lms[28] = _lm(0.66, 0.95, vis=0.2)  # tobillo cortado por el encuadre
    check = _chequear_landmarks(lms)
    assert not check.ok
    assert "28" in (check.reason or "")


def test_landmark_faltante_rechaza() -> None:
    lms = _apose_valida()
    del lms[14]
    check = _chequear_landmarks(lms)
    assert not check.ok


def test_cuerpo_no_vertical_rechaza() -> None:
    """Hombros 'debajo' de las caderas: foto tirada / de pie en el piso."""
    lms = _apose_valida()
    lms[11] = _lm(0.35, 0.90)
    check = _chequear_landmarks(lms)
    assert not check.ok
    assert "vertical" in (check.reason or "")


def test_posecheck_frozen() -> None:
    """El dataclass es inmutable (contrato sensato para un resultado)."""
    p = PoseCheck(ok=True)
    with pytest.raises(AttributeError):
        p.ok = False  # type: ignore[misc]


# --- integracion (necesita mediapipe + .task en la raiz) ----------------------


def test_validacion_real_usuario_apose() -> None:
    """La foto de ejemplo del repo ES A-Pose; el modelo debe aceptarla."""
    import io

    try:
        from services.pose_check import validate_apose
    except ImportError:  # pragma: no cover
        pytest.skip("mediapipe no instalado en este entorno")

    modelo = Path(__file__).resolve().parents[2] / "pose_landmarker_full.task"
    muestra = Path(__file__).resolve().parents[2] / "sample_data" / "usuario_apose.jpg"
    if not modelo.exists() or not muestra.exists():
        pytest.skip("modelo o imagen de ejemplo no disponibles")

    check = validate_apose(muestra.read_bytes())
    assert check.ok, f"la foto de ejemplo deberia pasar el protocolo: {check.reason}"
