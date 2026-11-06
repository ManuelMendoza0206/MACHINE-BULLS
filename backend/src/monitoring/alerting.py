"""Sistema de alertas y monitoreo SRE (86e302a61).

Detecta brechas de Service Level Objectives (SLOs) y notifica vía Sentry y logs
estructurados replicando la regla de bloqueo crítico de team_charter.md.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# Umbrales SLO formales en segundos (definidos en docs/sre/slos.md)
SLO_THRESHOLDS: dict[str, float] = {
    "/api/v1/vton/try-on": 15.0,
    "/api/v1/recommend": 0.500,
    "/api/v1/garments/upload": 2.500,
}

_recent_alerts: list[dict[str, Any]] = []


def trigger_slo_alert(
    endpoint: str,
    metric: str,
    observed_value: float,
    threshold: float,
    severity: str = "P2",
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Emite una alerta formal de degradación o incumplimiento de SLO."""
    alert_payload = {
        "event": "SLO_BREACH_ALERT",
        "severity": severity,
        "endpoint": endpoint,
        "metric": metric,
        "observed_value": round(observed_value, 4),
        "target_threshold": threshold,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "details": details or {},
    }

    # Registro en log estructurado de auditoría
    logger.critical("SLO_BREACH_ALERT [%s]: %s", severity, json.dumps(alert_payload))

    # Envío a Sentry si está instalado y configurado
    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            scope.set_tag("slo_breach", "true")
            scope.set_tag("endpoint", endpoint)
            scope.set_tag("severity", severity)
            scope.set_extra("slo_details", alert_payload)
            sentry_sdk.capture_message(
                f"SLO Breach en {endpoint}: {metric}={observed_value:.3f}s (umbral: {threshold:.3f}s)",
                level="error" if severity in ("P1", "P2") else "warning",
            )
    except Exception:
        # Si Sentry no está configurado, el log estructurado garantiza la trazabilidad
        pass

    _recent_alerts.append(alert_payload)
    if len(_recent_alerts) > 100:
        _recent_alerts.pop(0)

    return alert_payload


def check_latency_slo(endpoint: str, duration_s: float) -> dict[str, Any] | None:
    """Verifica si la duración de un request superó el umbral SLO para su endpoint."""
    for pattern, threshold in SLO_THRESHOLDS.items():
        if pattern in endpoint:
            if duration_s > threshold:
                severity = "P1" if (duration_s > threshold * 1.5) else "P2"
                return trigger_slo_alert(
                    endpoint=endpoint,
                    metric="latency_seconds",
                    observed_value=duration_s,
                    threshold=threshold,
                    severity=severity,
                )
            break
    return None


def get_recent_alerts() -> list[dict[str, Any]]:
    """Devuelve las alertas recientes registradas en memoria."""
    return list(_recent_alerts)


def clear_alerts() -> None:
    """Limpia el buffer de alertas (útil para tests)."""
    _recent_alerts.clear()
