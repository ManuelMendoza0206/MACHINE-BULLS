#!/usr/bin/env python3
"""Coverage Enforcement Gate for CI/CD Pipeline.

Enforces minimum code coverage thresholds per spec (Task 86e302a2n):
- Backend overall coverage: >= 80.0%
- Backend domain model (`src/domain/`): >= 90.0%
- Frontend overall coverage: >= 80.0% (when report provided)

Exit Codes:
- 0: All coverage requirements met (GATE PASSED)
- 1: Coverage falls below minimum threshold (MERGE BLOCKED)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, NamedTuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("coverage_gate")

DEFAULT_BACKEND_XML = Path("backend/coverage.xml")
DEFAULT_FRONTEND_JSON = Path("frontend/coverage/coverage-final.json")
DEFAULT_RESULT_PATH = Path("docs/ci/coverage_gate_result.json")


class GateCheck(NamedTuple):
    name: str
    rate: float
    threshold: float
    passed: bool


def parse_cobertura_xml(xml_path: Path) -> dict[str, Any]:
    """Parse Cobertura coverage.xml into total and per-package coverage rates."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    line_rate = float(root.attrib.get("line-rate", 0.0)) * 100.0

    domain_lines_valid = 0
    domain_lines_covered = 0

    for pkg in root.findall(".//package"):
        for cls in pkg.findall(".//class"):
            filename = cls.attrib.get("filename", "")
            if "domain/" in filename or filename.startswith("src/domain"):
                lines = cls.findall(".//line")
                for line in lines:
                    domain_lines_valid += 1
                    if int(line.attrib.get("hits", 0)) > 0:
                        domain_lines_covered += 1

    domain_rate = (
        (domain_lines_covered / domain_lines_valid * 100.0)
        if domain_lines_valid > 0
        else line_rate
    )

    return {
        "overall_rate": line_rate,
        "domain_rate": domain_rate,
        "domain_lines_total": domain_lines_valid,
        "domain_lines_covered": domain_lines_covered,
    }


def parse_frontend_coverage_json(json_path: Path) -> float:
    """Parse Istanbul/Vitest coverage-final.json into overall line coverage rate."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_statements = 0
    covered_statements = 0

    for file_data in data.values():
        statement_map = file_data.get("s", {})
        for hits in statement_map.values():
            total_statements += 1
            if hits > 0:
                covered_statements += 1

    if total_statements == 0:
        return 0.0

    return (covered_statements / total_statements) * 100.0


def evaluate_coverage(
    backend_xml: Path | None = None,
    frontend_json: Path | None = None,
    backend_min: float = 80.0,
    domain_min: float = 90.0,
    frontend_min: float = 80.0,
) -> list[GateCheck]:
    """Evaluate coverage metrics against required thresholds."""
    checks: list[GateCheck] = []

    if backend_xml and backend_xml.exists():
        backend_stats = parse_cobertura_xml(backend_xml)
        b_rate = backend_stats["overall_rate"]
        checks.append(GateCheck("Backend Overall", b_rate, backend_min, b_rate >= backend_min))

        d_rate = backend_stats["domain_rate"]
        checks.append(GateCheck("Backend Domain (src/domain/)", d_rate, domain_min, d_rate >= domain_min))

    if frontend_json and frontend_json.exists():
        f_rate = parse_frontend_coverage_json(frontend_json)
        checks.append(GateCheck("Frontend Overall", f_rate, frontend_min, f_rate >= frontend_min))

    return checks


def run_coverage_gate(
    backend_xml: Path | None = DEFAULT_BACKEND_XML,
    frontend_json: Path | None = DEFAULT_FRONTEND_JSON,
    backend_min: float = 80.0,
    domain_min: float = 90.0,
    frontend_min: float = 80.0,
    output_path: Path = DEFAULT_RESULT_PATH,
) -> bool:
    """Run coverage gate, output report and write result file."""
    checks = evaluate_coverage(
        backend_xml=backend_xml,
        frontend_json=frontend_json,
        backend_min=backend_min,
        domain_min=domain_min,
        frontend_min=frontend_min,
    )

    if not checks:
        logger.warning("No coverage reports found at provided paths.")
        return False

    all_passed = all(c.passed for c in checks)

    logger.info("================ COVERAGE ENFORCEMENT GATE ================")
    for c in checks:
        status = "PASS" if c.passed else "FAIL"
        logger.info(
            "Target: %-28s -> %5.1f%% (Threshold >= %4.1f%%) [%s]",
            c.name,
            c.rate,
            c.threshold,
            status,
        )
    logger.info("===========================================================")
    logger.info("VERDICT: %s", "ALL GATES PASSED (Exit Code 0)" if all_passed else "COVERAGE REGRESSION DETECTED (Exit Code 1)")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "gate": "coverage_gate",
                "all_passed": all_passed,
                "checks": [
                    {
                        "target": c.name,
                        "rate": round(c.rate, 2),
                        "threshold": round(c.threshold, 2),
                        "passed": c.passed,
                    }
                    for c in checks
                ],
            },
            f,
            indent=2,
        )

    return all_passed


def main() -> int:
    parser = argparse.ArgumentParser(description="Coverage Gate Enforcer for CI")
    parser.add_argument("--backend-xml", type=Path, default=None, help="Path to backend coverage.xml")
    parser.add_argument("--frontend-json", type=Path, default=None, help="Path to frontend coverage-final.json")
    parser.add_argument("--backend-min", type=float, default=80.0, help="Min backend coverage percentage")
    parser.add_argument("--domain-min", type=float, default=90.0, help="Min domain coverage percentage")
    parser.add_argument("--frontend-min", type=float, default=80.0, help="Min frontend coverage percentage")
    parser.add_argument("--output", type=Path, default=DEFAULT_RESULT_PATH, help="Output JSON path")
    args = parser.parse_args()

    backend_xml = args.backend_xml
    frontend_json = args.frontend_json

    # If neither specified explicitly, fallback to defaults if they exist
    if backend_xml is None and frontend_json is None:
        if DEFAULT_BACKEND_XML.exists():
            backend_xml = DEFAULT_BACKEND_XML
        if DEFAULT_FRONTEND_JSON.exists():
            frontend_json = DEFAULT_FRONTEND_JSON

    passed = run_coverage_gate(
        backend_xml=backend_xml,
        frontend_json=frontend_json,
        backend_min=args.backend_min,
        domain_min=args.domain_min,
        frontend_min=args.frontend_min,
        output_path=args.output,
    )

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
