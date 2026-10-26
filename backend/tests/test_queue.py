"""Tests de la cola ARQ (svc queue) y del fallback del endpoint.

Redis caido es un escenario PRIMARIO del MVP (demo sin infra): si el enqueue
falla, el endpoint cae a BackgroundTasks y el contrato publico no cambia. Aca
se prueba con `settings.redis_url` apuntando a un puerto cerrado.
"""

from __future__ import annotations

import asyncio
import dataclasses
from typing import Any

import pytest

import services.queue as queue_module
from config import settings
from services.queue import enqueue_vton_job


def _set_redis_url(monkeypatch: pytest.MonkeyPatch, url: str) -> None:
    monkeypatch.setattr(queue_module, "settings", dataclasses.replace(settings, redis_url=url))


def test_enqueue_false_cuando_redis_caido(monkeypatch: pytest.MonkeyPatch) -> None:
    """Puerto cerrado: enqueue devuelve False rapido (sin colgarse)."""
    # 6399 en localhost no tiene nada escuchando en el entorno de test
    _set_redis_url(monkeypatch, "redis://localhost:6399/0")
    ok = asyncio.run(enqueue_vton_job("job-test", "humans/x.jpg"))
    assert ok is False


def test_enqueue_true_con_pool_falso(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pool contra Redis OK: encola el job de arq y responde True."""

    class _FakePool:
        def __init__(self) -> None:
            self.jobs: list[tuple] = []

        async def enqueue_job(self, nombre: str, *args: Any) -> None:
            self.jobs.append((nombre, *args))

        async def close(self) -> None:
            pass

    fake = _FakePool()

    async def _fake_pool(*args: Any, **kwargs: Any) -> _FakePool:
        return fake

    monkeypatch.setattr(queue_module, "create_pool", _fake_pool)

    ok = asyncio.run(enqueue_vton_job("job-42", "humans/a.jpg"))
    assert ok is True
    assert fake.jobs == [("run_vton_job", "job-42", "humans/a.jpg")]


def test_stage_mapping_cubre_todos_los_stages() -> None:
    """El spec 4.1.8 no deja stages sin derivar a un status del contrato."""
    from domain.enums import STAGE_TO_STATUS, VtonStage

    assert set(STAGE_TO_STATUS) == {s.value for s in VtonStage}
    # los dos finales derivan a su mismo status publico
    assert STAGE_TO_STATUS["completed"] == "completed"
    assert STAGE_TO_STATUS["failed"] == "failed"
