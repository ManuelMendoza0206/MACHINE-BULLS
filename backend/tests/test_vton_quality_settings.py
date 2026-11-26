"""Configuración que gobierna la calidad y coste de CatVTON."""

from __future__ import annotations

from config import load_settings


def test_vton_quality_settings_read_explicit_environment(monkeypatch) -> None:
    monkeypatch.setenv("VTON_STEPS", "50")
    monkeypatch.setenv("VTON_GUIDANCE", "2.5")
    monkeypatch.setenv("VTON_SEED", "42")
    monkeypatch.setenv("VTON_WIDTH", "768")
    monkeypatch.setenv("VTON_HEIGHT", "1024")
    monkeypatch.setenv("VTON_LAYER_MODE", "from_original")

    cfg = load_settings()

    assert cfg.vton_steps == 50
    assert cfg.vton_guidance == 2.5
    assert cfg.vton_seed == 42
    assert (cfg.vton_width, cfg.vton_height) == (768, 1024)
    assert cfg.vton_layer_mode == "from_original"
