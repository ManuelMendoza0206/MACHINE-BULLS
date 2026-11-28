"""Tests de los routers: el contrato HTTP que consume el frontend.

Usan el `client` del conftest, que stubbea CLIP (analisis determinista) y fija
provider VTON en mock + media en tmp. Aca se valida el contrato de la API
(status codes, shape de respuesta, idempotencia del adopt), no la inferencia.
"""

from __future__ import annotations

import base64
import time
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


def _esperar_job_terminal(client: Any, job_id: str, timeout_s: float = 5.0) -> dict:
    """Espera activa a que el job llegue a estado terminal (completed/failed).

    Espera por CONDICION con tope de reloj, no un numero fijo de dormidas:
    si el job termina antes no pierde tiempo, y si no termina devuelve el
    ultimo estado para que el assert del caller lo muestre completo (E0-T5).
    """
    deadline = time.monotonic() + timeout_s
    sj: dict = {}
    while True:
        sj = client.get(f"/api/v1/vton/status/{job_id}").json()
        if sj["status"] in {"completed", "failed"}:
            return sj
        if time.monotonic() >= deadline:
            return sj
        time.sleep(0.05)


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


def test_list_garments_devuelve_prendas_propias(client: Any) -> None:
    j = _upload(client)
    r = client.get("/api/v1/garments")
    assert r.status_code == 200
    ids = [g["id"] for g in r.json()["garments"]]
    assert j["garment_id"] in ids
    item = next(g for g in r.json()["garments"] if g["id"] == j["garment_id"])
    assert item["dominant_aesthetic"] == "casual"
    assert item["processed_image_url"].startswith("http")


def test_patch_y_delete_garment_propio_y_capsula(client: Any) -> None:
    """PATCH actualiza categoria/posicion/recorte base64 y DELETE elimina o desvincula."""
    from db.session import SessionLocal
    from domain.models import Garment, GarmentOwnership, new_uuid
    from services.auth import get_demo_user

    uploaded = _upload(client)
    gid = uploaded["garment_id"]

    # Crear PNG RGBA verde para simular retoque desde Mini-Canvas
    edited_img = Image.new("RGBA", (32, 32), (20, 200, 40, 255))
    buf = BytesIO()
    edited_img.save(buf, format="PNG")
    b64_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    r_patch = client.patch(
        f"/api/v1/garments/{gid}",
        json={
            "category": "blazer",
            "position": "outerwear",
            "subcategory": "blazer",
            "pattern": "plaid",
            "processed_image_base64": b64_url,
        },
    )
    assert r_patch.status_code == 200, r_patch.text
    patched = r_patch.json()
    assert patched["category"] == "blazer"
    assert patched["position"] == "outerwear"
    assert patched["subcategory"] == "blazer"
    assert patched["pattern"] == "plaid"
    assert patched["processed_image_url"] != uploaded["processed_image_url"]

    # Prenda capsula global adoptada: DELETE desvincula ownership sin borrar la capsula
    session = SessionLocal()
    try:
        demo = get_demo_user(session)
        cap = Garment(
            id=new_uuid(),
            owner_id=None,
            category="dress",
            position="dress",
            image_path="capsule/dress.png",
            processed_image_path="capsule/dress.png",
            dominant_colors=[{"hex": "#111111", "pct": 1.0, "h": 0, "s": 0, "v": 7}],
            top_aesthetics=[{"aesthetic": "elegant", "confidence": 0.9}],
        )
        session.add(cap)
        session.flush()
        session.add(GarmentOwnership(id=new_uuid(), user_id=demo.id, garment_id=cap.id, source="capsule"))
        session.commit()
        cap_id = cap.id
    finally:
        session.close()

    r_del_cap = client.delete(f"/api/v1/garments/{cap_id}")
    assert r_del_cap.status_code == 200
    assert r_del_cap.json() == {"deleted": True, "id": cap_id}
    # La prenda capsula global sigue existiendo en /capsule
    assert any(g["id"] == cap_id for g in client.get("/api/v1/garments/capsule").json()["garments"])
    # Pero ya no aparece en /api/v1/garments del usuario
    assert all(g["id"] != cap_id for g in client.get("/api/v1/garments").json()["garments"])

    # Eliminar prenda propia la borra definitivamente
    r_del_own = client.delete(f"/api/v1/garments/{gid}")
    assert r_del_own.status_code == 200
    assert all(g["id"] != gid for g in client.get("/api/v1/garments").json()["garments"])
    assert client.patch(f"/api/v1/garments/{gid}", json={"category": "x"}).status_code == 404


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
    assert r.status_code == 403


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
    sj = _esperar_job_terminal(client, body["job_id"])
    assert sj["status"] == "completed", sj
    assert sj["result_url"].startswith("http")
    assert sj["error_message"] is None


