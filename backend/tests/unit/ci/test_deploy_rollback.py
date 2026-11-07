"""Unit tests for scripts/deploy/deploy_manager.py"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.deploy.deploy_manager import (
    deploy_with_rollback,
    execute_rollback,
    wait_for_healthy,
)


def test_wait_for_healthy_immediate_success():
    calls = []

    def mock_checker(url: str) -> bool:
        calls.append(url)
        return True

    slept = []
    healthy = wait_for_healthy(
        "http://test/health",
        max_retries=3,
        base_backoff_sec=0.1,
        health_checker=mock_checker,
        sleeper=lambda s: slept.append(s),
    )
    assert healthy is True
    assert len(calls) == 1
    assert len(slept) == 0


def test_wait_for_healthy_retry_and_succeed():
    calls = []

    def mock_checker(url: str) -> bool:
        calls.append(url)
        return len(calls) >= 3  # Fails twice, succeeds 3rd time

    slept = []
    healthy = wait_for_healthy(
        "http://test/health",
        max_retries=5,
        base_backoff_sec=1.0,
        health_checker=mock_checker,
        sleeper=lambda s: slept.append(s),
    )
    assert healthy is True
    assert len(calls) == 3
    assert slept == [1.0, 2.0]


def test_wait_for_healthy_exhausted_retries():
    calls = []

    def mock_checker(url: str) -> bool:
        calls.append(url)
        return False

    slept = []
    healthy = wait_for_healthy(
        "http://test/health",
        max_retries=3,
        base_backoff_sec=0.5,
        health_checker=mock_checker,
        sleeper=lambda s: slept.append(s),
    )
    assert healthy is False
    assert len(calls) == 3
    assert slept == [0.5, 1.0]


def test_execute_rollback_success():
    commands_run = []

    def mock_runner(cmd: str) -> int:
        commands_run.append(cmd)
        return 0

    ok = execute_rollback("v1.0.0", rollback_command="git checkout v1.0.0", runner=mock_runner)
    assert ok is True
    assert commands_run == ["git checkout v1.0.0"]


def test_execute_rollback_failure():
    def mock_runner(cmd: str) -> int:
        return 1

    ok = execute_rollback("v1.0.0", runner=mock_runner)
    assert ok is False


def test_deploy_with_rollback_happy_path(tmp_path: Path):
    audit_file = tmp_path / "audit.json"

    result = deploy_with_rollback(
        target_env="staging",
        new_version="v2.0.0",
        previous_version="v1.0.0",
        health_url="http://test/health",
        deploy_cmd="echo deploy",
        health_checker=lambda url: True,
        runner=lambda cmd: 0,
        audit_path=audit_file,
    )

    assert result["status"] == "DEPLOYED"
    assert result["health_verified"] is True
    assert result["rollback_executed"] is False
    assert audit_file.exists()


def test_deploy_with_rollback_on_health_failure(tmp_path: Path):
    audit_file = tmp_path / "audit.json"
    slept = []

    result = deploy_with_rollback(
        target_env="production",
        new_version="v2.0.0-bad",
        previous_version="v1.9.0-stable",
        health_url="http://test/health",
        deploy_cmd="echo deploy",
        rollback_cmd="echo rollback",
        max_retries=2,
        base_backoff_sec=0.01,
        health_checker=lambda url: False,
        sleeper=lambda s: slept.append(s),
        runner=lambda cmd: 0,
        audit_path=audit_file,
    )

    assert result["status"] == "ROLLED_BACK"
    assert result["health_verified"] is False
    assert result["rollback_executed"] is True
    assert result["rollback_successful"] is True
    assert result["active_version"] == "v1.9.0-stable"
    assert audit_file.exists()
