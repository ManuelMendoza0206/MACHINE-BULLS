"""Pruebas unitarias e integradas para Iteración 1:

1. Disponibilidad de prendas (máquina de estados: AVAILABLE, LAUNDRY, REPAIR, INACTIVE).
2. Outfit Remix (anclaje de prendas específicas y sustitución armónica).
3. Outfit Planner (agenda de vestimenta, confirmación de uso e impacto en lavandería).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from db.session import SessionLocal
from domain.enums import GarmentStatus, OwnershipSource
from domain.models import Garment, GarmentOwnership, Outfit, User, new_uuid
from main import app
from services.auth import get_demo_user
from services.recommender.engine import recommend_outfits, remix_outfit

client = TestClient(app)


def _seed_test_garments(session, user_id):
    """Crea prendas de prueba con ownership."""
    g_top = Garment(
        id=new_uuid(),
        owner_id=user_id,
        category="t-shirt",
        position="top",
        image_path="test/top.jpg",
        processed_image_path="test/top.png",
        dominant_colors=[{"hex": "#336699", "pct": 1.0, "h": 210, "s": 66.7, "v": 60.0}],
        top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
        status=GarmentStatus.AVAILABLE.value,
        is_candidate=False,
    )
    g_bottom = Garment(
        id=new_uuid(),
        owner_id=user_id,
        category="jeans",
        position="bottom",
        image_path="test/bottom.jpg",
        processed_image_path="test/bottom.png",
        dominant_colors=[{"hex": "#000000", "pct": 1.0, "h": 0, "s": 0.0, "v": 0.0}],
        top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
        status=GarmentStatus.AVAILABLE.value,
        is_candidate=False,
    )
    g_shoes = Garment(
        id=new_uuid(),
        owner_id=user_id,
        category="sneakers",
        position="footwear",
        image_path="test/shoes.jpg",
        processed_image_path="test/shoes.png",
        dominant_colors=[{"hex": "#FFFFFF", "pct": 1.0, "h": 0, "s": 0.0, "v": 100.0}],
        top_aesthetics=[{"aesthetic": "casual", "score": 0.9}],
        status=GarmentStatus.AVAILABLE.value,
        is_candidate=False,
    )
    session.add_all([g_top, g_bottom, g_shoes])
    session.add_all([
        GarmentOwnership(id=new_uuid(), user_id=user_id, garment_id=g_top.id, source=OwnershipSource.UPLOAD.value),
        GarmentOwnership(id=new_uuid(), user_id=user_id, garment_id=g_bottom.id, source=OwnershipSource.UPLOAD.value),
        GarmentOwnership(id=new_uuid(), user_id=user_id, garment_id=g_shoes.id, source=OwnershipSource.UPLOAD.value),
    ])
    session.commit()
    return g_top, g_bottom, g_shoes


def test_garment_status_and_recommender_filtering():
    """Verifica que una prenda en LAUNDRY sea excluida de las recomendaciones."""
    session = SessionLocal()
    try:
        user = get_demo_user(session)
        g_top, _g_bottom, _g_shoes = _seed_test_garments(session, user.id)

        # 1. Actualizar estado a LAUNDRY mediante PATCH
        patch_resp = client.patch(
            f"/api/v1/garments/{g_top.id}/status",
            json={"status": "LAUNDRY"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "LAUNDRY"

        # 2. Validar rechazo de estados no permitidos
        invalid_resp = client.patch(
            f"/api/v1/garments/{g_top.id}/status",
            json={"status": "DISCARDED_FOREVER"},
        )
        assert invalid_resp.status_code == 400

        # 3. Probar función de recomendación: no debe incluir prendas en LAUNDRY
        mock_garments = [
            {
                "id": "g-top-laundry",
                "position": "top",
                "colors": [{"h": 210, "s": 80, "v": 70}],
                "embedding": [0.1] * 128,
                "aesthetic": "casual",
                "status": "LAUNDRY",
            },
            {
                "id": "g-top-avail",
                "position": "top",
                "colors": [{"h": 210, "s": 80, "v": 70}],
                "embedding": [0.1] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
            {
                "id": "g-bottom-avail",
                "position": "bottom",
                "colors": [{"h": 0, "s": 0, "v": 20}],
                "embedding": [0.2] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
        ]

        outfits = recommend_outfits(mock_garments)
        assert len(outfits) > 0
        for outfit in outfits:
            outfit_garment_ids = [g["id"] for g in outfit["garments"]]
            assert "g-top-laundry" not in outfit_garment_ids
            assert "g-top-avail" in outfit_garment_ids

        # 4. Restaurar estado a AVAILABLE
        restore_resp = client.patch(
            f"/api/v1/garments/{g_top.id}/status",
            json={"status": "AVAILABLE"},
        )
        assert restore_resp.status_code == 200
        assert restore_resp.json()["status"] == "AVAILABLE"
    finally:
        session.close()


def test_outfit_remix_engine_and_endpoint():
    """Verifica que Outfit Remix conserve las prendas ancladas y varíe las restantes."""
    session = SessionLocal()
    try:
        user = get_demo_user(session)
        g_top, _g_bottom, _g_shoes = _seed_test_garments(session, user.id)

        mock_garments = [
            {
                "id": "top-favorite",
                "position": "top",
                "colors": [{"h": 220, "s": 80, "v": 80}],
                "embedding": [0.1] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
            {
                "id": "top-alternative",
                "position": "top",
                "colors": [{"h": 10, "s": 70, "v": 70}],
                "embedding": [0.15] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
            {
                "id": "bottom-jeans",
                "position": "bottom",
                "colors": [{"h": 210, "s": 50, "v": 50}],
                "embedding": [0.2] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
            {
                "id": "bottom-chinos",
                "position": "bottom",
                "colors": [{"h": 40, "s": 40, "v": 60}],
                "embedding": [0.25] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
            {
                "id": "shoes-sneakers",
                "position": "footwear",
                "colors": [{"h": 0, "s": 0, "v": 90}],
                "embedding": [0.05] * 128,
                "aesthetic": "casual",
                "status": "AVAILABLE",
            },
        ]

        # 1. Función de motor de remix: anclando 'top-favorite'
        remixed = remix_outfit(
            mock_garments,
            pinned_garment_ids=["top-favorite"],
            limit=5,
        )
        assert len(remixed) > 0
        for r in remixed:
            ids_en_outfit = [g["id"] for g in r["garments"]]
            assert "top-favorite" in ids_en_outfit
            assert "top-alternative" not in ids_en_outfit

        # 2. Endpoint POST /api/v1/outfits/remix
        resp = client.post(
            "/api/v1/outfits/remix",
            json={
                "user_id": user.id,
                "pinned_garment_ids": [g_top.id],
                "occasion": "casual",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "outfits" in data
        assert len(data["outfits"]) > 0
        for out in data["outfits"]:
            g_ids = [g["garment_id"] for g in out["garments"]]
            assert g_top.id in g_ids
    finally:
        session.close()


def test_outfit_planner_crud_and_confirmation():
    """Verifica el ciclo de vida del planificador: crear, listar, confirmar y enviar a lavandería."""
    session = SessionLocal()
    try:
        user = get_demo_user(session)
        g_top, g_bottom, _g_shoes = _seed_test_garments(session, user.id)
        garment_ids = [g_top.id, g_bottom.id]

        # Crear outfit de referencia
        outfit = Outfit(
            id=new_uuid(),
            user_id=user.id,
            aesthetic="casual",
            chromatic_score=0.85,
            embedding_score=0.8,
            occasion="work",
        )
        session.add(outfit)
        session.commit()

        # 1. Crear un plan para una fecha específica
        plan_payload = {
            "user_id": user.id,
            "planned_date": "2026-11-20",
            "garment_ids": garment_ids,
            "outfit_id": outfit.id,
            "occasion": "Reunión de trabajo",
            "notes": "Llevar abrigo ligero",
        }
        create_resp = client.post("/api/v1/planner", json=plan_payload)
        assert create_resp.status_code == 201, create_resp.text
        plan_data = create_resp.json()
        assert plan_data["status"] == "PLANNED"
        assert plan_data["planned_date"] == "2026-11-20"
        plan_id = plan_data["id"]

        # 2. Listar planes filtrados
        list_resp = client.get("/api/v1/planner?start_date=2026-11-01&end_date=2026-11-30")
        assert list_resp.status_code == 200
        planes = list_resp.json()
        assert any(p["id"] == plan_id for p in planes)

        # 3. Confirmar uso y enviar a lavandería
        confirm_resp = client.patch(
            f"/api/v1/planner/{plan_id}/confirm?send_to_laundry=true"
        )
        assert confirm_resp.status_code == 200, confirm_resp.text
        confirm_data = confirm_resp.json()
        assert confirm_data["plan"]["status"] == "COMPLETED"
        assert confirm_data["usage_logged"] is True
        assert set(confirm_data["garments_marked_laundry"]) == set(garment_ids)

        # 4. Verificar que las prendas ahora tengan status LAUNDRY en DB
        session.expire_all()
        check_top = session.get(Garment, g_top.id)
        check_bottom = session.get(Garment, g_bottom.id)
        assert check_top.status == "LAUNDRY"
        assert check_bottom.status == "LAUNDRY"

        # 5. Eliminar plan
        del_resp = client.delete(f"/api/v1/planner/{plan_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["deleted"] is True
    finally:
        session.close()


def test_garment_multi_user_isolation():
    """Verifica aislamiento multi-usuario en /capsule y PATCH /garments/{id}/status."""
    session = SessionLocal()
    try:
        demo_user = get_demo_user(session)
        other_user = User(id=new_uuid(), email=f"other-{new_uuid()}@styles.com")
        session.add(other_user)
        session.flush()

        foreign_garment = Garment(
            id=new_uuid(),
            owner_id=other_user.id,
            category="jacket",
            position="outerwear",
            dominant_colors=[{"hex": "#111111", "pct": 1.0, "h": 0, "s": 0, "v": 7}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.1] * 128,
            image_path="garments/foreign.jpg",
            processed_image_path="garments/foreign.png",
            is_candidate=False,
            status=GarmentStatus.AVAILABLE.value,
        )
        capsule_garment = Garment(
            id=new_uuid(),
            owner_id=None,
            category="shirt",
            position="top",
            dominant_colors=[{"hex": "#FFFFFF", "pct": 1.0, "h": 0, "s": 0, "v": 100}],
            top_aesthetics=[{"aesthetic": "minimalist", "confidence": 0.9}],
            embedding=[0.2] * 128,
            image_path="capsule/cap.png",
            processed_image_path="capsule/cap.png",
            is_candidate=False,
            status=GarmentStatus.AVAILABLE.value,
        )
        own_garment = Garment(
            id=new_uuid(),
            owner_id=demo_user.id,
            category="pants",
            position="bottom",
            dominant_colors=[{"hex": "#222222", "pct": 1.0, "h": 0, "s": 0, "v": 13}],
            top_aesthetics=[{"aesthetic": "casual", "confidence": 0.9}],
            embedding=[0.3] * 128,
            image_path="garments/own.jpg",
            processed_image_path="garments/own.png",
            is_candidate=False,
            status=GarmentStatus.AVAILABLE.value,
        )
        session.add_all([foreign_garment, capsule_garment, own_garment])
        session.commit()

        # /capsule muestra solo prendas capsule (owner_id=None) y propias, no las de otro usuario
        resp_capsule = client.get("/api/v1/garments/capsule")
        assert resp_capsule.status_code == 200
        ids = {g["id"] for g in resp_capsule.json()["garments"]}
        assert capsule_garment.id in ids
        assert own_garment.id in ids
        assert foreign_garment.id not in ids

        # PATCH status sobre prenda ajena devuelve 403
        resp_patch = client.patch(
            f"/api/v1/garments/{foreign_garment.id}/status",
            json={"status": "LAUNDRY"},
        )
        assert resp_patch.status_code == 403
    finally:
        session.close()
