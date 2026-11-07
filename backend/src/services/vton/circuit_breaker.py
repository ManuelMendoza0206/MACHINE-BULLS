"""Circuit Breaker y Backoff Exponencial para el pipeline VTON (86e3122dy, 86e3122dx).

Protege al sistema y al usuario ante saturación o indisponibilidad de proveedores externos
(Replicate, CatVTON, RunPod), evitando desperdicio de tiempo y llamadas HTTP cuando el
servicio upstream está caído.

Especificación: openspec/specs/backend/vton-pipeline/spec.md
"""

from __future__ import annotations

import enum
import logging
import time
from collections.abc import Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(str, enum.Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerOpenError(RuntimeError):
    """Lanzada cuando se intenta ejecutar una llamada con el Circuit Breaker abierto."""

    def __init__(self, message: str = "Circuit breaker abierto: el servicio upstream está degradado", retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class CircuitBreaker:
    """Implementa patrón Circuit Breaker con estados CLOSED, OPEN y HALF_OPEN.

    - Abre tras N fallos consecutivos (failure_threshold, por defecto 3).
    - Permanece abierto durante recovery_timeout (por defecto 30 segundos).
    - Tras el timeout pasa a HALF_OPEN para probar un intento de recuperación.
    - Un éxito en HALF_OPEN o CLOSED resetea el contador a 0 y cierra el circuito.
    - Un fallo en HALF_OPEN reabre el circuito inmediatamente.
    """

    def __init__(
        self,
        name: str = "vton_provider",
        failure_threshold: int = 3,
        recovery_timeout: float = 30.0,
        half_open_max_trials: int = 1,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self.name = name
        self.failure_threshold = max(1, failure_threshold)
        self.recovery_timeout = max(0.1, recovery_timeout)
        self.half_open_max_trials = max(1, half_open_max_trials)
        self._clock = clock

        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._last_failure_time = 0.0
        self._half_open_trials = 0

    @property
    def state(self) -> CircuitState:
        # Evalúa posible transición por tiempo de OPEN a HALF_OPEN
        if self._state == CircuitState.OPEN:
            elapsed = self._clock() - self._last_failure_time
            if elapsed >= self.recovery_timeout:
                logger.info(
                    "CircuitBreaker [%s]: timeout de recuperación (%.1fs) cumplido -> HALF_OPEN",
                    self.name,
                    elapsed,
                )
                self._state = CircuitState.HALF_OPEN
                self._half_open_trials = 0
        return self._state

    @property
    def consecutive_failures(self) -> int:
        return self._consecutive_failures

    def is_open(self) -> bool:
        """Determina si las llamadas están bloqueadas por el circuito."""
        current = self.state
        if current == CircuitState.OPEN:
            return True
        if current == CircuitState.HALF_OPEN:
            return self._half_open_trials >= self.half_open_max_trials
        return False

    def check_call(self) -> None:
        """Verifica si la llamada puede proceder o lanza CircuitBreakerOpenError."""
        if self.is_open():
            retry_after = max(0.0, self.recovery_timeout - (self._clock() - self._last_failure_time))
            raise CircuitBreakerOpenError(
                f"Circuit breaker [{self.name}] abierto. Reintente en {retry_after:.1f}s",
                retry_after=retry_after,
            )
        if self.state == CircuitState.HALF_OPEN:
            self._half_open_trials += 1

    def record_success(self) -> None:
        """Registra una operación exitosa y resetea el circuito a CLOSED."""
        if self._state != CircuitState.CLOSED:
            logger.info("CircuitBreaker [%s]: éxito recibido -> circuito restablecido a CLOSED", self.name)
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._half_open_trials = 0

    def record_failure(self, error: Exception | None = None) -> None:
        """Registra un fallo en la llamada. Abre el circuito si alcanza el umbral."""
        now = self._clock()
        self._last_failure_time = now
        self._consecutive_failures += 1

        logger.warning(
            "CircuitBreaker [%s]: fallo #%d (umbral: %d, error: %s)",
            self.name,
            self._consecutive_failures,
            self.failure_threshold,
            error,
        )

        if self._state == CircuitState.HALF_OPEN:
            logger.error(
                "CircuitBreaker [%s]: fallo durante prueba HALF_OPEN -> reapertura a OPEN",
                self.name,
            )
            self._state = CircuitState.OPEN
        elif self._consecutive_failures >= self.failure_threshold:
            logger.error(
                "CircuitBreaker [%s]: alcanzado umbral de %d fallos consecutivos -> OPEN",
                self.name,
                self.failure_threshold,
            )
            self._state = CircuitState.OPEN

    def reset(self) -> None:
        """Restablece manualmente el circuito a estado inicial."""
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._last_failure_time = 0.0
        self._half_open_trials = 0


def retry_with_backoff(  # noqa: UP047
    operation: Callable[[], T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    factor: float = 2.0,
    sleep_fn: Callable[[float], None] = time.sleep,
    retryable_exceptions: tuple[type[Exception], ...] = (Exception,),
    on_retry: Callable[[int, Exception, float], None] | None = None,
) -> T:
    """Ejecuta una operación con reintentos y backoff exponencial (86e3122dx).

    - Máximo 3 reintentos por defecto.
    - Delays crecientes: base_delay * factor^(attempt - 1) (ej: 1s, 2s, 4s).
    - Permite inyectar `sleep_fn` para verificación con fake timers sin latencia real.
    """
    attempt = 0
    while True:
        try:
            return operation()
        except retryable_exceptions as exc:
            attempt += 1
            if attempt > max_retries:
                logger.error("Agotados %d reintentos con backoff. Último error: %s", max_retries, exc)
                raise

            delay = base_delay * (factor ** (attempt - 1))
            logger.warning(
                "Reintento %d/%d tras %.2fs debido a: %s",
                attempt,
                max_retries,
                delay,
                exc,
            )
            if on_retry:
                on_retry(attempt, exc, delay)
            sleep_fn(delay)


_circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(name: str = "vton_provider") -> CircuitBreaker:
    """Devuelve la instancia singleton de CircuitBreaker para el nombre dado."""
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name=name)
    return _circuit_breakers[name]


def reset_circuit_breakers() -> None:
    """Limpia el registro de circuit breakers (usado principalmente en testing)."""
    _circuit_breakers.clear()
