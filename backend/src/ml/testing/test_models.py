"""Tests del skeleton (historia bccr). Viven en src por AC; pytest los levanta
vía testpaths extendido en backend/pyproject.toml."""

from __future__ import annotations

import json

import pytest

from ml.training.train import build_plan, load_config, train, validate_config
from ml.training.train import main as train_main
from ml.validation.eval import accuracy
from ml.validation.eval import main as eval_main


def test_config_default_carga_y_valida(tmp_path=None) -> None:
    from ml.training.train import DEFAULT_CONFIG

    cfg = load_config(DEFAULT_CONFIG)
    assert validate_config(cfg) == []


def test_config_invalida_reporta_errores(tmp_path) -> None:
    p = tmp_path / "bad.yaml"
    p.write_text("model: x\n", encoding="utf-8")
    cfg = load_config(p)
    errors = validate_config(cfg)
    assert any("dataset" in e for e in errors)
    assert any("training" in e for e in errors)
    assert any("seed" in e for e in errors)


def test_train_no_implementado() -> None:
    with pytest.raises(NotImplementedError):
        train({})


def test_train_main_dry_run_ok(capsys) -> None:
    from ml.training.train import DEFAULT_CONFIG

    cfg = load_config(DEFAULT_CONFIG)
    plan = build_plan(cfg)
    assert plan["seed"] == 42
    assert train_main(["--config", str(DEFAULT_CONFIG)]) == 0
    assert "dry-run OK" in capsys.readouterr().out


def test_train_main_run_falla_honesto() -> None:
    from ml.training.train import DEFAULT_CONFIG

    assert train_main(["--config", str(DEFAULT_CONFIG), "--run"]) == 2


def test_eval_accuracy_y_cli(tmp_path) -> None:
    preds = tmp_path / "p.json"
    labels = tmp_path / "l.json"
    preds.write_text(json.dumps(["a", "b", "c"]), encoding="utf-8")
    labels.write_text(json.dumps(["a", "x", "c"]), encoding="utf-8")
    assert accuracy(["a", "b", "c"], ["a", "x", "c"]) == pytest.approx(2 / 3)
    out = tmp_path / "m.json"
    assert eval_main(["--preds", str(preds), "--labels", str(labels), "--out", str(out)]) == 0
    assert json.loads(out.read_text(encoding="utf-8"))["n"] == 3


def test_eval_largos_distintos_falla(tmp_path) -> None:
    preds = tmp_path / "p.json"
    labels = tmp_path / "l.json"
    preds.write_text(json.dumps(["a"]), encoding="utf-8")
    labels.write_text(json.dumps(["a", "b"]), encoding="utf-8")
    assert eval_main(["--preds", str(preds), "--labels", str(labels)]) == 1
