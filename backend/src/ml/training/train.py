"""Skeleton del pipeline de entrenamiento (historia bccr).

Plomería real: CLI con argparse, carga y validación de YAML, plan
resuelto imprimible. El loop de entrenamiento NO existe todavía:
``train()`` levanta ``NotImplementedError`` apuntando al sprint que lo
implemente. Nada aquí finge entrenar.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import yaml

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.yaml"

REQUIRED_TOP_KEYS = ("model", "dataset", "training", "seed")


def load_config(path: str | Path) -> dict[str, Any]:
    """Lee un YAML y devuelve el dict. Falla en voz alta si no existe o no parsea."""
    p = Path(path)
    with p.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise TypeError(f"config {p}: raíz debe ser un mapeo, no {type(data).__name__}")
    return data


def validate_config(cfg: dict[str, Any]) -> list[str]:
    """Devuelve la lista de errores; vacía == config válida."""
    errors: list[str] = []
    for key in REQUIRED_TOP_KEYS:
        if key not in cfg:
            errors.append(f"falta clave requerida: {key}")
    training = cfg.get("training")
    if isinstance(training, dict):
        for key in ("epochs", "batch_size", "lr"):
            if key not in training:
                errors.append(f"falta training.{key}")
    elif "training" in cfg:
        errors.append("training debe ser un mapeo")
    seed = cfg.get("seed")
    if "seed" in cfg and not isinstance(seed, int):
        errors.append("seed debe ser entero")
    return errors


def build_plan(cfg: dict[str, Any]) -> dict[str, Any]:
    """Resume la config validada en un plan imprimible (sin efectos)."""
    training = cfg.get("training", {})
    dataset = cfg.get("dataset", {})
    return {
        "model": cfg.get("model"),
        "dataset": dataset.get("name") if isinstance(dataset, dict) else dataset,
        "epochs": training.get("epochs") if isinstance(training, dict) else None,
        "batch_size": training.get("batch_size") if isinstance(training, dict) else None,
        "lr": training.get("lr") if isinstance(training, dict) else None,
        "seed": cfg.get("seed"),
    }


def train(cfg: dict[str, Any]) -> None:
    """Loop de entrenamiento. No implementado: ver sprint de entrenamiento."""
    raise NotImplementedError("train() pendiente — loop de entrenamiento no implementado (bccr es skeleton)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Skeleton de entrenamiento (bccr)")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="ruta al YAML")
    parser.add_argument("--run", action="store_true", help="intenta el loop (hoy falla honesto)")
    args = parser.parse_args(argv)

    try:
        cfg = load_config(args.config)
    except (OSError, TypeError, ValueError, yaml.YAMLError) as e:
        print(f"config inválida: {e}", file=sys.stderr)
        return 1
    errors = validate_config(cfg)
    if errors:
        for err in errors:
            print(f"config inválida: {err}", file=sys.stderr)
        return 1
    plan = build_plan(cfg)
    print(
        f"plan: model={plan['model']} dataset={plan['dataset']} epochs={plan['epochs']} "
        f"batch={plan['batch_size']} lr={plan['lr']} seed={plan['seed']}"
    )
    if args.run:
        try:
            train(cfg)
        except NotImplementedError as e:
            print(f"no implementado: {e}", file=sys.stderr)
            return 2
    else:
        print("dry-run OK (usa --run para intentar el loop)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
