"""Tests unitarios para la configuracion y seleccion de Fashion-CLIP."""

from __future__ import annotations

import sys
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

    mock_torch = MagicMock()
    mock_torch.cuda.is_available.return_value = False
    monkeypatch.setitem(sys.modules, "torch", mock_torch)

    mock_transformers = MagicMock()
    mock_transformers.CLIPProcessor.from_pretrained.return_value = mock_processor
    mock_transformers.CLIPModel.from_pretrained.return_value = mock_model
    monkeypatch.setitem(sys.modules, "transformers", mock_transformers)

    clf = ClipClassifier(model_name="patrickjohncyh/fashion-clip", device="cpu")
    assert clf.model_name == "patrickjohncyh/fashion-clip"
    assert clf.processor is mock_processor
    mock_transformers.CLIPProcessor.from_pretrained.assert_called_with("patrickjohncyh/fashion-clip")
    mock_transformers.CLIPModel.from_pretrained.assert_called_with("patrickjohncyh/fashion-clip")


def test_clip_classifier_fallback_openai(monkeypatch: Any) -> None:
    """Si la carga del modelo especializado falla, aplica fallback transparente al modelo base."""
    mock_processor = MagicMock()
    mock_model = MagicMock()
    mock_model.to.return_value.eval.return_value = mock_model

    mock_torch = MagicMock()
    mock_torch.cuda.is_available.return_value = False
    monkeypatch.setitem(sys.modules, "torch", mock_torch)

    def _mock_proc(name: str) -> Any:
        if name == "unexistent/model-error":
            raise RuntimeError("Download failed")
        return mock_processor

    def _mock_mod(name: str) -> Any:
        if name == "unexistent/model-error":
            raise RuntimeError("Download failed")
        return mock_model

    mock_transformers = MagicMock()
    mock_transformers.CLIPProcessor.from_pretrained.side_effect = _mock_proc
    mock_transformers.CLIPModel.from_pretrained.side_effect = _mock_mod
    monkeypatch.setitem(sys.modules, "transformers", mock_transformers)

    clf = ClipClassifier(model_name="unexistent/model-error", device="cpu")
    assert clf.model_name == FALLBACK_MODEL_NAME
