"""Pruebas unitarias para Circuit Breaker y Backoff Exponencial (86e3122dy, 86e3122dx)."""

import pytest

from services.vton.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    CircuitState,
    get_circuit_breaker,
    reset_circuit_breakers,
    retry_with_backoff,
)


class FakeClock:
    def __init__(self, start: float = 1000.0) -> None:
        self.current = start

    def __call__(self) -> float:
        return self.current

    def advance(self, seconds: float) -> None:
        self.current += seconds


def test_circuit_breaker_transitions_closed_to_open_after_threshold():
    clock = FakeClock()
    cb = CircuitBreaker(name="test_vton", failure_threshold=3, recovery_timeout=30.0, clock=clock)

    assert cb.state == CircuitState.CLOSED
    assert not cb.is_open()

    # Fallo 1
    cb.record_failure(RuntimeError("fail 1"))
    assert cb.state == CircuitState.CLOSED
    assert not cb.is_open()
    assert cb.consecutive_failures == 1

    # Fallo 2
    cb.record_failure(RuntimeError("fail 2"))
    assert cb.state == CircuitState.CLOSED
    assert not cb.is_open()
    assert cb.consecutive_failures == 2

    # Fallo 3 -> Abre circuito
    cb.record_failure(RuntimeError("fail 3"))
    assert cb.state == CircuitState.OPEN
    assert cb.is_open()

    # Intento con circuito abierto lanza excepción descriptiva
    with pytest.raises(CircuitBreakerOpenError) as exc_info:
        cb.check_call()
    assert "abierto" in str(exc_info.value).lower()


def test_circuit_breaker_transitions_open_to_half_open_and_recovers_on_success():
    clock = FakeClock()
    cb = CircuitBreaker(name="test_vton", failure_threshold=2, recovery_timeout=20.0, clock=clock)

    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.OPEN

    # Antes del timeout permanece abierto
    clock.advance(10.0)
    assert cb.state == CircuitState.OPEN
    assert cb.is_open()

    # Tras cumplir recovery_timeout pasa a HALF_OPEN
    clock.advance(10.5)
    assert cb.state == CircuitState.HALF_OPEN
    assert not cb.is_open()

    # Éxito en HALF_OPEN recupera a CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert not cb.is_open()
    assert cb.consecutive_failures == 0


def test_circuit_breaker_reopens_immediately_if_half_open_trial_fails():
    clock = FakeClock()
    cb = CircuitBreaker(name="test_vton", failure_threshold=2, recovery_timeout=15.0, clock=clock)

    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.OPEN

    clock.advance(16.0)
    assert cb.state == CircuitState.HALF_OPEN

    # Fallo en prueba HALF_OPEN vuelve a abrir inmediatamente
    cb.record_failure(RuntimeError("trial failed"))
    assert cb.state == CircuitState.OPEN
    assert cb.is_open()


def test_retry_with_backoff_succeeds_without_retries_on_first_try():
    call_count = 0
    delays = []

    def op():
        nonlocal call_count
        call_count += 1
        return "ok"

    res = retry_with_backoff(op, max_retries=3, sleep_fn=delays.append)
    assert res == "ok"
    assert call_count == 1
    assert delays == []


def test_retry_with_backoff_performs_exponential_retries_with_fake_timer():
    call_count = 0
    delays = []

    def op():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError(f"transient error attempt {call_count}")
        return "recovered"

    res = retry_with_backoff(
        op,
        max_retries=3,
        base_delay=1.0,
        factor=2.0,
        sleep_fn=delays.append,
    )
    assert res == "recovered"
    assert call_count == 3
    # Espera 1s tras fallo 1, 2s tras fallo 2
    assert delays == [1.0, 2.0]


def test_retry_with_backoff_exhausts_retries_and_raises():
    call_count = 0
    delays = []

    def op():
        nonlocal call_count
        call_count += 1
        raise TimeoutError("upstream timeout")

    with pytest.raises(TimeoutError):
        retry_with_backoff(
            op,
            max_retries=3,
            base_delay=0.5,
            factor=2.0,
            sleep_fn=delays.append,
        )
    assert call_count == 4  # 1 intento inicial + 3 reintentos
    assert delays == [0.5, 1.0, 2.0]


def test_reset_circuit_breakers():
    reset_circuit_breakers()
    cb = get_circuit_breaker("vton_mock")
    cb.record_failure()
    assert cb.consecutive_failures == 1

    reset_circuit_breakers()
    cb_nuevo = get_circuit_breaker("vton_mock")
    assert cb_nuevo.consecutive_failures == 0
