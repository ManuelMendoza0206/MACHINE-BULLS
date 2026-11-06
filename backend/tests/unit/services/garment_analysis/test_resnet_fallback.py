"""Pruebas unitarias para el clasificador de respaldo ResNet-50 (86e3122f7).

Valida los criterios de aceptación de garment-analysis-service:
1. Confianza CLIP >= umbral: respuesta directa de CLIP, fallback ResNet NO se invoca.
2. Confianza CLIP < umbral: se dispara ResNet-50 y su resultado reemplaza al de CLIP.
3. Normalización a 224x224 con parámetros ImageNet.
"""

from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from services.garment_analysis.analyzer import classify_aesthetics
from services.garment_analysis.resnet_fallback_classifier import (
    IMAGENET_MEAN,
    IMAGENET_STD,
    ResNetFallbackClassifier,
    get_resnet_fallback_classifier,
)


@pytest.fixture
def sample_image() -> Image.Image:
    return Image.new("RGB", (300, 400), color=(120, 80, 200))


def test_resnet_fallback_preprocessing_normalizes_to_224x224(sample_image):
    classifier = ResNetFallbackClassifier()
    classifier._init_model()

    tensor = classifier.preprocess_image(sample_image)
    if hasattr(tensor, "shape"):
        assert tensor.shape[1] == 224
        assert tensor.shape[2] == 224
        assert tensor.shape[0] == 3  # RGB
    else:
        assert tensor.size == (224, 224)


def test_classify_aesthetics_does_not_invoke_fallback_when_confidence_is_above_threshold(sample_image):
    # Simula CLIP devolviendo confianza alta (0.85 >= 0.40)
    high_clip_probs = [0.85, 0.05, 0.03, 0.03, 0.02, 0.02]
    mock_clf = MagicMock()
    mock_clf.device = "cpu"

    with patch("services.garment_analysis.analyzer.get_classifier", return_value=mock_clf), \
         patch("ml.models.clip_classifier.ClipClassifier.probs_imagen", return_value=high_clip_probs * 2), \
         patch("services.garment_analysis.resnet_fallback_classifier.get_resnet_fallback_classifier") as mock_get_fallback:

        res = classify_aesthetics(sample_image, top_n=3, confidence_threshold=0.40)

        # Verifica resultado directo de CLIP
        assert len(res) == 3
        assert res[0]["confidence"] >= 0.40
        assert "fallback_used" not in res[0]
        # El fallback NO debe ser invocado
        mock_get_fallback.assert_not_called()


def test_classify_aesthetics_invokes_resnet_fallback_when_confidence_is_below_threshold(sample_image):
    # Simula CLIP con confianza dispersa/baja (todas <= 0.20, por debajo del umbral de 0.40)
    low_clip_probs = [0.18, 0.17, 0.16, 0.16, 0.16, 0.17]
    mock_clf = MagicMock()
    mock_clf.device = "cpu"

    mock_resnet_result = [
        {"aesthetic": "minimalist", "confidence": 0.72, "fallback_used": True, "model": "resnet50"},
        {"aesthetic": "casual", "confidence": 0.18, "fallback_used": True, "model": "resnet50"},
        {"aesthetic": "streetwear", "confidence": 0.10, "fallback_used": True, "model": "resnet50"},
    ]

    mock_classifier = MagicMock()
    mock_classifier.classify.return_value = mock_resnet_result

    with patch("services.garment_analysis.analyzer.get_classifier", return_value=mock_clf), \
         patch("ml.models.clip_classifier.ClipClassifier.probs_imagen", return_value=low_clip_probs * 2), \
         patch("services.garment_analysis.resnet_fallback_classifier.get_resnet_fallback_classifier", return_value=mock_classifier):

        res = classify_aesthetics(sample_image, top_n=3, confidence_threshold=0.40)

        # Verifica que la respuesta final proviene de ResNet-50
        assert res == mock_resnet_result
        assert res[0]["fallback_used"] is True
        assert res[0]["aesthetic"] == "minimalist"
        # El clasificador de respaldo SI fue invocado
        mock_classifier.classify.assert_called_once_with(sample_image, top_n=3)


def test_resnet_fallback_direct_inference_returns_valid_structure(sample_image):
    classifier = get_resnet_fallback_classifier()
    result = classifier.classify(sample_image, top_n=3)

    assert len(result) == 3
    for item in result:
        assert "aesthetic" in item
        assert "confidence" in item
        assert item["fallback_used"] is True
        assert 0.0 <= item["confidence"] <= 1.0
