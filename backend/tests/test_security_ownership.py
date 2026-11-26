from __future__ import annotations

from datetime import date
from typing import Any

from db.session import SessionLocal
from domain.models import Garment, Outfit, User, VtonJob, new_uuid


def _foreign_resources() -> tuple[str, str, str]:
    session = SessionLocal()
    try:
        other = User(id=new_uuid(), email=f"other-{new_uuid()}@test.invalid")
        session.add(other)
        session.flush()
        garment = Garment(
            id=new_uuid(), owner_id=other.id, category="top", position="top",
            image_path="garments/original.jpg", processed_image_path="garments/processed.png",
        )
        outfit = Outfit(id=new_uuid(), user_id=other.id, aesthetic="casual")
        session.add_all([garment, outfit])
        session.flush()
        job = VtonJob(id=new_uuid(), user_id=other.id, outfit_id=outfit.id, status="processing")
        session.add(job)
        session.commit()
        return garment.id, outfit.id, job.id
    finally:
        session.close()


def test_user_cannot_read_foreign_outfit_or_vton_job(client: Any, demo_user_id: str) -> None:
    _garment_id, outfit_id, job_id = _foreign_resources()
    assert client.get(f"/api/v1/outfits/{outfit_id}").status_code == 403
    assert client.get(f"/api/v1/vton/status/{job_id}").status_code == 404


def test_user_cannot_create_plan_with_foreign_garment(client: Any, demo_user_id: str) -> None:
    garment_id, _outfit_id, _job_id = _foreign_resources()
    response = client.post("/api/v1/planner", json={
        "user_id": demo_user_id,
        "planned_date": date(2026, 1, 1).isoformat(),
        "garment_ids": [garment_id],
    })
    assert response.status_code == 403


def test_user_cannot_adopt_foreign_candidate(client: Any) -> None:
    garment_id, _outfit_id, _job_id = _foreign_resources()
    response = client.post(f"/api/v1/shopping/{garment_id}/adopt")
    assert response.status_code == 404


def test_recommend_rejects_client_supplied_other_user_id(client: Any, demo_user_id: str) -> None:
    response = client.post("/api/v1/outfits/recommend", json={"user_id": "another-user"})
    assert response.status_code == 403
