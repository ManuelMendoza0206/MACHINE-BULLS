#!/usr/bin/env python3
"""Generate the interactive C4+ architecture viewer for StyleSync IA.

Reads the six SVG diagrams from ``docs/architecture/svgs/``, embeds them into a
single self-contained HTML page (no external dependencies — everything inline),
and writes:

  - ``docs/architecture/diagrams/viewer.html``     the interactive viewer
  - ``docs/architecture/diagrams/diagrams.index.json``  machine-readable metadata

``viewer.html`` is generated output — do not hand-edit it. Change the metadata
below or the SVG files, then re-run this script:

    python scripts/generate_diagrams.py

Exits non-zero (with a clear message) if an SVG is missing or not well-formed
XML, or if the generated HTML doesn't contain everything it's supposed to —
this is what CI runs on every push to ``docs/architecture/``.
"""

from __future__ import annotations

import json
import sys
import xml.dom.minidom as minidom
from dataclasses import dataclass, field
from pathlib import Path

try:  # Windows terminals sometimes default to a non-UTF-8 codepage; the checkmarks below need it.
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
        id="mlops",
        icon="🔧",
        tab_label="MLOps",
        title="Arquitectura MLOps",
        svg_file="mlops.svg",
        description=(
            "Pipeline de versionado end-to-end que garantiza reproducibilidad total: cada "
            "commit de código (Git) está vinculado a una versión exacta de datos y modelos "
            "(DVC), empaquetada en una imagen de contenedor (Docker) y publicada en un "
            "catálogo versionado (Model Registry). Cualquier experimento pasado puede "
            "rehacerse desde cero con un solo comando."
        ),
        metrics=[
            Metric("Reproducibilidad", "100%"),
            Metric("Setup de entorno", "5 min"),
            Metric("Experimentos trackeados", "50+"),
        ],
    ),
    Diagram(
        id="hybrid",
        icon="☁️",
        tab_label="Infra Híbrida",
        title="Infraestructura Híbrida",
        svg_file="hybrid.svg",
        description=(
            "Desarrollo iterativo en una RTX 4070 local (8GB VRAM, costo marginal $0) para "
            "prototipar rápido, y entrenamiento/inferencia a escala en GPUs cloud H100/A100 "
            "(40+ GB VRAM) cuando el experimento está listo para correr en serio. Git, DVC y "
            "S3 mantienen ambos entornos sincronizados sin duplicar trabajo manual."
        ),
        metrics=[
            Metric("VRAM local", "8 GB"),
            Metric("VRAM cloud", "40+ GB"),
            Metric("Costo de desarrollo", "$0"),
        ],
    ),
    Diagram(
        id="quality",
        icon="📊",
        tab_label="Calidad",
        title="Monitoreo de Calidad",
        svg_file="quality.svg",
        description=(
            "Toda imagen generada se evalúa automáticamente en tres dimensiones — calidad "
            "visual (identity, fidelidad de prenda, geometría, coherencia de capas), "
            "performance (latencia, uso de GPU, throughput, tasa de error) y artefactos "
            "(issues visuales, anomalías anatómicas, drift del modelo) — y cualquier "
            "desviación dispara una alerta por email, Slack o dashboard. Nunca falla en "
            "silencio."
        ),
        metrics=[
            Metric("Identity score", "85%"),
            Metric("Latencia", "<60s"),
            Metric("Error rate", "<1%"),
        ],
    ),
    Diagram(
        id="frontend",
        icon="🖥️",
        tab_label="Frontend",
        title="Componentes de Frontend",
        svg_file="frontend.svg",
        description=(
            "Arquitectura en tres capas sobre Next.js App Router: páginas que orquestan la "
            "navegación, componentes de UI reutilizables sin lógica de negocio, y features de "
            "dominio que encapsulan estado y llamadas a la API. TanStack Query cachea datos de "
            "servidor, Zustand maneja estado de cliente puro, y WebSocket entrega "
            "actualizaciones en tiempo real durante la generación."
        ),
        metrics=[
            Metric("Páginas", "5"),
            Metric("Componentes base", "8"),
            Metric("Tiempo real", "WebSocket"),
        ],
    ),
    Diagram(
        id="protocol",
        icon="📸",
        tab_label="Protocolo de Entrada",
        title="Protocolo de Entrada de Imágenes",
        svg_file="protocol.svg",
        description=(
            "Cada solicitud de try-on virtual requiere dos fotos que cumplen requisitos "
            "estrictos y verificables: una foto de cuerpo en A-Pose sobre fondo neutro, y una "
            "foto de la prenda extendida sobre fondo liso, ambas en 512×512px como mínimo. La "
            "validación corre primero en el cliente (feedback inmediato) y luego en el "
            "servidor (garantía real); un rechazo siempre viene con una razón específica y "
            "accionable, nunca un error genérico."
        ),
        metrics=[
            Metric("Pose requerida", "A-Pose"),
            Metric("Resolución mínima", "512×512px"),
            Metric("Validación", "Automática"),
        ],
    ),
    Diagram(
        id="lifecycle",
        icon="🔄",
        tab_label="Ciclo de Vida",
        title="Ciclo de Vida del Modelo",
        svg_file="lifecycle.svg",
        description=(
            "Todo modelo recorre cinco fases antes de servir tráfico real: desarrollo (código "
            "+ datos + modelo base), entrenamiento (con tracking de experimentos), evaluación "
            "(métricas de calidad objetivas), un gate de decisión que aprueba o rechaza, y "
            "solo entonces producción (registro de modelos → despliegue). Un rechazo no es un "
            "callejón sin salida: alimenta un bucle de reentrenamiento con el feedback del "
            "evaluador."
        ),
        metrics=[
            Metric("Fases", "5"),
            Metric("Gate de calidad", "Obligatorio"),
            Metric("Monitoreo", "Continuo en producción"),
        ],
    ),
]


