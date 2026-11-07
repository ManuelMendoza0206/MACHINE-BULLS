"""Tests unitarios para el failover de proveedores VTON (CatVTON -> Replicate -> Mock)."""

from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

from PIL import Image

from db.session import SessionLocal
from domain.enums import VtonJobStatus
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob
from services import storage
from services.vton.pipeline import run_job
from services.vton.provider import (
    HttpVtonProvider,
    MockVtonProvider,
    ReplicateVtonProvider,
    get_provider_fallback_chain,
)


def test_get_provider_fallback_chain_order(monkeypatch) -> None:
    """Verifica el orden de la cadena de fallback CatVTON -> Replicate -> Mock."""
    monkeypatch.setenv("REPLICATE_API_TOKEN", "dummy-token")
    http_prov = HttpVtonProvider("http://127.0.0.1:7861/tryon")
    chain = get_provider_fallback_chain(http_prov)

    assert len(chain) == 3
    assert isinstance(chain[0], HttpVtonProvider)
    assert isinstance(chain[1], ReplicateVtonProvider)
    assert isinstance(chain[2], MockVtonProvider)


def test_run_job_failover_catvton_to_mock(tmp_path) -> None:
    """Verifica que si CatVTON falla por conexion o timeout, el pipeline conmuta a Mock y completa el job."""
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

        # Simulamos CatVTON fallando con ConnectionError
        failing_catvton = HttpVtonProvider("http://127.0.0.1:9999/tryon")
        with patch.object(failing_catvton, "try_on", side_effect=ConnectionError("CatVTON endpoint down")):
            run_job(job.id, human_path, provider=failing_catvton)

        db_session.refresh(job)
        # El job no debe fallar, debe haberse completado gracias al failover hacia MockVtonProvider
        assert job.status == VtonJobStatus.COMPLETED.value
        assert job.result_path is not None
        assert job.error_message is None
    finally:
        db_session.close()
