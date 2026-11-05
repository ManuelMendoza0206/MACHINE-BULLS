"""Middleware de Rate Limiting para endpoints de mutacion costosa.

Implementa control por ventana deslizante en memoria (con soporte para IP o usuario autenticado),
devolviendo HTTP 429 con cabecera Retry-After y mensaje descriptivo cuando se excede la cuota.
Conforme a openspec/specs/backend/api-gateway/spec.md §2.3.
"""

from __future__ import annotations

import collections
import time
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


def parse_rate_limit(limit_str: str) -> tuple[int, float]:
    """Parsea formatos como '20/minute', '10/second', '100/hour' a (max_requests, window_seconds)."""
    parts = limit_str.split("/")
    if len(parts) != 2:
        raise ValueError(f"Formato de rate limit invalido: {limit_str}")
    count = int(parts[0])
    unit = parts[1].strip().lower()
    if unit in ("s", "sec", "second", "seconds", "segundo", "segundos"):
        window = 1.0
    elif unit in ("m", "min", "minute", "minutes", "minuto", "minutos"):
        window = 60.0
    elif unit in ("h", "hr", "hour", "hours", "hora", "horas"):
        window = 3600.0
    elif unit in ("d", "day", "days", "dia", "dias"):
        window = 86400.0
    else:
        raise ValueError(f"Unidad de tiempo desconocida en rate limit: {unit}")
    return count, window


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Aplica rate limiting por IP/token en endpoints de mutacion costosa configurados."""

    def __init__(self, app, limits: dict[str, str] | None = None) -> None:
        super().__init__(app)
        # Diccionario normalizado: {ruta: (max_requests, window_seconds)}
        self.limits: dict[str, tuple[int, float]] = {}
        if limits:
            for route, limit_str in limits.items():
                parsed = parse_rate_limit(limit_str)
                clean_route = route.rstrip("/")
                self.limits[clean_route] = parsed
                if not clean_route.startswith("/api/v1"):
                    self.limits[f"/api/v1{clean_route}"] = parsed

        # Historial de accesos: { (client_key, matched_route): deque([timestamp1, timestamp2, ...]) }
        self._history: dict[tuple[str, str], collections.deque[float]] = collections.defaultdict(
            collections.deque
        )

    def _get_client_identifier(self, request: Request) -> str:
        auth = request.headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            # Identificador basado en token de usuario
            return f"user:{auth[7:37]}"

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        client_host = request.client.host if request.client else "127.0.0.1"
        return f"ip:{client_host}"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Rate limit solo aplica a metodos de mutacion per spec
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)

        request_path = request.url.path.rstrip("/")
        matched_limit = None
        matched_route = None

        for route, limit in self.limits.items():
            if request_path == route or request_path.endswith(route):
                matched_limit = limit
                matched_route = route
                break

        if not matched_limit:
            return await call_next(request)

        max_reqs, window = matched_limit
        client_key = self._get_client_identifier(request)
        tracker_key = (client_key, matched_route)

        now = time.time()
        queue = self._history[tracker_key]

        # Purgar marcas de tiempo que quedaron fuera de la ventana
        cutoff = now - window
        while queue and queue[0] < cutoff:
            queue.popleft()

        if len(queue) >= max_reqs:
            oldest = queue[0]
            retry_after = max(1, int(window - (now - oldest)))
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Limite de solicitudes excedido para {matched_route}. "
                        f"Permitido maximo de {max_reqs} solicitudes por ventana de {int(window)}s. "
                        f"Por favor espere {retry_after}s antes de reintentar."
                    )
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_reqs),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + retry_after)),
                },
            )

        queue.append(now)
        response = await call_next(request)
        remaining = max(0, max_reqs - len(queue))
        response.headers["X-RateLimit-Limit"] = str(max_reqs)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
