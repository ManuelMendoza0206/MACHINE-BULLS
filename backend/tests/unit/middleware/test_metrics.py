"""Pruebas unitarias para middleware de métricas y alertas SRE (86e302a5f, 86e302a61)."""

import pytest

from middleware.metrics import MetricsCollector
from monitoring.alerting import clear_alerts, get_recent_alerts, trigger_slo_alert


@pytest.fixture(autouse=True)
def clean_state():
    MetricsCollector.reset()
    clear_alerts()
    yield
    MetricsCollector.reset()
    clear_alerts()


def test_metrics_collector_records_requests_and_computes_percentiles():
    # Registra 100 requests con latencias crecientes de 1ms a 100ms
    for i in range(1, 101):
        MetricsCollector.record_request(
            method="POST",
            path="/api/v1/recommend",
            status_code=200,
            duration_s=i / 1000.0,
        )

    summary = MetricsCollector.get_summary()
    assert "/api/v1/recommend" in summary["latencies"]
    lat = summary["latencies"]["/api/v1/recommend"]
    assert lat["count"] == 100
    assert 49.0 <= lat["p50_ms"] <= 51.0
    assert 94.0 <= lat["p95_ms"] <= 96.0
    assert 98.0 <= lat["p99_ms"] <= 100.0


def test_metrics_path_normalization_replaces_uuids():
    uuid_path = "/api/v1/outfits/8c7f8b1a-1234-4567-8901-abcdef123456"
    normalized = MetricsCollector._normalize_path(uuid_path)
    assert normalized == "/api/v1/outfits/{id}"


def test_metrics_to_prometheus_format():
    MetricsCollector.record_request("GET", "/health", 200, 0.005)
    prom_text = MetricsCollector.to_prometheus_format()

    assert "# HELP http_requests_total" in prom_text
    assert 'http_requests_total{method="GET",path="/health",status="200"} 1' in prom_text
    assert "http_request_duration_seconds" in prom_text


def test_slo_alert_triggered_when_latency_exceeds_threshold():
    # /api/v1/recommend tiene umbral de 0.500s. Enviamos 0.850s
    MetricsCollector.record_request("POST", "/api/v1/recommend", 200, 0.850)

    alerts = get_recent_alerts()
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["event"] == "SLO_BREACH_ALERT"
    assert alert["endpoint"] == "/api/v1/recommend"
    assert alert["observed_value"] == 0.85
    assert alert["target_threshold"] == 0.500


def test_metrics_endpoints_accessible_via_test_client(client):
    # Genera algo de tráfico
    client.get("/health")

    # Endpoint Prometheus
    resp_prom = client.get("/metrics")
    assert resp_prom.status_code == 200
    assert "http_requests_total" in resp_prom.text

    # Endpoint JSON
    resp_json = client.get("/metrics/json")
    assert resp_json.status_code == 200
    data = resp_json.json()
    assert "requests" in data
    assert "latencies" in data
