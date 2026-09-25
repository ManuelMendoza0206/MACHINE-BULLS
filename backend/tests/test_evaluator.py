"""Tests del evaluator (historia bccz)."""

from __future__ import annotations

import json

from ml.metrics.evaluator import Evaluator


def test_perfecto_da_uno() -> None:
    ev = Evaluator()
    ev.update([["a", "b"], ["c"]], [["a", "b"], ["c"]])
    assert len(ev) == 2
    assert ev.accuracy() == 1.0
    assert ev.micro()["f1"] == 1.0
    assert ev.macro()["f1"] == 1.0


def test_parcial_mide_bien() -> None:
    ev = Evaluator()
    ev.update([["a"], ["b"]], [["a"], ["c"]])
    assert ev.accuracy() == 0.5
    per = ev.per_class()
    assert per["a"]["precision"] == 1.0
    assert per["b"]["recall"] == 0.0
    assert ev.confusion_matrix() == {"a": {"a": 1}, "b": {"c": 1}}


def test_vacio_no_rompe() -> None:
    ev = Evaluator()
    assert ev.accuracy() == 0.0
    assert ev.to_dict()["n"] == 0


def test_largos_distintos_falla() -> None:
    ev = Evaluator()
    try:
        ev.update([["a"]], [])
    except ValueError:
        pass
    else:
        raise AssertionError("debió fallar")


def test_reportes_json_html(tmp_path) -> None:
    ev = Evaluator()
    ev.update([["a", "b"], ["c"]], [["a"], ["c"]])
    jp = ev.report_json(tmp_path / "r.json")
    hp = ev.report_html(tmp_path / "r.html")
    assert json.loads(jp.read_text(encoding="utf-8"))["n"] == 2
    assert "<table" in hp.read_text(encoding="utf-8")
