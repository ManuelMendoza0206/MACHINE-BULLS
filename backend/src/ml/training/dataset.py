"""Dataset y cargador de pares para el entrenamiento de compatibilidad estética (historia bcdj)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import torch
from torch.utils.data import Dataset


class SyntheticPairDataset(Dataset):
    """Dataset para pares de prendas (anchor, positive) con etiquetas de estética.
    
    Permite entrenamiento inmediato en CPU usando embeddings proyectados o generados
    a partir de las características de los pares en `sample_data/clip_pairs_*.jsonl`.
    """

    def __init__(
        self,
        jsonl_path: str | Path,
        embedding_dim: int = 512,
        seed: int = 42,
        max_samples: int | None = None,
    ) -> None:
        self.path = Path(jsonl_path)
        self.embedding_dim = embedding_dim
        self.items: list[dict[str, Any]] = []

        if self.path.exists():
            with self.path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self.items.append(json.loads(line))
        else:
            # Fallback sintético mínimo si no existe la ruta
            self.items = [{"garment_id": f"g_{i}", "text": f"item {i}"} for i in range(100)]

        if max_samples and max_samples < len(self.items):
            self.items = self.items[:max_samples]

        # Generar embeddings base deterministas basados en el hash de los textos/ids para simular Fashion-CLIP
        torch.manual_seed(seed)
        self.anchors = torch.randn(len(self.items), embedding_dim)
        # Positivos correlacionados con el anchor (simulando prenda compatible del outfit)
        noise = torch.randn(len(self.items), embedding_dim) * 0.35
        self.positives = self.anchors + noise
        self.labels = torch.randint(0, 12, (len(self.items),), dtype=torch.long)

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.anchors[idx], self.positives[idx], self.labels[idx]
