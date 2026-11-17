"""Evaluador FITB (Fill-In-The-Blank) para compatibilidad de outfits (historias 86e3122ex, bcen).

Mide la capacidad de un modelo (Baseline o Fine-Tuned) para seleccionar la prenda
correcta que completa un outfit frente a 3 distractores aleatorios.
Criterio de aceptación en la spec: FITB >= 70%.
"""

from __future__ import annotations

import random
from collections.abc import Callable, Sequence
from typing import Any


def evaluate_fitb(
    outfits: Sequence[list[dict[str, Any]]],
    scoring_fn: Callable[[list[dict[str, Any]], dict[str, Any]], float],
    all_garments_pool: Sequence[dict[str, Any]],
    num_distractors: int = 3,
    seed: int = 42,
) -> dict[str, Any]:
    """Evalúa la precisión Fill-In-The-Blank (FITB).
    
    Args:
        outfits: Lista de outfits válidos (cada uno es lista de >= 2 prendas).
        scoring_fn: Función (outfit_parcial, prenda_candidata) -> score flotante.
        all_garments_pool: Catálogo completo de prendas para seleccionar distractores.
        num_distractors: Cantidad de distractores a comparar (default: 3, total 4 opciones).
        seed: Semilla para reproducibilidad.
        
    Returns:
        Dict con 'fitb_accuracy', 'total_evaluated', 'correct', 'threshold_passed'.
    """
    rng = random.Random(seed)
    correct = 0
    total = 0

    # Indexar pool por posición para extraer distractores de la misma categoría/posición
    pool_by_pos: dict[str, list[dict[str, Any]]] = {}
    for g in all_garments_pool:
        pos = str(g.get("position", g.get("category", "other")))
        pool_by_pos.setdefault(pos, []).append(g)

    for outfit in outfits:
        if len(outfit) < 2:
            continue

        # Seleccionar al azar una prenda para ocultar (el "blank")
        target_idx = rng.randrange(len(outfit))
        ground_truth = outfit[target_idx]
        partial_outfit = [g for i, g in enumerate(outfit) if i != target_idx]
        target_pos = str(ground_truth.get("position", ground_truth.get("category", "other")))

        gt_id = str(ground_truth.get("id") or ground_truth.get("garment_id", ""))

        # Obtener distractores de la misma posición/tipo distintos del target
        candidates_pool = [
            g for g in pool_by_pos.get(target_pos, all_garments_pool)
            if str(g.get("id") or g.get("garment_id", "")) != gt_id
        ]

        if len(candidates_pool) < num_distractors:
            continue

        distractors = rng.sample(candidates_pool, num_distractors)
        all_candidates = [ground_truth] + distractors
        # Mezclar el orden de evaluación
        rng.shuffle(all_candidates)

        scores = [scoring_fn(partial_outfit, cand) for cand in all_candidates]
        best_candidate = all_candidates[scores.index(max(scores))]

        target_id = ground_truth.get("id") or ground_truth.get("garment_id")
        chosen_id = best_candidate.get("id") or best_candidate.get("garment_id")

        if chosen_id == target_id:
            correct += 1
        total += 1

    accuracy = correct / total if total > 0 else 0.0
    return {
        "fitb_accuracy": round(accuracy, 4),
        "total_evaluated": total,
        "correct": correct,
        "num_distractors": num_distractors,
        "threshold_passed": accuracy >= 0.70,
    }
