"""Pruebas unitarias para la calibración de temperatura (historia bcea)."""

import torch

from ml.validation.temperature_scaling import ModelWithTemperature


def test_temperature_scaling_scales_logits():
    calibrator = ModelWithTemperature(initial_temperature=2.0)
    logits = torch.tensor([[4.0, 2.0], [1.0, 3.0]])

    scaled = calibrator(logits)
    expected = torch.tensor([[2.0, 1.0], [0.5, 1.5]])
    assert torch.allclose(scaled, expected)


def test_temperature_calibration_adjusts_temperature():
    calibrator = ModelWithTemperature(initial_temperature=1.0)
    # Generar logits sobredimensionados para que la calibración aumente T
    logits = torch.randn(50, 5) * 5.0
    labels = torch.randint(0, 5, (50,))

    opt_temp = calibrator.calibrate(logits, labels, max_iter=20)
    assert opt_temp > 0.0
    assert isinstance(opt_temp, float)

    conf, preds = calibrator.get_confidence_and_prediction(logits)
    assert conf.shape == (50,)
    assert preds.shape == (50,)
    assert (conf >= 0.0).all() and (conf <= 1.0).all()
