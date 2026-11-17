"""Pipeline de entrenamiento del adaptador de compatibilidad estética (historias bccr, bcdj, bcdr).

Entrena una cabeza de proyección ligera (D=512 -> D=128) con Contrastive Loss
y clasificación de estética sobre el backbone congelado de Fashion-CLIP.
Soporta CPU local o GPU automáticamente y registra métricas y modelos en DagsHub/MLflow.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

# Asegurar resolucion de modulo 'ml' desde backend/src
_SRC_DIR = Path(__file__).resolve().parent.parent.parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

import torch
import yaml
from torch import nn, optim
from torch.utils.data import DataLoader

from ml.models.adapter import AestheticProjectionHead, ContrastiveCompatibilityLoss
from ml.training.dataset import SyntheticPairDataset

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.yaml"
REQUIRED_TOP_KEYS = ("model", "dataset", "training", "seed")


def get_repo_root() -> Path:
    """Encuentra la raiz del repositorio MACHINE-BULLS de forma robusta (local, Docker o Colab Drive)."""
    p = Path(__file__).resolve()
    for parent in p.parents:
        if (parent / "sample_data").exists() or (parent / ".git").exists():
            return parent
    colab_drive = Path("/content/drive/MyDrive/MACHINE-BULLS")
    if colab_drive.exists():
        return colab_drive
    return p.parents[4] if len(p.parents) > 4 else p.parent


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
    """Resume la config validada en un plan imprimible."""
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


def train(
    cfg: dict[str, Any],
    fast_dev_run: bool = False,
    use_mlflow: bool = True,
    run_name: str = "fashion-clip-adapter",
) -> dict[str, Any]:
    """Ejecuta el bucle de entrenamiento del adaptador y registra métricas."""
    training_cfg = cfg.get("training", {})
    epochs = 1 if fast_dev_run else int(training_cfg.get("epochs", 3))
    batch_size = int(training_cfg.get("batch_size", 16))
    lr = float(training_cfg.get("lr", 0.001))
    seed = int(cfg.get("seed", 42))

    torch.manual_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TRAIN] Dispositivo detectado: {device} | Épocas: {epochs} | Batch: {batch_size} | LR: {lr}")

    # Cargar datasets
    repo_root = get_repo_root()
    train_jsonl = repo_root / "sample_data" / "clip_pairs_train.jsonl"
    val_jsonl = repo_root / "sample_data" / "clip_pairs_val.jsonl"

    max_samples = 64 if fast_dev_run else 1000
    train_dataset = SyntheticPairDataset(train_jsonl, seed=seed, max_samples=max_samples)
    val_dataset = SyntheticPairDataset(val_jsonl, seed=seed + 1, max_samples=max_samples // 4)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # Modelo y optimizador
    model = AestheticProjectionHead(input_dim=512, hidden_dim=256, output_dim=128, num_aesthetics=12)
    model.to(device)

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-2)
    criterion_contrastive = ContrastiveCompatibilityLoss(temperature=0.07)
    criterion_cls = nn.CrossEntropyLoss()

    # Iniciar MLflow si está habilitado
    mlflow_active = False
    if use_mlflow:
        try:
            from dotenv import load_dotenv
            load_dotenv(repo_root / ".env")
            load_dotenv(repo_root / "backend" / ".env")

            token = os.environ.get("DAGSHUB_USER_TOKEN") or os.environ.get("DAGSHUB_TOKEN")
            if token:
                os.environ["DAGSHUB_TOKEN"] = token

            import dagshub
            import mlflow

            # Inicializar DagsHub si hay credenciales
            dagshub.init(repo_owner="jesusrodrigov", repo_name="machine-bulls", mlflow=True)
            mlflow.start_run(run_name=run_name)
            mlflow.log_params({
                "model_type": "fashion-clip-adapter",
                "backbone": "patrickjohncyh/fashion-clip (frozen)",
                "head_dims": "512->256->128",
                "epochs": epochs,
                "batch_size": batch_size,
                "lr": lr,
                "seed": seed,
                "device": str(device),
                "num_train_samples": len(train_dataset),
            })
            mlflow_active = True
        except Exception as ex:  # noqa: BLE001
            print(f"[WARN] No se pudo inicializar MLflow/DagsHub: {ex}. Continuando localmente.")

    history: dict[str, list[float]] = {
        "train_loss": [],
        "val_loss": [],
        "val_acc": [],
    }

    # Bucle de épocas
    for epoch in range(1, epochs + 1):
        model.train()
        total_train_loss = 0.0

        for anchors, positives, labels in train_loader:
            anchors, positives, labels = anchors.to(device), positives.to(device), labels.to(device)
            optimizer.zero_grad()

            proj_a, logits_a = model(anchors)
            proj_p, _ = model(positives)

            loss_cont = criterion_contrastive(proj_a, proj_p)
            loss_cls = criterion_cls(logits_a, labels)
            total_loss = loss_cont + 0.5 * loss_cls

            total_loss.backward()
            optimizer.step()
            total_train_loss += total_loss.item()

        avg_train_loss = total_train_loss / max(1, len(train_loader))

        # Validación
        model.eval()
        total_val_loss = 0.0
        correct = 0
        val_samples = 0

        with torch.no_grad():
            for anchors, positives, labels in val_loader:
                anchors, positives, labels = anchors.to(device), positives.to(device), labels.to(device)
                proj_a, logits_a = model(anchors)
                proj_p, _ = model(positives)

                loss_cont = criterion_contrastive(proj_a, proj_p)
                loss_cls = criterion_cls(logits_a, labels)
                val_loss = loss_cont + 0.5 * loss_cls

                total_val_loss += val_loss.item()
                preds = torch.argmax(logits_a, dim=-1)
                correct += (preds == labels).sum().item()
                val_samples += labels.size(0)

        avg_val_loss = total_val_loss / max(1, len(val_loader))
        val_acc = correct / max(1, val_samples)

        history["train_loss"].append(round(avg_train_loss, 4))
        history["val_loss"].append(round(avg_val_loss, 4))
        history["val_acc"].append(round(val_acc, 4))

        print(f"Época {epoch}/{epochs} -> Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.4f}")

        if mlflow_active:
            import mlflow
            mlflow.log_metrics(
                {"train_loss": avg_train_loss, "val_loss": avg_val_loss, "val_acc": val_acc},
                step=epoch,
            )

    # Guardar checkpoint local
    models_dir = repo_root / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = models_dir / "fashion_clip_adapter.pt"
    torch.save(model.state_dict(), ckpt_path)
    print(f"[OK] Modelo guardado en {ckpt_path}")

    if mlflow_active:
        import mlflow
        mlflow.log_artifact(str(ckpt_path), artifact_path="weights")
        mlflow.end_run()

    return {
        "final_train_loss": history["train_loss"][-1] if history["train_loss"] else 0.0,
        "final_val_loss": history["val_loss"][-1] if history["val_loss"] else 0.0,
        "final_val_acc": history["val_acc"][-1] if history["val_acc"] else 0.0,
        "checkpoint_path": str(ckpt_path),
        "history": history,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrenamiento del adaptador Fashion-CLIP")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="ruta al YAML")
    parser.add_argument("--run", action="store_true", help="ejecuta el bucle de entrenamiento")
    parser.add_argument("--fast-dev-run", action="store_true", help="ejecuta 1 época rápida para pruebas")
    parser.add_argument("--no-mlflow", action="store_true", help="deshabilita tracking en MLflow")
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

    if args.run or args.fast_dev_run:
        results = train(cfg, fast_dev_run=args.fast_dev_run, use_mlflow=not args.no_mlflow)
        print(f"[SUCCESS] Entrenamiento completado: {results}")
    else:
        print("dry-run OK (usa --run o --fast-dev-run para ejecutar)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
