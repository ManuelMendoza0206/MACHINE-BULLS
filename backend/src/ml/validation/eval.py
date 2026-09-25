"""Evaluación mínima sobre JSONs (historia bccr).

Lee predicciones + etiquetas y reporta accuracy. Cuando exista
``ml.metrics.evaluator`` (historia bccz) este módulo debe migrar a él;
mientras tanto no inventa métricas que no calcula.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def load_pairs(preds_path: str | Path, labels_path: str | Path) -> tuple[list[Any], list[Any]]:
    with Path(preds_path).open("r", encoding="utf-8") as f:
        preds = json.load(f)
    with Path(labels_path).open("r", encoding="utf-8") as f:
        labels = json.load(f)
    if not isinstance(preds, list) or not isinstance(labels, list):
        raise TypeError("preds y labels deben ser listas JSON")
    if len(preds) != len(labels):
        raise ValueError(f"preds ({len(preds)}) y labels ({len(labels)}) difieren en largo")
    return preds, labels


def accuracy(preds: list[Any], labels: list[Any]) -> float:
    if not labels:
        return 0.0
    return sum(1 for p, y in zip(preds, labels) if p == y) / len(labels)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Accuracy mínima sobre JSONs (bccr)")
    parser.add_argument("--preds", required=True, help="JSON lista de predicciones")
    parser.add_argument("--labels", required=True, help="JSON lista de etiquetas")
    parser.add_argument("--out", default=None, help="JSON de salida con la métrica")
    args = parser.parse_args(argv)

    try:
        preds, labels = load_pairs(args.preds, args.labels)
    except (OSError, TypeError, ValueError) as e:
        print(f"entrada inválida: {e}", file=sys.stderr)
        return 1
    result = {"accuracy": accuracy(preds, labels), "n": len(labels)}
    print(f"accuracy={result['accuracy']:.4f} n={result['n']}")
    if args.out:
        with Path(args.out).open("w", encoding="utf-8") as f:
            json.dump(result, f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