def load_svg(diagram: Diagram) -> str:
    path = SVG_DIR / diagram.svg_file
    if not path.exists():
        raise FileNotFoundError(f"SVG faltante para '{diagram.id}': {path}")
    content = path.read_text(encoding="utf-8")
    try:
        minidom.parseString(content)
    except Exception as exc:  # noqa: BLE001 - re-raised with context below
        raise ValueError(f"SVG inválido en {path}: {exc}") from exc
    # Drop the XML prolog if present — it's invalid when inlined in HTML.
    if content.lstrip().startswith("<?xml"):
        content = content.split("?>", 1)[1].lstrip()
    return content


def render_tab_button(diagram: Diagram, index: int) -> str:
    active = " active" if index == 0 else ""
    return (
        f'<button class="tab-btn{active}" data-target="{diagram.id}" '
        f'role="tab" aria-selected="{"true" if index == 0 else "false"}" '
        f'id="tab-{diagram.id}" aria-controls="panel-{diagram.id}">'
        f'<span class="tab-icon">{diagram.icon}</span>'
        f'<span class="tab-label">{diagram.tab_label}</span>'
        f"</button>"
    )


def render_metric_card(metric: Metric) -> str:
    return (
        '<div class="metric-card">'
        f'<div class="metric-value">{metric.value}</div>'
        f'<div class="metric-label">{metric.label}</div>'
        "</div>"
    )


def render_panel(diagram: Diagram, index: int) -> str:
    svg_markup = load_svg(diagram)
    active = " active" if index == 0 else ""
    metrics_html = "".join(render_metric_card(m) for m in diagram.metrics)
    return f"""
    <section class="panel{active}" id="panel-{diagram.id}" data-diagram="{diagram.id}"
             role="tabpanel" aria-labelledby="tab-{diagram.id}">
      <div class="panel-header">
        <h2>{diagram.icon} {diagram.title}</h2>
        <p class="panel-desc">{diagram.description}</p>
      </div>

      <div class="toolbar">
        <div class="zoom-controls" role="group" aria-label="Controles de zoom">
          <button class="tool-btn zoom-out" data-diagram="{diagram.id}" aria-label="Alejar">−</button>
          <span class="zoom-level" data-diagram="{diagram.id}">100%</span>
          <button class="tool-btn zoom-in" data-diagram="{diagram.id}" aria-label="Acercar">+</button>
        </div>
        <div class="action-buttons">
          <button class="tool-btn action-btn download-btn" data-diagram="{diagram.id}">⬇ Descargar PNG</button>
          <button class="tool-btn action-btn copy-btn" data-diagram="{diagram.id}">🔗 Copiar enlace</button>
        </div>
      </div>

      <div class="svg-viewport">
        <div class="svg-stage" data-diagram="{diagram.id}" style="transform: scale(1)">
          {svg_markup}
        </div>
      </div>

      <div class="metrics-row">
        {metrics_html}
      </div>
    </section>"""


