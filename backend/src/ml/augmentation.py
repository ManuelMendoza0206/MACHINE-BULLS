"""Pipeline de aumentación de datos de imagen y verificación anti-fuga (historias bccy, bcd5, bcd7).

Diseñado para preprocesamiento robusto en CPU o GPU:
- Aumentación conservadora para prendas de moda (no invertir verticalmente, rotaciones leves).
- Verificación formal de que no exista data leakage entre splits (por garment_id / imagen).
- Diagnóstico y cálculo de pesos inversos de clase para mitigar desbalance de categorías y estéticas.
"""

from __future__ import annotations

import random
from collections import Counter
from collections.abc import Iterable, Sequence
from typing import Any

from PIL import Image

try:
    import torch
    from torchvision import transforms
    HAS_TORCHVISION = True
except ImportError:
    HAS_TORCHVISION = False


def get_image_transforms(is_train: bool = True, image_size: int = 224) -> Any:
    """Devuelve el pipeline de transformaciones para entrenamiento o evaluación."""
    if not HAS_TORCHVISION:
        return None

    if is_train:
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=5),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.02),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.48145466, 0.4578275, 0.40821073],
                std=[0.26862954, 0.26130258, 0.27577711],
            ),
        ])
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.48145466, 0.4578275, 0.40821073],
            std=[0.26862954, 0.26130258, 0.27577711],
        ),
    ])


def aplicar_aumentacion_pil(image: Image.Image, seed: int | None = None) -> Image.Image:
    """Aumentación ligera puramente con PIL (fallback sin GPU/torchvision si fuera necesario)."""
    if seed is not None:
        random.seed(seed)

    img = image.copy()
    # Flip horizontal con 50% probabilidad
    if random.random() > 0.5:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    # Rotación leve aleatoria entre -5 y +5 grados
    angle = random.uniform(-5.0, 5.0)
    img = img.rotate(angle, resample=Image.Resampling.BILINEAR, fillcolor=(255, 255, 255))
    return img


def verificar_splits_anti_fuga(
    train_items: Sequence[dict[str, Any]],
    val_items: Sequence[dict[str, Any]],
    test_items: Sequence[dict[str, Any]],
    key: str = "garment_id",
) -> tuple[bool, dict[str, int]]:
    """Verifica que no exista intersección de prendas entre los splits (historia bcd5).
    
    Retorna (is_clean, stats_dict). Si is_clean es False, hay fuga de datos (data leakage).
    """
    train_ids = {str(item.get(key, "")) for item in train_items if key in item}
    val_ids = {str(item.get(key, "")) for item in val_items if key in item}
    test_ids = {str(item.get(key, "")) for item in test_items if key in item}

    train_val_overlap = len(train_ids.intersection(val_ids))
    train_test_overlap = len(train_ids.intersection(test_ids))
    val_test_overlap = len(val_ids.intersection(test_ids))

    stats = {
        "train_count": len(train_items),
        "val_count": len(val_items),
        "test_count": len(test_items),
        "unique_train_ids": len(train_ids),
        "unique_val_ids": len(val_ids),
        "unique_test_ids": len(test_ids),
        "train_val_overlap": train_val_overlap,
        "train_test_overlap": train_test_overlap,
        "val_test_overlap": val_test_overlap,
    }

    is_clean = (train_val_overlap == 0) and (train_test_overlap == 0) and (val_test_overlap == 0)
    return is_clean, stats


def calcular_pesos_balanceo(labels: Sequence[str]) -> dict[str, float]:
    """Calcula pesos inversos de clase para mitigar sesgos de representación (historia bcd7)."""
    counts = Counter(labels)
    total = len(labels)
    if total == 0 or len(counts) == 0:
        return {}

    num_classes = len(counts)
    # Peso = Total / (Num_Clases * Frecuencia)
    weights = {cls: float(total / (num_classes * count)) for cls, count in counts.items()}
    return weights
