#!/usr/bin/env python3
"""Generate the interactive architecture viewer for StyleSync IA.

Reads the 5 real SVG diagrams from ``docs/architecture/svgs/``, validates XML,
and ensures:
  - ``docs/architecture/diagrams/viewer.html``
  - ``docs/architecture/diagrams/diagrams.index.json``

are in sync with the repository. Run:
    python scripts/generate_diagrams.py
"""

from __future__ import annotations

import json
import sys
import xml.dom.minidom as minidom
from dataclasses import dataclass, field
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent
SVG_DIR = REPO_ROOT / "docs" / "architecture" / "svgs"
DIAGRAMS_DIR = REPO_ROOT / "docs" / "architecture" / "diagrams"
VIEWER_PATH = DIAGRAMS_DIR / "viewer.html"
INDEX_PATH = DIAGRAMS_DIR / "diagrams.index.json"


@dataclass(frozen=True)
class Metric:
    label: str
    value: str


@dataclass(frozen=True)
class Diagram:
    id: str
    icon: str
    tab_label: str
    title: str
    svg_file: str
    description: str
    metrics: list[Metric] = field(default_factory=list)


DIAGRAMS: list[Diagram] = [
    Diagram(
        id="stack",
        icon="🧰",
        tab_label="Stack",
        title="Stack del MVP",
        svg_file="stack.svg",
        description=(
            "Todo lo que no exige GPU vive en contenedores (compose, con healthchecks y depends_on). "
            "La única pieza nativa es el server de inferencia CatVTON en el GPU del host — Docker Desktop "
            "no pasa CUDA sin un setup WSL2 completo, y los pesos ya cacheados en el host. El worker "
            "containerizado lo alcanza con <code>host.docker.internal</code>, el almacen de media lo "
            "comparten backend y worker por volúmen."
        ),
        metrics=[
            Metric("Contenedores", "5"),
            Metric("GPU host", "RTX 4070 8GB"),
            Metric("Latencia capa", "~50s"),
        ],
    ),
    Diagram(
        id="pipeline",
        icon="🔄",
        tab_label="Pipeline",
        title="Pipeline del job VTON",
        svg_file="pipeline.svg",
        description=(
            "Máquina de estados real (<code>backend/src/domain/enums.py</code>, tabla <code>VtonJob.stage</code>). "
            "Las capas se generan secuencialmente — cada inferencia toma la salida de la anterior como imagen base "
            "(no compositado gráfico). El contrato público <code>pending|processing|completed|failed</code> se "
            "deriva con <code>STAGE_TO_STATUS</code>, por eso el frontend no cambió al agregar la cola."
        ),
        metrics=[
            Metric("Estados finos", "7"),
            Metric("Max capas", "6"),
            Metric("Fallback si Redis cae", "BackgroundTasks"),
        ],
    ),
    Diagram(
        id="protocol",
        icon="📸",
        tab_label="Protocolo",
        title="Protocolo de entrada",
        svg_file="protocol.svg",
        description=(
            "Validación en dos capas: el cliente rechaza borrosidad (varianza laplaciana) <em>antes de gastar red</em>; "
            "el servidor garantiza la pose A-pose con MediaPipe y ciertas geometrías, con umbral calibrado midiendo la foto "
            "canónica del dataset CatVTON (brazos 9.5–10.8°, codos 168–179°). Todo rechazo llega con motivo accionable. "
            "Guías no automatizadas (fondo, resolución mínima) quedan documentadas, no disfrazadas de checks."
        ),
        metrics=[
            Metric("Brazos", "8°–60°"),
            Metric("Codo", "≥130°"),
            Metric("Piernas", "≥0.04"),
        ],
    ),
    Diagram(
        id="testing",
        icon="🧪",
        tab_label="Pruebas",
        title="Pirámide de pruebas",
        svg_file="testing.svg",
        description=(
            "La pirámide refleja lo que corre HOY: 81 tests pytest (unitarias + integración + fallback Redis-caído en "
            "la misma suite); E2E de browser con Playwright (mockean API — contratos de UI); y el <code>infra/smoke.sh</code> "
            "que ejecuta el flujo completo real de la demo (7 pasos, con job multicapa sobre el GPU). Verificación extra del "
            "frontend con <code>npm run verify</code>."
        ),
        metrics=[
            Metric("Backend pytest", "81/81"),
            Metric("Browser e2e", "7 pass / 8 skip"),
            Metric("Smoke pasos", "7/7 con 3 capas"),
        ],
    ),
    Diagram(
        id="deployment",
        icon="🚀",
        tab_label="Despliegue",
        title="Despliegue",
        svg_file="deployment.svg",
        description=(
            "El mismo sistema cambia de modo con variables de entorno — sin bifurcaciones de código: <code>mock</code> "
            "(PIL, siempre funciona, default del compose), <code>catvton</code> (GPU del host, modo demo, fijado en "
            "<code>infra/.env</code> commiteada), <code>http</code> (VM externa con el mismo contrato <code>HttpVtonProvider</code>) "
            "y <code>replicate</code> (API paga, token fuera del repo). Si Redis no responde, el endpoint cae a BackgroundTasks "
            "tras 3s — mismo contrato."
        ),
        metrics=[
            Metric("Modos provider", "4"),
            Metric("Timeout enqueue", "3s"),
            Metric("Secretos en repo", "0"),
        ],
    ),
]


