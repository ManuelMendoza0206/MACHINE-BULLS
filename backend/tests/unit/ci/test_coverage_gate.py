"""Unit tests for scripts/ci/coverage_gate.py"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ci.coverage_gate import (
    evaluate_coverage,
    parse_cobertura_xml,
    parse_frontend_coverage_json,
    run_coverage_gate,
)

SAMPLE_COBERTURA_XML = """<?xml version="1.0" ?>
<coverage version="7.5.0" timestamp="1725000000" lines-valid="100" lines-covered="85" line-rate="0.85">
  <packages>
    <package name="src.domain" line-rate="0.95">
      <classes>
        <class name="models.py" filename="src/domain/models.py">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="1"/>
            <line number="3" hits="0"/>
            <line number="4" hits="1"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>
"""

SAMPLE_FRONTEND_JSON = {
    "/frontend/src/app/page.tsx": {
        "s": {"0": 1, "1": 1, "2": 0, "3": 1}
    }
}


def test_parse_cobertura_xml(tmp_path: Path):
    xml_path = tmp_path / "coverage.xml"
    xml_path.write_text(SAMPLE_COBERTURA_XML, encoding="utf-8")

    stats = parse_cobertura_xml(xml_path)
    assert stats["overall_rate"] == 85.0
    assert stats["domain_rate"] == 75.0  # 3 of 4 hits


def test_parse_frontend_coverage_json(tmp_path: Path):
    json_path = tmp_path / "coverage.json"
    json_path.write_text(json.dumps(SAMPLE_FRONTEND_JSON), encoding="utf-8")

    rate = parse_frontend_coverage_json(json_path)
    assert rate == 75.0  # 3 of 4 hits


def test_evaluate_coverage_pass_and_fail(tmp_path: Path):
    xml_path = tmp_path / "coverage.xml"
    xml_path.write_text(SAMPLE_COBERTURA_XML, encoding="utf-8")

    checks = evaluate_coverage(backend_xml=xml_path, backend_min=80.0, domain_min=70.0)
    assert len(checks) == 2
    assert checks[0].passed is True  # 85% >= 80%
    assert checks[1].passed is True  # 75% >= 70%

    # If domain_min is 90%
    checks_fail = evaluate_coverage(backend_xml=xml_path, backend_min=80.0, domain_min=90.0)
    assert checks_fail[1].passed is False  # 75% < 90%


def test_run_coverage_gate_output(tmp_path: Path):
    xml_path = tmp_path / "coverage.xml"
    xml_path.write_text(SAMPLE_COBERTURA_XML, encoding="utf-8")
    out_json = tmp_path / "result.json"

    passed = run_coverage_gate(
        backend_xml=xml_path,
        frontend_json=None,
        backend_min=80.0,
        domain_min=70.0,
        output_path=out_json,
    )
    assert passed is True
    assert out_json.exists()
