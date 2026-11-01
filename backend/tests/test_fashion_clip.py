"""Tests unitarios para la configuracion y seleccion de Fashion-CLIP."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

from config import settings
from ml.models.clip_classifier import DEFAULT_MODEL_NAME, FALLBACK_MODEL_NAME, ClipClassifier


def test_config_clip_model_default() -> None:
    """Verifica que el modelo por defecto sea Fashion-CLIP (patrickjohncyh/fashion-clip)."""
    assert settings.clip_model_name == "patrickjohncyh/fashion-clip"
    assert DEFAULT_MODEL_NAME == "patrickjohncyh/fashion-clip"


def test_clip_classifier_recibe_model_name(monkeypatch: Any) -> None:
    """ClipClassifier inicializa correctamente el procesador y modelo con el target indicado."""
    mock_processor = MagicMock()
    mock_model = MagicMock()
    mock_model.to.return_value.eval.return_value = mock_model

    import transformers

    monkeypatch.setattr(transformers.CLIPProcessor, "from_pretrained", lambda name: mock_processor)
    monkeypatch.setattr(transformers.CLIPModel, "from_pretrained", lambda name: mock_model)

    clf = ClipClassifier(model_name="patrickjohncyh/fashion-clip", device="cpu")
    assert clf.model_name == "patrickjohncyh/fashion-clip"
    assert clf.processor is mock_processor


def test_clip_classifier_fallback_openai(monkeypatch: Any) -> None:
    """Si la carga del modelo especializado falla, aplica fallback transparente al modelo base."""
    mock_processor = MagicMock()
    mock_model = MagicMock()
    mock_model.to.return_value.eval.return_value = mock_model

    def _failing_from_pretrained(name: str) -> Any:
        if name == "unexistent/model-error":
            raise RuntimeError("Model download error")
        if "processor" in str(_failing_from_pretrained):
            return mock_processor
        return mock_model

    import transformers

    def _mock_proc(name: str) -> Any:
        if name == "unexistent/model-error":
            raise RuntimeError("Download failed")
        return mock_processor

    def _mock_mod(name: str) -> Any:
        if name == "unexistent/model-error":
            raise RuntimeError("Download failed")
        return mock_model

    monkeypatch.setattr(transformers.CLIPProcessor, "from_pretrained", _mock_proc)
    monkeypatch.setattr(transformers.CLIPModel, "from_pretrained", _mock_mod)

    clf = ClipClassifier(model_name="unexistent/model-error", device="cpu")
    assert clf.model_name == FALLBACK_MODEL_NAME
