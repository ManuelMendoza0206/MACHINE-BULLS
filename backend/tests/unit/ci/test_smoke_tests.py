"""Unit tests for scripts/smoke_tests.py"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.smoke_tests import run_smoke_checks


def test_run_smoke_checks_all_pass():
    def mock_json(url: str):
        if url.endswith("/health"):
            return 200, {"status": "ok", "version": "1.0.0"}
        if url.endswith("/metrics/json"):
            return 200, {"p50": 10.0, "p95": 45.0, "p99": 90.0}
        if url.endswith("/api/v1/capsule"):
            return 200, {"items": [{"id": "1", "name": "shirt"}]}
        return 404, None

    def mock_text(url: str):
        if url.endswith("/metrics"):
            return 200, "# HELP http_requests_total\nhttp_requests_total 42\n"
        if url.endswith("/"):
            return 200, "<!DOCTYPE html><html><body>StyleSync App</body></html>"
        return 404, None

    verdict = run_smoke_checks(
        backend_url="http://mocked-backend:8000",
        frontend_url="http://mocked-frontend:3000",
        json_getter=mock_json,
        text_getter=mock_text,
    )

    assert verdict["all_passed"] is True
    assert verdict["checks_count"] == 5
    assert verdict["passed_count"] == 5


def test_run_smoke_checks_health_failure():
    def mock_json(url: str):
        if url.endswith("/health"):
            return 503, {"status": "unhealthy", "error": "db down"}
        if url.endswith("/metrics/json"):
            return 200, {"p95": 10.0}
        return 200, {}

    def mock_text(url: str):
        return 200, "http_requests_total 1"

    verdict = run_smoke_checks(
        backend_url="http://mocked-backend:8000",
        json_getter=mock_json,
        text_getter=mock_text,
    )

    assert verdict["all_passed"] is False
    assert any(not r["passed"] and r["check"] == "backend_health" for r in verdict["results"])


def test_run_smoke_checks_metrics_failure():
    def mock_json(url: str):
        if url.endswith("/health"):
            return 200, {"status": "ok"}
        if url.endswith("/metrics/json"):
            return 500, None
        return 200, {}

    def mock_text(url: str):
        return 500, ""

    verdict = run_smoke_checks(
        backend_url="http://mocked-backend:8000",
        json_getter=mock_json,
        text_getter=mock_text,
    )

    assert verdict["all_passed"] is False
    assert any(not r["passed"] and r["check"] == "prometheus_metrics" for r in verdict["results"])
