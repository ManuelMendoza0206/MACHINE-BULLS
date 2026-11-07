"""Middleware de métricas Prometheus y latencia por endpoint (86e302a5f).

Registra contadores HTTP, histogramas de latencia y percentiles (p50, p95, p99)
con foco especial en endpoints críticos como /api/v1/vton/try-on y /api/v1/recommend.
"""

from __future__ import annotations

import math
import threading
import time
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from monitoring.alerting import check_latency_slo

metrics_router = APIRouter(tags=["Monitoring"])

_lock = threading.Lock()
_request_counts: dict[tuple[str, str, int], int] = defaultdict(int)
_endpoint_latencies: dict[str, list[float]] = defaultdict(list)
_MAX_LATENCY_SAMPLES = 2000


class MetricsCollector:
    """Recolector en memoria thread-safe de métricas de rendimiento y disponibilidad."""

    @classmethod
    def record_request(cls, method: str, path: str, status_code: int, duration_s: float) -> None:
        normalized_path = cls._normalize_path(path)
        with _lock:
            _request_counts[(method, normalized_path, status_code)] += 1
            latencies = _endpoint_latencies[normalized_path]
            latencies.append(duration_s)
            if len(latencies) > _MAX_LATENCY_SAMPLES:
                latencies.pop(0)

        # Chequeo y disparo de alertas SLO
        check_latency_slo(normalized_path, duration_s)

    @classmethod
    def _normalize_path(cls, path: str) -> str:
        """Normaliza rutas con identificadores UUID a patrones fijos para evitar explosión de cardinalidad."""
        partes = path.strip("/").split("/")
        normalizadas = []
        for parte in partes:
            # UUID o ID alfanumérico largo
            if len(parte) >= 16 or any(c.isdigit() for c in parte) and len(parte) >= 8:
                normalizadas.append("{id}")
            else:
                normalizadas.append(parte)
        return "/" + "/".join(normalizadas) if normalizadas else "/"

    @classmethod
    def get_percentile(cls, samples: list[float], percentile: float) -> float:
        if not samples:
            return 0.0
        sorted_samples = sorted(samples)
        k = (len(sorted_samples) - 1) * (percentile / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_samples[int(k)]
        d0 = sorted_samples[int(f)] * (c - k)
        d1 = sorted_samples[int(c)] * (k - f)
        return d0 + d1

    @classmethod
    def get_summary(cls) -> dict[str, Any]:
        with _lock:
            counts_copy = dict(_request_counts)
            latencies_copy = {k: list(v) for k, v in _endpoint_latencies.items()}

        endpoints_data = {}
        for path, latencies in latencies_copy.items():
            if not latencies:
                continue
            endpoints_data[path] = {
                "count": len(latencies),
                "p50_ms": round(cls.get_percentile(latencies, 50) * 1000, 2),
                "p90_ms": round(cls.get_percentile(latencies, 90) * 1000, 2),
                "p95_ms": round(cls.get_percentile(latencies, 95) * 1000, 2),
                "p99_ms": round(cls.get_percentile(latencies, 99) * 1000, 2),
                "max_ms": round(max(latencies) * 1000, 2),
            }

        return {
            "requests": [
                {"method": m, "path": p, "status": s, "count": c}
                for (m, p, s), c in counts_copy.items()
            ],
            "latencies": endpoints_data,
        }

    @classmethod
    def to_prometheus_format(cls) -> str:
        summary = cls.get_summary()
        lines = [
            "# HELP http_requests_total Contador total de solicitudes HTTP recibidas.",
            "# TYPE http_requests_total counter",
        ]
        for req in summary["requests"]:
            lines.append(
                f'http_requests_total{{method="{req["method"]}",path="{req["path"]}",status="{req["status"]}"}} {req["count"]}'
            )

        lines.extend([
            "",
            "# HELP http_request_duration_seconds Latencia de requests HTTP por percentil.",
            "# TYPE http_request_duration_seconds summary",
        ])
        for path, lat in summary["latencies"].items():
            lines.append(f'http_request_duration_seconds{{path="{path}",quantile="0.5"}} {lat["p50_ms"] / 1000.0:.4f}')
            lines.append(f'http_request_duration_seconds{{path="{path}",quantile="0.95"}} {lat["p95_ms"] / 1000.0:.4f}')
            lines.append(f'http_request_duration_seconds{{path="{path}",quantile="0.99"}} {lat["p99_ms"] / 1000.0:.4f}')
            lines.append(f'http_request_duration_seconds_count{{path="{path}"}} {lat["count"]}')

        return "\n".join(lines) + "\n"

    @classmethod
    def reset(cls) -> None:
        with _lock:
            _request_counts.clear()
            _endpoint_latencies.clear()


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware ASGI que computa latencias y códigos HTTP por petición."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Evitar registrar la propia llamada a /metrics para no ensuciar contadores
        if request.url.path in ("/metrics", "/metrics/json"):
            return await call_next(request)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration = time.perf_counter() - start
            MetricsCollector.record_request(request.method, request.url.path, response.status_code, duration)
            return response
        except Exception:
            duration = time.perf_counter() - start
            MetricsCollector.record_request(request.method, request.url.path, 500, duration)
            raise


@metrics_router.get("/metrics")
def get_prometheus_metrics() -> Response:
    """Devuelve métricas en formato estándar Prometheus (text/plain)."""
    return Response(
        content=MetricsCollector.to_prometheus_format(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


@metrics_router.get("/metrics/json")
def get_json_metrics() -> dict[str, Any]:
    """Devuelve métricas estructuradas para dashboards y APIs internas."""
    return MetricsCollector.get_summary()
