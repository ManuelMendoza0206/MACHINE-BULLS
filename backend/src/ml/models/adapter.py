"""Cabezal de proyección y compatibilidad estética para Fashion-CLIP (historias bcdj, bcdr).

Mantiene el backbone de CLIP congelado y proyecta el embedding visual D=512
a un espacio métrico calibrado D=128 (contrato CompatibilityEmbeddingModel del spec B3).
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class AestheticProjectionHead(nn.Module):
    """Proyecta embeddings de CLIP (512-dim) a embeddings de compatibilidad (128-dim) y estéticas."""

    def __init__(
        self,
        input_dim: int = 512,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_aesthetics: int = 12,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()
        self.output_dim = output_dim

        # Proyección de compatibilidad D=128 (L2 normalizada)
        self.projection = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim),
        )

        # Clasificador de estética sobre el embedding proyectado
        self.classifier = nn.Sequential(
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(output_dim, num_aesthetics),
        )

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Devuelve (embeddings_normalizados_128d, logits_estetica)."""
        raw_emb = self.projection(x)
        normalized_emb = F.normalize(raw_emb, p=2, dim=-1)
        logits = self.classifier(normalized_emb)
        return normalized_emb, logits

    def compute_similarity(self, emb_a: torch.Tensor, emb_b: torch.Tensor) -> torch.Tensor:
        """Calcula similitud coseno entre pares proyectados."""
        norm_a = F.normalize(emb_a, p=2, dim=-1)
        norm_b = F.normalize(emb_b, p=2, dim=-1)
        return (norm_a * norm_b).sum(dim=-1)


class ContrastiveCompatibilityLoss(nn.Module):
    """Loss contrastivo simétrico (InfoNCE) para pares de prendas de un outfit."""

    def __init__(self, temperature: float = 0.07) -> None:
        super().__init__()
        self.temperature = temperature

    def forward(self, emb_anchor: torch.Tensor, emb_positive: torch.Tensor) -> torch.Tensor:
        """Pares en la misma posición del batch son positivos; los demás son negativos."""
        batch_size = emb_anchor.shape[0]
        if batch_size <= 1:
            return torch.tensor(0.0, requires_grad=True, device=emb_anchor.device)

        # Similitud en batch: [B, B]
        similarity_matrix = torch.matmul(emb_anchor, emb_positive.T) / self.temperature
        labels = torch.arange(batch_size, device=emb_anchor.device)

        loss_a = F.cross_entropy(similarity_matrix, labels)
        loss_b = F.cross_entropy(similarity_matrix.T, labels)
        return (loss_a + loss_b) / 2.0