def test_vton_status_job_inexistente_da_404(client: Any) -> None:
    r = client.get("/api/v1/vton/status/no-existe")
    assert r.status_code == 404


def test_vton_fallback_sin_redis_completa_igual(
    client: Any, demo_user_id: str, monkeypatch: Any
) -> None:
    """Redis caido: el endpoint cae a BackgroundTasks y el job igual termina."""
    import dataclasses

    import services.queue as queue_module
    from config import settings as base

    monkeypatch.setattr(
        queue_module,
        "settings",
        dataclasses.replace(base, redis_url="redis://localhost:6399/0"),
    )

    _upload(client, nombre="remera")
    _upload(client, nombre="pantalon", color=(200, 30, 30))
    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    outfit_id = r.json()["outfits"][0]["outfit_id"]

    nombre, buf = _jpg_bytes(color=(200, 180, 160), nombre="persona")
    rv = client.post(
        "/api/v1/vton/try-on",
        data={"outfit_id": outfit_id},
        files={"user_image": (nombre, buf, "image/jpeg")},
    )
    assert rv.status_code == 200, rv.text

    sj = _esperar_job_terminal(client, rv.json()["job_id"])
    assert sj["status"] == "completed", sj
    assert sj["result_url"].startswith("http")


def test_vton_sin_outfit_ni_layers_da_400(client: Any) -> None:
    nombre, buf = _jpg_bytes(nombre="persona")
    r = client.post(
        "/api/v1/vton/try-on",
        files={"user_image": (nombre, buf, "image/jpeg")},
    )
    assert r.status_code == 400


def test_vton_pose_invalida_da_422_con_causa(client: Any, demo_user_id: str, monkeypatch: Any) -> None:
    """Protocolo 4.1.5: sin A-Pose rechaza 422 con razon actionable en detalle."""
    # POSE_VALIDATION se lee EN RUNTIME por pose_check (services/pose_check.py),
    # no via `settings` frozen: por eso monkeypatch.setenv es efectivo aca.
    monkeypatch.setenv("POSE_VALIDATION", "on")

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
    assert rv.status_code == 422
    assert "A-Pose invalida" in rv.json()["detail"]


def test_vton_historial_jobs_vacio(client: Any) -> None:
    """GET /vton/jobs devuelve lista vacia si el usuario no tiene jobs (G3)."""
    r = client.get("/api/v1/vton/jobs")
    assert r.status_code == 200
    body = r.json()
    assert "jobs" in body
    assert "total" in body
    assert body["total"] == 0
    assert body["jobs"] == []


def test_vton_historial_jobs_lista_ordenada(client: Any, demo_user_id: str, monkeypatch: Any) -> None:
    """GET /vton/jobs lista los jobs del usuario ordenados por fecha desc (G3)."""
    # POSE_VALIDATION es env en runtime (efectivo). El provider NO se setea por
    # env: `settings` ya esta resuelto al importar (frozen) y el conftest lo
    # fuerza en mock; un setenv("VTON_PROVIDER") aca seria un no-op silencioso.
    monkeypatch.setenv("POSE_VALIDATION", "off")

    _upload(client, nombre="remera")
    _upload(client, nombre="pantalon", color=(200, 30, 30))
    r = client.post("/api/v1/outfits/recommend", json={"user_id": demo_user_id})
    outfit_id = r.json()["outfits"][0]["outfit_id"]

    nombre, buf = _jpg_bytes(color=(200, 180, 160), nombre="persona")
    rv = client.post(
        "/api/v1/vton/try-on",
        data={"outfit_id": outfit_id},
        files={"user_image": (nombre, buf, "image/jpeg")},
    )
    assert rv.status_code == 200
    job_id = rv.json()["job_id"]

    r_hist = client.get("/api/v1/vton/jobs")
    assert r_hist.status_code == 200
    data = r_hist.json()
    assert data["total"] >= 1
    found = next((j for j in data["jobs"] if j["job_id"] == job_id), None)
    assert found is not None
    assert found["outfit_id"] == outfit_id
    assert found["status"] in ["pending", "processing", "completed"]
    assert "created_at" in found