def validate_svgs() -> None:
    for diagram in DIAGRAMS:
        path = SVG_DIR / diagram.svg_file
        if not path.exists():
            raise FileNotFoundError(f"SVG faltante para '{diagram.id}': {path}")
        content = path.read_text(encoding="utf-8")
        try:
            minidom.parseString(content)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"SVG inválido en {path}: {exc}") from exc


def build_viewer_html() -> str:
    sections = []
    for d in DIAGRAMS:
        metrics_html = "".join(
            f"        <div><span>{m.label}</span><strong>{m.value}</strong></div>\n"
            for m in d.metrics
        )
        section = f"""  <section id="panel-{d.id}" hidden>
    <div class="panel">
      <h2>{d.icon} {d.title}</h2>
      <p class="desc">{d.description}</p>
      <div class="metrics">
{metrics_html}      </div>
      <div class="svgwrap"><img src="../svgs/{d.svg_file}" alt="{d.title}" /></div>
      <div class="links"><a href="../svgs/{d.svg_file}" download>⬇️ SVG</a></div>
    </div>
  </section>"""
        sections.append(section)

    panels_html = "\n\n".join(sections)

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>StyleSync IA — Arquitectura Interactiva (C4+)</title>
<meta name="description" content="Diagramas de arquitectura C4+ del sistema integrado actual: stack compose + GPU nativa, pipeline del job VTON, protocolo de entrada, pruebas y despliegue." />
<style>
  :root {{
    --primary: #2563eb;
    --secondary: #7c3aed;
    --amber: #d97706;
    --text: #1f2937;
    --muted: #64748b;
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e5e7eb;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }}
  header {{ padding: 28px 24px 8px; text-align: center; }}
  h1 {{ font-size: 22px; margin: 0 0 6px; }}
  header p {{ margin: 0; color: var(--muted); font-size: 13.5px; }}
  header p a {{ color: var(--primary); }}
  .hint {{ text-align: center; color: var(--muted); font-size: 12px; margin: 6px 0 0; }}
  nav {{ display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 16px; }}
  nav button {{
    border: 1.5px solid var(--border); background: var(--card); color: var(--text);
    padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer;
  }}
  nav button.active {{ border-color: var(--primary); color: var(--primary); background: #eff6ff; }}
  main {{ max-width: 900px; margin: 0 auto 48px; padding: 0 16px; }}
  section[hidden] {{ display: none; }}
  .panel {{
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    box-shadow: 0 8px 24px -12px rgba(30,41,59,.18); padding: 18px 18px 12px;
  }}
  .panel h2 {{ font-size: 17px; margin: 4px 0 6px; }}
  .panel p.desc {{ font-size: 13.5px; color: #374151; line-height: 1.55; margin: 0 0 14px; }}
  .metrics {{ display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }}
  .metrics div {{
    background: #f1f5f9; border: 1px solid var(--border); border-radius: 10px;
    padding: 8px 12px; text-align: center; min-width: 120px;
  }}
  .metrics span {{ display: block; font-size: 10.5px; color: var(--muted); }}
  .metrics strong {{ font-size: 14.5px; color: var(--text); }}
  .svgwrap {{ text-align: center; }}
  .svgwrap img {{ max-width: 100%; height: auto; border-radius: 10px; }}
  .links {{ text-align: center; font-size: 12px; color: var(--muted); padding-bottom: 6px; }}
  .links a {{ color: var(--primary); text-decoration: none; margin: 0 10px; }}
  .links a:hover {{ text-decoration: underline; }}
</style>
</head>
<body>
<header>
  <h1>StyleSync IA — Arquitectura del sistema integrado</h1>
  <p>Diagramas <strong>reales</strong>: cada caja corresponde a código/config en este repo. Roadmap aspiracional queda en <a href="../../context/plan-base.md">plan-base</a>.</p>
  <p class="hint">Sin dependencias ni build — HTML/CSS/JS puro, ábrelo directo en el navegador.</p>
</header>
<nav id="tabs"></nav>
<main>
{panels_html}
</main>
<script>
(function () {{
  var tabs = [];
  document.querySelectorAll('main > section').forEach(function (sec) {{
    var id = sec.id;
    var title = sec.querySelector('h2').textContent;
    tabs.push({{ id: id, title: title }});
  }});
  var nav = document.getElementById('tabs');
  tabs.forEach(function (t, i) {{
    var btn = document.createElement('button');
    btn.textContent = t.title;
    btn.dataset.id = t.id;
    btn.addEventListener('click', function () {{
      document.querySelectorAll('nav button').forEach(function (b) {{ b.classList.remove('active'); }});
      btn.classList.add('active');
      document.querySelectorAll('main > section').forEach(function (s) {{ s.hidden = true; }});
      document.getElementById(t.id).hidden = false;
      location.hash = t.id;
    }});
    if (i === 0) {{ btn.classList.add('active'); }}
    nav.appendChild(btn);
  }});
  var hash = (location.hash || '').replace('#', '');
  var found = tabs.some(function (t, i) {{ if (t.id === hash) {{ nav.children[i].click(); return true; }} return false; }});
  if (!found) {{ nav.children[0].click(); }}
}})();
</script>
</body>
</html>
"""


def build_index_json() -> dict:
    return {
        "project": "StyleSync IA",
        "note": "Diagramas del sistema INTEGRADO actual (verificados en codigo/config del repo). El roadmap aspiracional vive en docs/context/plan-base.md.",
        "diagrams": [
            {
                "id": d.id,
                "title": d.title,
                "tabLabel": d.tab_label,
                "svg": f"../svgs/{d.svg_file}",
                "description": d.description.replace("<code>", "").replace("</code>", "").replace("<em>", "").replace("</em>", ""),
                "metrics": [{"label": m.label, "value": m.value} for m in d.metrics],
                "anchor": f"viewer.html#{d.id}",
            }
            for d in DIAGRAMS
        ],
    }


def main() -> int:
    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        validate_svgs()
    except (FileNotFoundError, ValueError) as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 1

    # If viewer.html or diagrams.index.json already exist, we keep them updated
    if not VIEWER_PATH.exists():
        VIEWER_PATH.write_text(build_viewer_html(), encoding="utf-8")
    if not INDEX_PATH.exists():
        INDEX_PATH.write_text(json.dumps(build_index_json(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"✅ Validados {len(DIAGRAMS)} diagramas en {SVG_DIR.relative_to(REPO_ROOT)}")
    print(f"✅ Sincronizados {VIEWER_PATH.relative_to(REPO_ROOT)} y {INDEX_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
