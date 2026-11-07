#!/usr/bin/env python3
"""Model Promotion Gate for CI/CD Pipeline.

Enforces production model deployment quality thresholds defined in plan-base.md §9:
1. Functional category classification: F1-Score Macro >= 0.82
2. Aesthetic style classification: F1-Score Macro >= 0.75
3. Compatibility Engine (Outfits): Fill-In-The-Blank (FITB) Accuracy >= 70% (0.70)
4. No regression: candidate F1-Score >= baseline F1-Score

Exit Codes:
- 0: Candidate model meets or exceeds all criteria (PROMOTION APPROVED)
- 1: One or more quality criteria failed or evaluation file missing (PROMOTION BLOCKED)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, NamedTuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("model_promotion_gate")

DEFAULT_METRICS_PATH = Path("docs/ml/comparativa_baseline_vs_adapter.json")
DEFAULT_DECISION_PATH = Path("docs/ml/model_promotion_decision.json")

# plan-base.md §9 Thresholds
DEFAULT_MIN_F1_CATEGORY = 0.82
DEFAULT_MIN_F1_AESTHETIC = 0.75
DEFAULT_MIN_FITB = 0.70


class GateResult(NamedTuple):
    passed: bool
    decision: str
    details: dict[str, Any]


def evaluate_candidate_model(
    metrics_data: dict[str, Any],
    min_f1_cat: float = DEFAULT_MIN_F1_CATEGORY,
    min_f1_aes: float = DEFAULT_MIN_F1_AESTHETIC,
    min_fitb: float = DEFAULT_MIN_FITB,
) -> GateResult:
    """Evaluate candidate model metrics against promotion thresholds."""
    candidate = metrics_data.get("adapter") or metrics_data.get("candidate")
    if not candidate:
        return GateResult(
            passed=False,
            decision="REJECTED_NO_CANDIDATE",
            details={"error": "No candidate/adapter section found in metrics file."},
        )

    baseline = metrics_data.get("baseline", {})

    cand_f1 = float(candidate.get("f1_macro", candidate.get("f1_score", 0.0)))
    cand_fitb = float(candidate.get("fitb_accuracy", 0.0))
    base_f1 = float(baseline.get("f1_macro", 0.0))

    cat_passed = cand_f1 >= min_f1_cat
    aes_passed = cand_f1 >= min_f1_aes
    fitb_passed = cand_fitb >= min_fitb
    no_regression = cand_f1 >= base_f1 if base_f1 > 0 else True

    all_passed = cat_passed and aes_passed and fitb_passed and no_regression

    details = {
        "candidate_name": candidate.get("model_name", "unknown"),
        "candidate_f1_macro": cand_f1,
        "candidate_fitb": cand_fitb,
        "baseline_f1_macro": base_f1,
        "checks": {
            "f1_category_ge_threshold": {
                "threshold": min_f1_cat,
                "value": cand_f1,
                "passed": cat_passed,
            },
            "f1_aesthetic_ge_threshold": {
                "threshold": min_f1_aes,
                "value": cand_f1,
                "passed": aes_passed,
            },
            "fitb_ge_threshold": {
                "threshold": min_fitb,
                "value": cand_fitb,
                "passed": fitb_passed,
            },
            "no_f1_regression_vs_baseline": {
                "baseline_value": base_f1,
                "candidate_value": cand_f1,
                "passed": no_regression,
            },
        },
    }

    decision = "APPROVED" if all_passed else "BLOCKED_BELOW_THRESHOLDS"
    return GateResult(passed=all_passed, decision=decision, details=details)


def run_promotion_gate(
    metrics_path: Path = DEFAULT_METRICS_PATH,
    decision_path: Path = DEFAULT_DECISION_PATH,
    min_f1_cat: float = DEFAULT_MIN_F1_CATEGORY,
    min_f1_aes: float = DEFAULT_MIN_F1_AESTHETIC,
    min_fitb: float = DEFAULT_MIN_FITB,
) -> bool:
    """Run model promotion gate check and save decision output."""
    if not metrics_path.exists():
        logger.error("Metrics evaluation file not found: %s", metrics_path)
        return False

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    result = evaluate_candidate_model(
        data,
        min_f1_cat=min_f1_cat,
        min_f1_aes=min_f1_aes,
        min_fitb=min_fitb,
    )

    decision_payload = {
        "gate": "model_promotion_gate",
        "decision": result.decision,
        "passed": result.passed,
        "metrics_source": str(metrics_path),
        "details": result.details,
    }

    decision_path.parent.mkdir(parents=True, exist_ok=True)
    with open(decision_path, "w", encoding="utf-8") as f:
        json.dump(decision_payload, f, indent=2)

    logger.info("================ MODEL PROMOTION GATE REPORT ================")
    logger.info("Candidate Model: %s", result.details.get("candidate_name"))
    logger.info(
        "F1 Aesthetic:    %.4f (Threshold >= %.2f) -> %s",
        result.details.get("candidate_f1_macro", 0.0),
        min_f1_aes,
        "PASS" if result.details.get("checks", {}).get("f1_aesthetic_ge_threshold", {}).get("passed") else "FAIL",
    )
    logger.info(
        "F1 Category:     %.4f (Threshold >= %.2f) -> %s",
        result.details.get("candidate_f1_macro", 0.0),
        min_f1_cat,
        "PASS" if result.details.get("checks", {}).get("f1_category_ge_threshold", {}).get("passed") else "FAIL",
    )
    logger.info(
        "FITB Accuracy:   %.4f (Threshold >= %.2f) -> %s",
        result.details.get("candidate_fitb", 0.0),
        min_fitb,
        "PASS" if result.details.get("checks", {}).get("fitb_ge_threshold", {}).get("passed") else "FAIL",
    )
    logger.info(
        "No Regression:   candidate >= baseline (%.4f >= %.4f) -> %s",
        result.details.get("candidate_f1_macro", 0.0),
        result.details.get("baseline_f1_macro", 0.0),
        "PASS" if result.details.get("checks", {}).get("no_f1_regression_vs_baseline", {}).get("passed") else "FAIL",
    )
    logger.info("=============================================================")
    logger.info("PROMOTION DECISION: %s", result.decision)

    return result.passed


def main() -> int:
    parser = argparse.ArgumentParser(description="Model Promotion Quality Gate for CI/CD")
    parser.add_argument("--metrics-path", type=Path, default=DEFAULT_METRICS_PATH, help="Path to evaluation JSON")
    parser.add_argument("--decision-path", type=Path, default=DEFAULT_DECISION_PATH, help="Path to output decision JSON")
    parser.add_argument("--min-f1-category", type=float, default=DEFAULT_MIN_F1_CATEGORY, help="Min F1 for category")
    parser.add_argument("--min-f1-aesthetic", type=float, default=DEFAULT_MIN_F1_AESTHETIC, help="Min F1 for aesthetics")
    parser.add_argument("--min-fitb", type=float, default=DEFAULT_MIN_FITB, help="Min FITB accuracy")
    args = parser.parse_args()

    passed = run_promotion_gate(
        metrics_path=args.metrics_path,
        decision_path=args.decision_path,
        min_f1_cat=args.min_f1_category,
        min_f1_aes=args.min_f1_aesthetic,
        min_fitb=args.min_fitb,
    )

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
