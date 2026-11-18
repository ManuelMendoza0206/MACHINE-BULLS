"""Tests unitarios para el failover de proveedores VTON (CatVTON -> Replicate -> Mock)."""

from __future__ import annotations

import io
from dataclasses import replace
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

from db.session import SessionLocal
from domain.enums import VtonJobStatus
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob
from main import app
from services import storage
from services.vton import provider as vton_provider
from services.vton.pipeline import run_job
from services.vton.provider import (
    HttpVtonProvider,
    ReplicateVtonProvider,
    get_provider_fallback_chain,
)


def test_get_provider_fallback_chain_order(monkeypatch) -> None:
    """Verifica el orden GPU real sin fallback a mock (CatVTON -> Replicate)."""
    # `get_provider_fallback_chain` lee REPLICATE_API_TOKEN EN RUNTIME
    # (os.environ.get(...) or settings...): por eso setenv/delenv de aca
    # son efectivos aunque `settings` este frozen.
    monkeypatch.setenv("REPLICATE_API_TOKEN", "dummy-token")
    http_prov = HttpVtonProvider("http://127.0.0.1:7861/tryon")
    chain = get_provider_fallback_chain(http_prov)

    assert len(chain) == 2
    assert isinstance(chain[0], HttpVtonProvider)
    assert isinstance(chain[1], ReplicateVtonProvider)

    # Sin REPLICATE_API_TOKEN no cae a MockVtonProvider
    monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)
    monkeypatch.setattr(
        vton_provider,
        "settings",
        replace(vton_provider.settings, replicate_api_token=""),
    )
    chain_no_rep = get_provider_fallback_chain(http_prov)
    assert len(chain_no_rep) == 1
    assert isinstance(chain_no_rep[0], HttpVtonProvider)


def test_run_job_failover_catvton_to_replicate(monkeypatch) -> None:
    """Verifica que si CatVTON falla, el pipeline conmuta a Replicate GPU (nunca a mock)."""
    # La cadena de fallback se arma con el env leido en runtime (ver test de
    # arriba): el token se setea aca para no depender del `.env` de la maquina.
    monkeypatch.setenv("REPLICATE_API_TOKEN", "dummy-token")
    db_session = SessionLocal()
    try:
        # Generar imagen valida para Pillow
        im = Image.new("RGB", (32, 32), color="blue")
        buf = io.BytesIO()
        im.save(buf, format="JPEG")
        valid_jpeg = buf.getvalue()

        human_path, _ = storage.save_image(valid_jpeg, "humans")
        prenda_path, _ = storage.save_image(valid_jpeg, "garments")

        user = User(id="user-failover-test", email="failover@example.com")
        db_session.add(user)
        db_session.flush()

        garment = Garment(
            owner_id=user.id,
            category="top",
            position="top",
            image_path=prenda_path,
            processed_image_path=prenda_path,
        )
        db_session.add(garment)
        db_session.flush()

        outfit = Outfit(user_id=user.id, aesthetic="casual", chromatic_score=0.85, embedding_score=0.85)
        db_session.add(outfit)
        db_session.flush()

        db_session.add(OutfitGarment(outfit_id=outfit.id, garment_id=garment.id, position="top"))
        db_session.commit()

        job = VtonJob(
            user_id=user.id,
            outfit_id=outfit.id,
            status=VtonJobStatus.PROCESSING.value,
        )
        db_session.add(job)
        db_session.commit()

        # Simulamos CatVTON fallando con ConnectionError y Replicate completando con imagen real
        failing_catvton = HttpVtonProvider("http://127.0.0.1:9999/tryon")
        with (
            patch.object(failing_catvton, "try_on", side_effect=ConnectionError("CatVTON endpoint down")),
            patch.object(ReplicateVtonProvider, "try_on", return_value=valid_jpeg),
        ):
            run_job(job.id, human_path, provider=failing_catvton)

        db_session.refresh(job)
        # El job se completa gracias al failover hacia Replicate GPU (sin mock)
        assert job.status == VtonJobStatus.COMPLETED.value
        assert job.result_path is not None
        assert job.error_message is None
    finally:
        db_session.close()


def test_vton_job_status_forbidden_for_other_user() -> None:
    """Verifica que consultar un VtonJob ajeno devuelva 403."""
    db_session = SessionLocal()
    try:
        owner = User(id="owner-vton-403", email="owner-vton-403@styles.com")
        db_session.add(owner)
        db_session.flush()

        outfit = Outfit(user_id=owner.id, aesthetic="casual", chromatic_score=0.8, embedding_score=0.8)
        db_session.add(outfit)
        db_session.flush()

        foreign_job = VtonJob(
            user_id=owner.id,
            outfit_id=outfit.id,
            status=VtonJobStatus.PENDING.value,
        )
        db_session.add(foreign_job)
        db_session.commit()

        client = TestClient(app)
        resp = client.get(f"/api/v1/vton/status/{foreign_job.id}")
        assert resp.status_code == 403
    finally:
        db_session.close()
