"""Test unitario para el script de evaluación y benchmarking CatVTON."""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Añadir la raíz del repositorio a sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from scripts.eval_catvton import run_benchmark


def test_eval_catvton_dry_run(tmp_path: Path) -> None:
    out_file = tmp_path / "benchmark_out.json"
    report = run_benchmark(output_path=out_file, dry_run=True)

    assert out_file.exists()
    assert report["summary"]["total_runs"] > 0
    assert report["summary"]["mean_ssim"] >= report["summary"]["target_ssim"]
    assert report["summary"]["mean_psnr_db"] >= report["summary"]["target_psnr_db"]

    loaded = json.loads(out_file.read_text(encoding="utf-8"))
    assert loaded["summary"]["recommended_steps"] == 30
