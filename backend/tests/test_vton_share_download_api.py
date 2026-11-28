"""Tests de endpoints para compartir y descargar resultados VTON."""

from __future__ import annotations

from typing import Any

from db.session import SessionLocal
from domain.enums import VtonJobStatus
from domain.models import User, VtonJob, new_uuid
from services import storage


def _create_completed_job(user_id: str) -> str:
    rel_path, _ = storage.save_image(b"fake_vton_result_image", "vton")
    session = SessionLocal()
    try:
        # Asegurar que el usuario existe para evitar violación de FK
        if not session.get(User, user_id):
            session.add(User(id=user_id, email=f"{user_id}@test.com"))
            session.commit()

        job_id = new_uuid()
        job = VtonJob(
            id=job_id,
            user_id=user_id,
            status=VtonJobStatus.COMPLETED.value,
            stage="completed",
            result_path=rel_path,
        )
        session.add(job)
        session.commit()
        return job_id
    finally:
        session.close()


def test_share_and_download_flow(client: Any, demo_user_id: str) -> None:
    job_id = _create_completed_job(demo_user_id)

    # 1. Share look endpoint
    share_res = client.post(f"/api/v1/vton/{job_id}/share")
    assert share_res.status_code == 200
    data = share_res.json()
    token = data["share_token"]
    assert token
    assert f"/looks/{token}" in data["share_url"]
    assert "/api/v1/vton/shared/" not in data["share_url"]

    # 2. Public shared access via token (unauthenticated client)
    shared_img_res = client.get(f"/api/v1/vton/shared/{token}")
    assert shared_img_res.status_code == 200
    assert shared_img_res.headers["content-type"] == "image/jpeg"
    assert shared_img_res.content == b"fake_vton_result_image"

    # 3. Direct download endpoint (authenticated)
    dl_res = client.get(f"/api/v1/vton/{job_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/jpeg"
    assert "attachment; filename=" in dl_res.headers.get("content-disposition", "")
    assert dl_res.content == b"fake_vton_result_image"


def test_share_fails_for_incomplete_job(client: Any, demo_user_id: str) -> None:
    session = SessionLocal()
    try:
        job = VtonJob(
            id=new_uuid(),
            user_id=demo_user_id,
            status=VtonJobStatus.PROCESSING.value,
            stage="generating",
        )
        session.add(job)
        session.commit()
        job_id = job.id
    finally:
        session.close()

    res = client.post(f"/api/v1/vton/{job_id}/share")
    assert res.status_code == 400
    assert "finalizado exitosamente" in res.text


def test_share_fails_for_unauthorized_user(client: Any) -> None:
    job_id = _create_completed_job("other-user-uuid")

    res = client.post(f"/api/v1/vton/{job_id}/share")
    assert res.status_code == 403
