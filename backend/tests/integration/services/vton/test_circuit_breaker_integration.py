"""Prueba de integración: Circuit Breaker en pipeline de VTON (86e3122dy).

Verifica que tras fallos consecutivos del proveedor, el circuit breaker se abre
y los siguientes jobs fallan de forma inmediata sin emitir llamadas HTTP innecesarias.
"""

from unittest.mock import MagicMock, patch

from db.session import SessionLocal
from domain.enums import VtonJobStatus
from domain.models import Garment, Outfit, OutfitGarment, User, VtonJob
from services import storage
from services.vton.circuit_breaker import get_circuit_breaker, reset_circuit_breakers
from services.vton.pipeline import run_job


def test_circuit_breaker_blocks_execution_after_consecutive_failures():
    reset_circuit_breakers()
    db_session = SessionLocal()
    try:
        # Prepara entidades e imágenes en storage
        dummy_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 50
        human_path, _ = storage.save_image(dummy_jpeg, "humans")
        prenda_path, _ = storage.save_image(dummy_jpeg, "garments")

        user = User(id="test-user-cb", email="user-cb@example.com")
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

        outfit = Outfit(user_id=user.id, aesthetic="minimalist", chromatic_score=0.9, embedding_score=0.9)
        db_session.add(outfit)
        db_session.flush()

        db_session.add(OutfitGarment(outfit_id=outfit.id, garment_id=garment.id, position="top"))
        db_session.commit()

        failing_provider = MagicMock()
        failing_provider.name = "failing_mock_provider"
        failing_provider.try_on.side_effect = ConnectionError("Simulated external API outage")

        with patch("services.vton.pipeline.build_provider", return_value=failing_provider):
            cb = get_circuit_breaker(failing_provider.name)
            cb.failure_threshold = 3

            # 3 ejecuciones consecutivas fallidas
            for i in range(3):
                job = VtonJob(
                    user_id=user.id,
                    outfit_id=outfit.id,
                    status=VtonJobStatus.PROCESSING.value,
                )
                db_session.add(job)
                db_session.commit()

                run_job(job.id, human_path)
                db_session.refresh(job)
                assert job.status == VtonJobStatus.FAILED.value

            # El circuit breaker ahora debe estar OPEN
            assert cb.is_open()
            total_calls_before_open = failing_provider.try_on.call_count

            # 4ta ejecución: El job debe fallar INMEDIATAMENTE por Circuit Breaker
            job_blocked = VtonJob(
                user_id=user.id,
                outfit_id=outfit.id,
                status=VtonJobStatus.PROCESSING.value,
            )
            db_session.add(job_blocked)
            db_session.commit()

            run_job(job_blocked.id, human_path)
            db_session.refresh(job_blocked)

            assert job_blocked.status == VtonJobStatus.FAILED.value
            assert "circuit breaker" in job_blocked.error_message.lower()
            # Verificación crítica: NO se realizaron llamadas al proveedor upstream
            assert failing_provider.try_on.call_count == total_calls_before_open
    finally:
        db_session.close()