PAGE_TEMPLATE = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>StyleSync IA — Arquitectura Interactiva (C4+)</title>
<meta name="description" content="Diagramas de arquitectura C4+ interactivos de StyleSync IA: MLOps, infraestructura híbrida, calidad, frontend, protocolo de entrada y ciclo de vida del modelo." />
<style>
__CSS__
</style>
</head>
<body>
  <header class="hero">
    <div class="hero-inner">
      <p class="eyebrow">StyleSync IA · Documentación Técnica</p>
      <h1>Arquitectura Interactiva <span class="badge-c4">C4+</span></h1>
      <p class="hero-sub">Seis diagramas navegables del sistema completo: desde el pipeline de MLOps hasta el ciclo de vida del modelo en producción.</p>
    </div>
  </header>

  <nav class="tabs" role="tablist" aria-label="Diagramas de arquitectura">
__TABS__
  </nav>

  <main class="panels">
__PANELS__
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>StyleSync IA</strong> — Virtual Try-On con IA
        <span class="footer-dot">·</span> Python · PyTorch · FastAPI · Next.js
        <span class="footer-dot">·</span> RTX 4070 local + H100/A100 cloud
      </div>
      <div class="footer-links">
        <a href="./README.md">Documentación de diagramas</a>
        <span class="footer-dot">·</span>
        <a href="../../context/plan-base.md">Plan base del proyecto</a>
        <span class="footer-dot">·</span>
        <a href="../../../README.md">Repositorio</a>
      </div>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
