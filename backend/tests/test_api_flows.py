"""Tests de los routers: el contrato HTTP que consume el frontend.

Usan el `client` del conftest, que stubbea CLIP (analisis determinista) y fija
provider VTON en mock + media en tmp. Aca se valida el contrato de la API
(status codes, shape de respuesta, idempotencia del adopt), no la inferencia.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image


def _jpg_bytes(color: tuple[int, int, int] = (30, 60, 200), nombre: str = "prenda") -> tuple[str, BytesIO]:
    """Imagen JPEG en memoria. `nombre` se usa por el stub para decidir posicion."""
    img = Image.new("RGB", (64, 64), color)
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    buf.name = f"{nombre}.jpg"
    return buf.name, buf


def _upload(
    client: Any,
    nombre: str = "prenda",
    color: tuple[int, int, int] = (30, 60, 200),
) -> dict:
    nombre_archivo, buf = _jpg_bytes(color=color, nombre=nombre)
    r = client.post(
        "/api/v1/garments/upload",
        files={"file": (nombre_archivo, buf, "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_health(client: Any) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_me_devuelve_identidad_del_mvp(client: Any) -> None:
    """/me expone el user_id que el backend usa para persistir (MVP sin JWT)."""
    r = client.get("/api/v1/me")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"]  # uuid no vacio
    assert "@" in body["email"]
    # Id estable: dos llamadas dan el mismo usuario.
    r2 = client.get("/api/v1/me")
    assert r2.json()["user_id"] == body["user_id"]


def test_upload_devuelve_contrato_zod(client: Any) -> None:
    """La respuesta valida cada campo del `GarmentUploadResponse` del frontend."""
    j = _upload(client)
    assert j["garment_id"]
    assert j["category"] in {"top", "bottom", "dress", "outwear", "shoes", "bag"}
    assert j["dominant_colors"]  # min_length=1
    for c in j["dominant_colors"]:
        assert 0 <= c["h"] <= 360
        assert 0 <= c["s"] <= 100
        assert 0 <= c["v"] <= 100
        assert c["hex"].startswith("#") and len(c["hex"]) == 7
    assert j["top_aesthetics"][0]["aesthetic"]
    assert j["processed_image_url"].startswith("http")


def test_upload_archivo_vacio_da_400(client: Any) -> None:
    r = client.post(
        "/api/v1/garments/upload",
        files={"file": ("vacio.jpg", BytesIO(b""), "image/jpeg")},
    )
    assert r.status_code == 400


def test_upload_no_imagen_da_400(client: Any) -> None:
    r = client.post(
        "/api/v1/garments/upload",
        files={"file": ("basura.jpg", BytesIO(b"no soy imagen"), "image/jpeg")},
    )
    assert r.status_code == 400


def test_capsule_devuelve_los_subidos(client: Any) -> None:
    j = _upload(client)
    r = client.get("/api/v1/garments/capsule")
    assert r.status_code == 200
    ids = [g["id"] for g in r.json()["garments"]]
    assert j["garment_id"] in ids
    resumen = next(g for g in r.json()["garments"] if g["id"] == j["garment_id"])
    assert resumen["dominant_aesthetic"] == "casual"  # del stub
    assert resumen["processed_image_url"].startswith("http")


def test_adopt_es_idempotente_con_409(client: Any) -> None:
    """Upload ya crea ownership; adoptar de nuevo da 409 (G4)."""
    j = _upload(client)
    r1 = client.post(f"/api/v1/garments/capsule/{j['garment_id']}/adopt")
    assert r1.status_code == 409
    r2 = client.post(f"/api/v1/garments/capsule/{j['garment_id']}/adopt")
    assert r2.status_code == 409


def test_adopt_prenda_inexistente_da_404(client: Any) -> None:
    r = client.post("/api/v1/garments/capsule/no-existe/adopt")
    assert r.status_code == 404


def test_recommend_arma_outfit_y_persiste(client: Any, demo_user_id: str) -> None:
    """Uploads top+bottom+outerwear -> outfit con scores en [0,1].

    Colores segun la convencion del stub: azul=top, rojo=bottom,
    verde=outerwear.
    """
    _upload(client, nombre="remera")  # azul -> top
    _upload(client, nombre="pantalon", color=(200, 30, 30))  # rojo -> bottom
    _upload(client, nombre="chaqueta", color=(30, 200, 30))  # verde -> outerwear

    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    assert r.status_code == 200, r.text
    outfits = r.json()["outfits"]
    assert len(outfits) >= 1
    o = outfits[0]
    assert o["outfit_id"]
    assert o["aesthetic"]
    assert 0 <= o["chromatic_score"] <= 1
    assert 0 <= o["embedding_score"] <= 1
    posiciones = {g["position"] for g in o["garments"]}
    assert {"top", "bottom"} <= posiciones


def test_recommend_user_desconocido_da_404(client: Any) -> None:
    r = client.post("/api/v1/outfits/recommend", json={"user_id": "no-existe"})
    assert r.status_code == 404


def test_recommend_sin_prendas_da_400(client: Any, demo_user_id: str) -> None:
    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    assert r.status_code == 400


def test_get_outfit_por_id(client: Any, demo_user_id: str) -> None:
    """GET /outfits/{id} devuelve las mismas caps que recomendo el motor."""
    _upload(client, nombre="remera")  # azul -> top
    _upload(client, nombre="pantalon", color=(200, 30, 30))  # rojo -> bottom
    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    o = r.json()["outfits"][0]

    detail = client.get(f"/api/v1/outfits/{o['outfit_id']}")
    assert detail.status_code == 200
    d = detail.json()
    assert d["outfit_id"] == o["outfit_id"]
    assert d["aesthetic"] == o["aesthetic"]
    assert {g["position"] for g in d["garments"]} == {g["position"] for g in o["garments"]}


def test_get_outfit_inexistente_da_404(client: Any) -> None:
    assert client.get("/api/v1/outfits/no-existe").status_code == 404


def test_vton_flujo_completo_mock(client: Any, demo_user_id: str) -> None:
    """Try-on (mock provider) -> polling hasta completed con result_url."""
    import time

    _upload(client, nombre="remera")  # azul -> top
    _upload(client, nombre="pantalon", color=(200, 30, 30))  # rojo -> bottom
    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    outfit_id = r.json()["outfits"][0]["outfit_id"]

    nombre, buf = _jpg_bytes(color=(200, 180, 160), nombre="persona")
    rv = client.post(
        "/api/v1/vton/try-on",
        data={"outfit_id": outfit_id},
        files={"user_image": (nombre, buf, "image/jpeg")},
    )
    assert rv.status_code == 200, rv.text
    body = rv.json()
    assert body["status"] == "processing"
    assert body["estimated_time_seconds"] > 0

    # BackgroundTasks de Starlette corre el job sincronamente tras la respuesta;
    # el polling igual debe funcionar (el job ya esta completed).
    for _ in range(40):
        sj = client.get(f"/api/v1/vton/status/{body['job_id']}").json()
        if sj["status"] in {"completed", "failed"}:
            break
        time.sleep(0.05)
    assert sj["status"] == "completed", sj
    assert sj["result_url"].startswith("http")
    assert sj["error_message"] is None


def test_vton_status_job_inexistente_da_404(client: Any) -> None:
    r = client.get("/api/v1/vton/status/no-existe")
    assert r.status_code == 404


def test_vton_sin_outfit_ni_layers_da_400(client: Any) -> None:
    nombre, buf = _jpg_bytes(nombre="persona")
    r = client.post(
        "/api/v1/vton/try-on",
        files={"user_image": (nombre, buf, "image/jpeg")},
    )
    assert r.status_code == 400
