#!/usr/bin/env python3
"""Automated Post-Deployment Smoke Tests for Staging/Production.

Enforces system readiness after deployment (Task 86e302a3q):
1. /health: Backend liveness & DB connection.
2. /metrics: Prometheus metrics middleware & latency percentiles.
3. /api/v1/capsule: Capsule catalog retrieval.
4. /metrics/json: SRE latency percentiles (p50, p90, p95, p99).
5. Frontend document availability (if frontend URL provided).

Exit Codes:
- 0: All smoke tests passed. Promotion to production is permitted.
- 1: One or more smoke tests failed. Promotion is blocked.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("smoke_tests")

DEFAULT_RESULTS_PATH = Path("docs/ci/smoke_test_results.json")


def http_get_json(url: str, timeout: float = 5.0) -> tuple[int, dict[str, Any] | None]:
    """Execute GET request and return HTTP status and parsed JSON."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "StagingSmokeTester/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as exc:
        return exc.code, None
    except Exception as exc:  # noqa: BLE001
        logger.debug("Request failed for %s: %s", url, exc)
        return 0, None


def http_get_text(url: str, timeout: float = 5.0) -> tuple[int, str | None]:
    """Execute GET request and return HTTP status and raw text."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "StagingSmokeTester/1.0"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            return resp.status, text
    except urllib.error.HTTPError as exc:
        return exc.code, None
    except Exception as exc:  # noqa: BLE001
        logger.debug("Request failed for %s: %s", url, exc)
        return 0, None


def run_smoke_checks(
    backend_url: str = "http://localhost:8000",
    frontend_url: str | None = None,
    json_getter: Callable[[str], tuple[int, dict[str, Any] | None]] | None = None,
    text_getter: Callable[[str], tuple[int, str | None]] | None = None,
) -> dict[str, Any]:
    """Execute all smoke probes and compile verdict."""
    get_json_fn = json_getter or http_get_json
    get_text_fn = text_getter or http_get_text

    base_b = backend_url.rstrip("/")
    results: list[dict[str, Any]] = []

    # 1. Probe /health
    health_url = f"{base_b}/health"
    status_code, body = get_json_fn(health_url)
    h_ok = status_code == 200 and isinstance(body, dict) and str(body.get("status", "")).lower() == "ok"
    results.append({
        "check": "backend_health",
        "url": health_url,
        "status_code": status_code,
        "passed": h_ok,
        "details": body or {},
    })

    # 2. Probe /metrics (Prometheus export)
    metrics_url = f"{base_b}/metrics"
    m_code, m_text = get_text_fn(metrics_url)
    m_ok = m_code == 200 and m_text is not None and "http_requests_total" in m_text
    results.append({
        "check": "prometheus_metrics",
        "url": metrics_url,
        "status_code": m_code,
        "passed": m_ok,
        "details": {"metric_sample_found": m_ok},
    })

    # 3. Probe /metrics/json (SLO Latency Percentiles)
    metrics_json_url = f"{base_b}/metrics/json"
    mj_code, mj_body = get_json_fn(metrics_json_url)
    mj_ok = mj_code == 200 and isinstance(mj_body, dict) and "p95" in mj_body
    results.append({
        "check": "sre_latency_percentiles",
        "url": metrics_json_url,
        "status_code": mj_code,
        "passed": mj_ok,
        "details": mj_body or {},
    })

    # 4. Probe /api/v1/capsule (Catalog endpoint)
    capsule_url = f"{base_b}/api/v1/capsule"
    c_code, c_body = get_json_fn(capsule_url)
    c_ok = c_code == 200 and c_body is not None
    results.append({
        "check": "capsule_catalog",
        "url": capsule_url,
        "status_code": c_code,
        "passed": c_ok,
        "details": {"response_received": c_ok},
    })

    # 5. Optional Frontend Probe
    if frontend_url:
        base_f = frontend_url.rstrip("/")
        f_url = f"{base_f}/"
        f_code, f_text = get_text_fn(f_url)
        f_ok = f_code == 200 and f_text is not None and len(f_text) > 50
        results.append({
            "check": "frontend_web",
            "url": f_url,
            "status_code": f_code,
            "passed": f_ok,
            "details": {"content_length": len(f_text) if f_text else 0},
        })

    all_passed = all(r["passed"] for r in results)

    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "backend_url": backend_url,
        "frontend_url": frontend_url,
        "all_passed": all_passed,
        "checks_count": len(results),
        "passed_count": sum(1 for r in results if r["passed"]),
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Staging Post-Deploy Smoke Tests")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--frontend-url", default=None, help="Frontend base URL (optional)")
    parser.add_argument("--output", type=Path, default=DEFAULT_RESULTS_PATH, help="Output JSON path")
    args = parser.parse_args()

    verdict = run_smoke_checks(
        backend_url=args.backend_url,
        frontend_url=args.frontend_url,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(verdict, f, indent=2)

    logger.info("================ SMOKE TEST EXECUTION REPORT ================")
    for item in verdict["results"]:
        status = "PASS" if item["passed"] else "FAIL"
        logger.info("[%s] %-25s -> HTTP %d", status, item["check"], item["status_code"])
    logger.info("==============================================================")
    logger.info("RESULT: %d/%d passed. (all_passed=%s)", verdict["passed_count"], verdict["checks_count"], verdict["all_passed"])

    return 0 if verdict["all_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