__JS__
</script>
</body>
</html>
"""


CSS = """
  :root {
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --secondary: #7c3aed;
    --teal: #06b6d4;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --gray: #6b7280;
    --text: #1f2937;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --border: #e5e7eb;
    --shadow: 0 1px 3px rgba(0,0,0,.06), 0 8px 24px -8px rgba(30,41,59,.15);
    --radius: 14px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  a { color: var(--primary); }

  .hero {
    background: linear-gradient(120deg, var(--primary) 0%, var(--secondary) 60%, var(--teal) 100%);
    color: #fff;
    padding: 48px 20px 56px;
    text-align: center;
    animation: fadeIn .6s ease both;
  }
  .hero-inner { max-width: 900px; margin: 0 auto; }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: .12em;
    font-size: .78rem;
    font-weight: 700;
    opacity: .85;
    margin: 0 0 10px;
  }
  .hero h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); margin: 0 0 12px; font-weight: 800; }
  .badge-c4 {
    display: inline-block;
    background: rgba(255,255,255,.18);
    border: 1px solid rgba(255,255,255,.4);
    border-radius: 999px;
    padding: 2px 14px;
    font-size: .7em;
    vertical-align: middle;
    margin-left: 6px;
  }
  .hero-sub { font-size: 1.02rem; opacity: .92; max-width: 640px; margin: 0 auto; line-height: 1.55; }

  .tabs {
    max-width: 1400px;
    margin: -26px auto 0;
    padding: 0 20px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    position: relative;
    z-index: 2;
  }
  .tab-btn {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 12px 20px;
    font-size: .92rem;
    font-weight: 600;
    color: var(--gray);
    cursor: pointer;
    box-shadow: var(--shadow);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform .18s ease, color .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .tab-btn:hover { transform: translateY(-2px); color: var(--primary); }
  .tab-btn.active {
    background: linear-gradient(120deg, var(--primary), var(--secondary));
    color: #fff;
    border-color: transparent;
  }
  .tab-icon { font-size: 1.05em; }

  .panels { max-width: 1400px; margin: 32px auto 60px; padding: 0 20px; }

  .panel { display: none; animation: fadeIn .4s ease both; }
  .panel.active { display: block; }

  .panel-header {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 26px 28px;
    margin-bottom: 18px;
  }
  .panel-header h2 { margin: 0 0 10px; font-size: 1.4rem; }
  .panel-desc { margin: 0; line-height: 1.65; color: #374151; max-width: 900px; }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 18px;
    box-shadow: var(--shadow);
  }
  .zoom-controls { display: flex; align-items: center; gap: 10px; }
  .tool-btn {
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: .88rem;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: background .15s ease, transform .15s ease, border-color .15s ease;
  }
  .tool-btn:hover { background: #f1f5f9; border-color: var(--primary); }
  .tool-btn:active { transform: scale(.96); }
  .zoom-out, .zoom-in { width: 38px; padding: 8px 0; font-size: 1.1rem; line-height: 1; }
  .zoom-level { min-width: 48px; text-align: center; font-weight: 700; color: var(--gray); font-size: .85rem; }
  .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
  .action-btn.copy-btn.copied { background: var(--success); color: #fff; border-color: var(--success); }

  .svg-viewport {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: auto;
    padding: 24px;
    min-height: 220px;
  }
  .svg-stage {
    width: fit-content;
    transform-origin: top left;
    transition: transform .15s ease;
    margin: 0 auto;
  }
  .svg-stage svg { display: block; width: 100%; max-width: 720px; height: auto; }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 18px;
  }
  .metric-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 16px;
    text-align: center;
    animation: fadeIn .5s ease both;
  }
  .metric-value {
    font-size: 1.5rem;
    font-weight: 800;
    background: linear-gradient(120deg, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .metric-label { margin-top: 4px; font-size: .82rem; color: var(--gray); font-weight: 600; }

  .site-footer {
    border-top: 1px solid var(--border);
    padding: 24px 20px 40px;
    background: #fff;
  }
  .footer-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    justify-content: space-between;
    font-size: .85rem;
    color: var(--gray);
  }
  .footer-links a { color: var(--gray); text-decoration: none; }
  .footer-links a:hover { color: var(--primary); text-decoration: underline; }
  .footer-dot { margin: 0 6px; opacity: .6; }

  .toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translate(-50%, 20px);
    background: var(--text);
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: .85rem;
    font-weight: 600;
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s ease, transform .25s ease;
    z-index: 50;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 640px) {
    .hero { padding: 36px 16px 48px; }
    .tabs { margin-top: -20px; gap: 8px; }
    .tab-btn { padding: 10px 14px; font-size: .85rem; }
    .panel-header { padding: 20px 18px; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .action-buttons { justify-content: stretch; }
    .action-btn { flex: 1; }
    .metrics-row { grid-template-columns: 1fr; }
    .svg-viewport { padding: 14px; }
  }
"""


JS = """
(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var zoomState = {};

  function activate(id) {
    tabs.forEach(function (btn) {
      var isActive = btn.dataset.target === id;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.diagram === id);
    });
    if (history.replaceState) {
      history.replaceState(null, '', '#' + id);
    } else {
      location.hash = id;
    }
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activate(btn.dataset.target);
    });
  });

  var initial = (location.hash || '').replace('#', '');
  if (initial && document.getElementById('panel-' + initial)) {
    activate(initial);
  }

  function getZoom(id) {
    return zoomState[id] || 1;
  }

  function setZoom(id, value) {
    var clamped = Math.min(2.5, Math.max(0.5, value));
    zoomState[id] = clamped;
    var stage = document.querySelector('.svg-stage[data-diagram="' + id + '"]');
    if (stage) stage.style.transform = 'scale(' + clamped + ')';
    var label = document.querySelector('.zoom-level[data-diagram="' + id + '"]');
    if (label) label.textContent = Math.round(clamped * 100) + '%';
  }

  document.querySelectorAll('.zoom-in').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.diagram;
      setZoom(id, getZoom(id) + 0.1);
    });
  });
  document.querySelectorAll('.zoom-out').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.diagram;
      setZoom(id, getZoom(id) - 0.1);
    });
  });

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.diagram;
      var url = location.href.split('#')[0] + '#' + id;
      var done = function () {
        btn.classList.add('copied');
        var original = btn.textContent;
        btn.textContent = '✓ ¡Copiado!';
        showToast('Enlace copiado al portapapeles');
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.textContent = original;
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () {
          window.prompt('Copia el enlace:', url);
        });
      } else {
        window.prompt('Copia el enlace:', url);
      }
    });
  });

  function downloadSvgAsPng(svgEl, filename) {
    var clone = svgEl.cloneNode(true);
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    var viewBox = (svgEl.getAttribute('viewBox') || '0 0 680 400').split(/\\s+/).map(Number);
    var width = viewBox[2] || 680;
    var height = viewBox[3] || 400;
    var scale = 2; // export at 2x for a crisp PNG

    var xml = new XMLSerializer().serializeToString(clone);
    var svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (!blob) { showToast('No se pudo generar el PNG en este navegador'); return; }
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        showToast('PNG descargado: ' + filename);
      }, 'image/png');
    };
    img.onerror = function () {
      showToast('No se pudo renderizar el SVG para exportar');
    };
    img.src = svgDataUrl;
  }

  document.querySelectorAll('.download-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.diagram;
      var svg = document.querySelector('#panel-' + id + ' svg');
      if (!svg) { showToast('Diagrama no disponible'); return; }
      downloadSvgAsPng(svg, 'stylesync-' + id + '.png');
    });
  });

  document.documentElement.style.scrollBehavior = 'smooth';
})();
"""


def build_html() -> str:
    tabs_html = "\n".join(render_tab_button(d, i) for i, d in enumerate(DIAGRAMS))
    panels_html = "\n".join(render_panel(d, i) for i, d in enumerate(DIAGRAMS))
    html = PAGE_TEMPLATE
    html = html.replace("__CSS__", CSS)
    html = html.replace("__JS__", JS)
    html = html.replace("__TABS__", tabs_html)
    html = html.replace("__PANELS__", panels_html)
    return html


def build_index() -> dict:
    return {
        "project": "StyleSync IA",
        "generatedBy": "scripts/generate_diagrams.py",
        "diagrams": [
            {
                "id": d.id,
                "title": d.title,
                "tabLabel": d.tab_label,
                "svg": f"../svgs/{d.svg_file}",
                "description": d.description,
                "metrics": [{"label": m.label, "value": m.value} for m in d.metrics],
                "anchor": f"viewer.html#{d.id}",
            }
            for d in DIAGRAMS
        ],
    }


def validate(html: str) -> list[str]:
    """Return a list of problems found (empty = all good)."""
    problems: list[str] = []
    for d in DIAGRAMS:
        if f'id="panel-{d.id}"' not in html:
            problems.append(f"Falta el panel de '{d.id}' en el HTML generado")
        if f'data-target="{d.id}"' not in html:
            problems.append(f"Falta el botón de tab de '{d.id}' en el HTML generado")
        svg_path = SVG_DIR / d.svg_file
        if not svg_path.exists():
            problems.append(f"No existe el archivo SVG referenciado: {svg_path}")
    if "<script>" not in html or "</script>" not in html:
        problems.append("El HTML generado no contiene el bloque <script> esperado")
    return problems


def main() -> int:
    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        html = build_html()
    except (FileNotFoundError, ValueError) as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 1

    problems = validate(html)
    if problems:
        print("❌ Validación falló:", file=sys.stderr)
        for p in problems:
            print(f"   - {p}", file=sys.stderr)
        return 1

    VIEWER_PATH.write_text(html, encoding="utf-8")
    INDEX_PATH.write_text(json.dumps(build_index(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"✅ Generado {VIEWER_PATH.relative_to(REPO_ROOT)} ({len(DIAGRAMS)} diagramas)")
    print(f"✅ Generado {INDEX_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
