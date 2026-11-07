"""Unit tests for scripts/ci/model_promotion_gate.py"""

import json
import sys
from pathlib import Path

# Add repo root to sys.path so we can import scripts.ci.model_promotion_gate
REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ci.model_promotion_gate import evaluate_candidate_model, run_promotion_gate


def test_evaluate_candidate_model_approved():
    metrics = {
        "baseline": {"f1_macro": 0.81},
        "adapter": {
            "model_name": "test-adapter",
            "f1_macro": 0.88,
            "fitb_accuracy": 0.82,
        },
    }
    result = evaluate_candidate_model(metrics, min_f1_cat=0.82, min_f1_aes=0.75, min_fitb=0.70)
    assert result.passed is True
    assert result.decision == "APPROVED"
    assert result.details["checks"]["f1_category_ge_threshold"]["passed"] is True
    assert result.details["checks"]["f1_aesthetic_ge_threshold"]["passed"] is True
    assert result.details["checks"]["fitb_ge_threshold"]["passed"] is True


def test_evaluate_candidate_model_rejected_on_f1():
    metrics = {
        "baseline": {"f1_macro": 0.80},
        "adapter": {
            "model_name": "poor-f1-adapter",
            "f1_macro": 0.74,  # Below 0.75 and below 0.82
            "fitb_accuracy": 0.85,
        },
    }
    result = evaluate_candidate_model(metrics, min_f1_cat=0.82, min_f1_aes=0.75, min_fitb=0.70)
    assert result.passed is False
    assert result.decision == "BLOCKED_BELOW_THRESHOLDS"
    assert result.details["checks"]["f1_category_ge_threshold"]["passed"] is False


def test_evaluate_candidate_model_rejected_on_fitb():
    metrics = {
        "baseline": {"f1_macro": 0.80},
        "adapter": {
            "model_name": "poor-fitb-adapter",
            "f1_macro": 0.89,
            "fitb_accuracy": 0.65,  # Below 0.70
        },
    }
    result = evaluate_candidate_model(metrics, min_f1_cat=0.82, min_f1_aes=0.75, min_fitb=0.70)
    assert result.passed is False
    assert result.decision == "BLOCKED_BELOW_THRESHOLDS"
    assert result.details["checks"]["fitb_ge_threshold"]["passed"] is False


def test_evaluate_candidate_model_rejected_on_regression():
    metrics = {
        "baseline": {"f1_macro": 0.90},
        "adapter": {
            "model_name": "regressed-adapter",
            "f1_macro": 0.85,  # Exceeds threshold 0.82, but regressed vs baseline 0.90
            "fitb_accuracy": 0.80,
        },
    }
    result = evaluate_candidate_model(metrics, min_f1_cat=0.82, min_f1_aes=0.75, min_fitb=0.70)
    assert result.passed is False
    assert result.details["checks"]["no_f1_regression_vs_baseline"]["passed"] is False


def test_evaluate_candidate_model_no_candidate_section():
    metrics = {"baseline": {"f1_macro": 0.80}}
    result = evaluate_candidate_model(metrics)
    assert result.passed is False
    assert result.decision == "REJECTED_NO_CANDIDATE"


def test_run_promotion_gate_with_files(tmp_path: Path):
    metrics_file = tmp_path / "metrics.json"
    decision_file = tmp_path / "decision.json"
    metrics_file.write_text(
        json.dumps(
            {
                "baseline": {"f1_macro": 0.80},
                "adapter": {"f1_macro": 0.89, "fitb_accuracy": 0.85},
            }
        ),
        encoding="utf-8",
    )

    passed = run_promotion_gate(
        metrics_path=metrics_file,
        decision_path=decision_file,
    )
    assert passed is True
    assert decision_file.exists()
    decision_data = json.loads(decision_file.read_text(encoding="utf-8"))
    assert decision_data["passed"] is True
    assert decision_data["decision"] == "APPROVED"