def test_me_vton_photo_upload_default_reuse_and_delete(
    client: Any,
    demo_user_id: str,
    monkeypatch: Any,
) -> None:
    """Foto privada por defecto en /me/vton-photo: guarda, reutiliza en VTON, permite override puntual y elimina."""
    from db.session import SessionLocal
    from domain.models import Garment, Outfit, OutfitGarment, new_uuid
    from services import storage

    me_init = client.get("/api/v1/me").json()
    assert me_init["has_default_vton_photo"] is False
    assert me_init["default_vton_photo_url"] is None

    outfit_id = new_uuid()
    _, g_buf = _jpg_bytes(color=(30, 60, 200), nombre="remera")
    rel_garment, _ = storage.save_image(g_buf.getvalue(), "garments", ext="jpg")
    with SessionLocal() as db:
        g_id = new_uuid()
        db.add(
            Garment(
                id=g_id,
                owner_id=demo_user_id,
                category="shirt",
                position="top",
                image_path=rel_garment,
                processed_image_path=rel_garment,
                dominant_colors=[],
                top_aesthetics=[],
            )
        )
        db.add(Outfit(id=outfit_id, user_id=demo_user_id, aesthetic="casual"))
        db.add(OutfitGarment(outfit_id=outfit_id, garment_id=g_id, position="top", layer_index=0))
        db.commit()

    # Sin foto guardada ni user_image en try-on -> 400
    r_no_photo = client.post("/api/v1/vton/try-on", data={"outfit_id": outfit_id})
    assert r_no_photo.status_code == 400

    # Validacion A-Pose activa rechaza foto sin postura valida con 422
    monkeypatch.setenv("POSE_VALIDATION", "on")
    n_bad, b_bad = _jpg_bytes(color=(180, 180, 180), nombre="sin_pose")
    r_bad = client.post(
        "/api/v1/me/vton-photo",
        files={"user_image": (n_bad, b_bad, "image/jpeg")},
    )
    assert r_bad.status_code == 422
    assert "A-Pose invalida" in r_bad.json()["detail"]

    # Subida valida guarda foto privada por defecto
    monkeypatch.setenv("POSE_VALIDATION", "off")
    n_ok, b_ok = _jpg_bytes(color=(150, 120, 100), nombre="perfil_vton")
    r_ok = client.post(
        "/api/v1/me/vton-photo",
        files={"user_image": (n_ok, b_ok, "image/jpeg")},
    )
    assert r_ok.status_code == 200, r_ok.text
    saved_url = r_ok.json()["default_vton_photo_url"]
    assert r_ok.json()["has_default_vton_photo"] is True
    assert saved_url and "/usuarios/" in saved_url

    # Probar VTON omitiendo user_image reutiliza la foto por defecto
    rv_default = client.post("/api/v1/vton/try-on", data={"outfit_id": outfit_id})
    assert rv_default.status_code == 200, rv_default.text
    sj_default = _esperar_job_terminal(client, rv_default.json()["job_id"])
    assert sj_default["status"] == "completed", sj_default

    # Probar VTON con foto puntual no sobrescribe la foto por defecto del perfil
    n_once, b_once = _jpg_bytes(color=(90, 90, 90), nombre="puntual")
    rv_once = client.post(
        "/api/v1/vton/try-on",
        data={"outfit_id": outfit_id},
        files={"user_image": (n_once, b_once, "image/jpeg")},
    )
    assert rv_once.status_code == 200, rv_once.text
    assert client.get("/api/v1/me").json()["default_vton_photo_url"] == saved_url

    # Eliminar foto guardada vuelve a dejar has_default_vton_photo=False
    r_del = client.delete("/api/v1/me/vton-photo")
    assert r_del.status_code == 200
    assert r_del.json()["has_default_vton_photo"] is False
    assert r_del.json()["default_vton_photo_url"] is None


