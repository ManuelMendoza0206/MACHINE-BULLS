"""Calibración de temperatura (Temperature Scaling) para probabilidades confiables (historia bcea).

Ajusta un escalar T > 0 sobre los logits del clasificador en el set de validación
para que softmax(z / T) refleje la confianza real del modelo.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.optim as optim


class ModelWithTemperature(nn.Module):
    """Envoltorio que aplica Temperature Scaling sobre los logits de un modelo."""

    def __init__(self, initial_temperature: float = 1.0) -> None:
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * initial_temperature)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """Aplica la temperatura sobre los logits."""
        return self.temperature_scale(logits)

    def temperature_scale(self, logits: torch.Tensor) -> torch.Tensor:
        """Divide los logits por la temperatura aprendida clampada a [0.01, 10.0]."""
        clamped_temp = torch.clamp(self.temperature, min=0.01, max=10.0)
        return logits / clamped_temp

    def calibrate(
        self,
        val_logits: torch.Tensor,
        val_labels: torch.Tensor,
        max_iter: int = 50,
        lr: float = 0.01,
    ) -> float:
        """Optimiza T sobre el conjunto de validación minimizando Negative Log-Likelihood (NLL)."""
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.LBFGS([self.temperature], lr=lr, max_iter=max_iter)
        labels = val_labels.long()

        def eval_loss() -> torch.Tensor:
            optimizer.zero_grad()
            loss = criterion(self.temperature_scale(val_logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        return float(self.temperature.item())

    def get_confidence_and_prediction(self, logits: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Devuelve (max_prob_calibrada, predicted_class_idx)."""
        calibrated_logits = self.temperature_scale(logits)
        probs = torch.softmax(calibrated_logits, dim=-1)
        max_prob, preds = torch.max(probs, dim=-1)
        return max_prob, preds
