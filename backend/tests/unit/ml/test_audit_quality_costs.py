"""Pruebas unitarias para monitoreo de calidad SSIM/PSNR y costos GPU (86e301dzn, 86e301dz5)."""

from PIL import Image

from ml.validation.audit_gpu_costs import (
    calcular_costo_job,
    generar_reporte_auditoria,
    proyectar_costos_mensuales,
)
from ml.validation.audit_vton_quality import (
    auditar_calidad_pares,
    calcular_psnr,
    calcular_ssim,
)


def test_calcular_ssim_identical_images_returns_one():
    img = Image.new("RGB", (64, 64), color=(100, 150, 200))
    ssim = calcular_ssim(img, img)
    assert 0.99 <= ssim <= 1.0


def test_calcular_psnr_identical_images_returns_max():
    img = Image.new("RGB", (64, 64), color=(50, 50, 50))
    psnr = calcular_psnr(img, img)
    assert psnr == 100.0


def test_auditar_calidad_pares_evaluates_thresholds():
    img1 = Image.new("RGB", (64, 64), color=(200, 200, 200))
    img2 = Image.new("RGB", (64, 64), color=(205, 205, 205))
    resultado = auditar_calidad_pares([(img1, img2)])

    assert resultado["samples"] == 1
    assert resultado["ssim_mean"] >= 0.70
    assert resultado["psnr_mean_db"] >= 20.0
    assert resultado["status"] == "APPROVED"


def test_calcular_costo_job_returns_expected_amounts():
    # 2 capas con Replicate A40: 17s * 0.0023 = 0.0391 USD
    costo = calcular_costo_job("replicate_a40", num_layers=2)
    assert costo["num_layers"] == 2
    assert costo["total_inference_seconds"] == 17.0
    assert costo["cost_per_job_usd"] == 0.0391


def test_proyectar_costos_mensuales_structure():
    proyecciones = proyectar_costos_mensuales(volumes=(100, 1000))
    assert "replicate_a40" in proyecciones
    assert "1000_jobs" in proyecciones["replicate_a40"]["by_volume"]
    assert proyecciones["replicate_a40"]["by_volume"]["1000_jobs"] > 0


def test_generar_reporte_auditoria_structure():
    reporte = generar_reporte_auditoria()
    assert reporte["task_id"] == "86e301dz5"
    assert "standard_job_estimates" in reporte
    assert len(reporte["policy_recommendations"]) >= 3
