"""Pruebas de Rate Limiting y Exception Handlers de Dominio (api-gateway spec §2.2, §2.3)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from domain.exceptions import (
    DataValidationError,
    ModelInferenceError,
    ResourceNotFoundError,
)
from main import app
from middleware.rate_limit import RateLimitMiddleware, parse_rate_limit


def test_parse_rate_limit() -> None:
    count, window = parse_rate_limit("20/minute")
    assert count == 20
    assert window == 60.0

    count, window = parse_rate_limit("5/second")
    assert count == 5
    assert window == 1.0

    count, window = parse_rate_limit("100/hour")
    assert count == 100
    assert window == 3600.0


def test_rate_limit_blocks_after_threshold() -> None:
    test_app = FastAPI()
    test_app.add_middleware(
        RateLimitMiddleware,
        limits={"/test/mutation": "3/minute"},
    )

    @test_app.post("/test/mutation")
    def mutate() -> dict:
        return {"status": "ok"}

    @test_app.get("/test/read")
    def read() -> dict:
        return {"status": "ok"}

    client = TestClient(test_app)

    # Las primeras 3 deben ser exitosas (200)
    for _ in range(3):
        res = client.post("/test/mutation")
        assert res.status_code == 200
        assert "X-RateLimit-Remaining" in res.headers

    # La 4ta llamada excede el límite y devuelve 429
    res4 = client.post("/test/mutation")
    assert res4.status_code == 429
    data = res4.json()
    assert "detail" in data
    assert "excedido" in data["detail"].lower()
    assert "Retry-After" in res4.headers
    assert res4.headers["X-RateLimit-Remaining"] == "0"

    # Los endpoints GET no son afectados por el rate limit
    for _ in range(5):
        get_res = client.get("/test/read")
        assert get_res.status_code == 200


def test_domain_exception_handler() -> None:
    client = TestClient(app)

    # Verificar que el handler global maneja correctamente las excepciones de dominio
    @app.get("/test/raise-validation")
    def raise_validation():
        raise DataValidationError("Dato invalido")

    @app.get("/test/raise-not-found")
    def raise_not_found():
        raise ResourceNotFoundError("No encontrado")

    @app.get("/test/raise-inference")
    def raise_inference():
        raise ModelInferenceError("Error de inferencia")

    res_val = client.get("/test/raise-validation")
    assert res_val.status_code == 422
    assert res_val.json()["error"] == "DataValidationError"

    res_nf = client.get("/test/raise-not-found")
    assert res_nf.status_code == 404
    assert res_nf.json()["error"] == "ResourceNotFoundError"

    res_inf = client.get("/test/raise-inference")
    assert res_inf.status_code == 500
    assert res_inf.json()["error"] == "ModelInferenceError"
