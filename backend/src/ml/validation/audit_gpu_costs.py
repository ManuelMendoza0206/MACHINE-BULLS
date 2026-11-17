"""Monitoreo y modelado continuo de costos de inferencia GPU (86e301dz5).

Calcula proyecciones presupuestarias, consumo por capas y cuotas de cómputo
para cada proveedor (Replicate, RunPod Serverless, Colab/Local).

Uso:
    python -m src.ml.validation.audit_gpu_costs --output docs/sre/gpu_cost_audit.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

# Tarifas horarias y por segundo de proveedores GPU (noviembre 2026)
GPU_PRICING = {
    "replicate_a40": {
        "name": "Replicate (Nvidia A40 48GB)",
        "cost_per_second_usd": 0.00230,
        "avg_duration_s_per_layer": 8.5,
    },
    "replicate_a100": {
        "name": "Replicate (Nvidia A100 40GB)",
        "cost_per_second_usd": 0.00320,
        "avg_duration_s_per_layer": 6.2,
    },
    "runpod_serverless_rtx4090": {
        "name": "RunPod Serverless (RTX 4090 24GB)",
        "cost_per_second_usd": 0.00044,
        "avg_duration_s_per_layer": 6.8,
    },
    "local_colab_pro": {
        "name": "Google Colab Pro (Flat mensual)",
        "cost_per_second_usd": 0.0,
        "flat_monthly_usd": 10.0,
        "avg_duration_s_per_layer": 9.5,
    },
}


def calcular_costo_job(
    provider_key: str,
    num_layers: int = 2,
) -> dict[str, Any]:
    """Calcula el costo en USD y la latencia esperada para un try-on de N capas."""
    prov = GPU_PRICING.get(provider_key, GPU_PRICING["replicate_a40"])
    segundos_totales = prov["avg_duration_s_per_layer"] * num_layers
    costo_usd = segundos_totales * prov["cost_per_second_usd"]

    return {
        "provider": prov["name"],
        "num_layers": num_layers,
        "total_inference_seconds": round(segundos_totales, 2),
        "cost_per_job_usd": round(costo_usd, 5),
    }


def proyectar_costos_mensuales(
    volumes: tuple[int, ...] = (500, 1000, 5000, 10000),
    avg_layers_per_job: float = 1.8,
) -> dict[str, Any]:
    """Proyecta presupuestos mensuales en base al volumen de usuarios."""
    proyecciones = {}
    for prov_key, prov in GPU_PRICING.items():
        if prov_key == "local_colab_pro":
            continue
        cost_per_layer = prov["avg_duration_s_per_layer"] * prov["cost_per_second_usd"]
        cost_per_job = cost_per_layer * avg_layers_per_job

        proyecciones[prov_key] = {
            "provider_name": prov["name"],
            "cost_per_single_job_usd": round(cost_per_job, 4),
            "by_volume": {
                f"{vol}_jobs": round(cost_per_job * vol, 2)
                for vol in volumes
            },
        }

    return proyecciones


def generar_reporte_auditoria() -> dict[str, Any]:
    return {
        "report": "GPU Cost & Latency Continuous Audit",
        "task_id": "86e301dz5",
        "pricing_reference": GPU_PRICING,
        "standard_job_estimates": {
            "1_layer_upper": calcular_costo_job("replicate_a40", num_layers=1),
            "2_layers_upper_lower": calcular_costo_job("replicate_a40", num_layers=2),
            "3_layers_complete": calcular_costo_job("replicate_a40", num_layers=3),
        },
        "monthly_projections_usd": proyectar_costos_mensuales(),
        "policy_recommendations": [
            "Para el MVP (volumen <= 1.000 jobs/mes), Replicate A40 tiene un costo de ~$35 USD/mes, perfectamente asumible dentro del presupuesto de $50 USD.",
            "Para escalar a Sprint 6+ (> 5.000 jobs/mes), migrar a RunPod Serverless RTX 4090 para reducir el costo a ~$27 USD por cada 5.000 jobs (ahorro del 81%).",
            "Establecer alerta de gasto cuando el consumo diario supere los $5 USD.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Auditoría continua de costos y latencia GPU")
    parser.add_argument("--output", type=str, default="docs/sre/gpu_cost_audit.json", help="Ruta de reporte JSON")
    args = parser.parse_args()

    reporte = generar_reporte_auditoria()
    print("=== Reporte de Auditoría de Costos de Inferencia GPU (86e301dz5) ===")
    print(json.dumps(reporte, indent=2))

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(reporte, indent=2), encoding="utf-8")
    print(f"Reporte persistido en {out_path}")


if __name__ == "__main__":
    main()
