# C4+ Diagrams — StyleSync IA

Seis diagramas de arquitectura del sistema completo, navegables en una sola página interactiva: **[`viewer.html`](./viewer.html)**.

> `viewer.html` es un artefacto **generado** — no lo edites a mano. Su fuente de verdad son los
> SVGs en [`../svgs/`](../svgs/) y la metadata en [`scripts/generate_diagrams.py`](../../../scripts/generate_diagrams.py).
> Para regenerarlo tras un cambio: `python scripts/generate_diagrams.py` desde la raíz del repo.

## Cómo abrirlo

No requiere servidor ni build — es HTML/CSS/JS puro, sin dependencias externas.

```bash
# Windows
start docs/architecture/diagrams/viewer.html

# macOS
open docs/architecture/diagrams/viewer.html

# Linux
xdg-open docs/architecture/diagrams/viewer.html
```

O simplemente ábrelo en el navegador desde el explorador de archivos. Cada pestaña se puede
enlazar directamente con un ancla (`viewer.html#mlops`, `viewer.html#hybrid`, …) — el botón
"🔗 Copiar enlace" de cada diagrama copia esa URL.

## Los 6 diagramas

| # | Diagrama | Propósito | Audiencia |
| :-- | :--- | :--- | :--- |
| 1 | 🔧 [MLOps](../svgs/mlops.svg) | Reproducibilidad end-to-end: Git → DVC → Docker → Model Registry | ML engineers, nuevos contribuyentes |
| 2 | ☁️ [Infraestructura Híbrida](../svgs/hybrid.svg) | Cuándo se usa GPU local (RTX 4070) vs. cloud (H100/A100) y cómo se sincronizan | Infra/DevOps, quien planea costos de GPU |
| 3 | 📊 [Monitoreo de Calidad](../svgs/quality.svg) | Qué se mide sobre cada imagen generada y cómo se dispara una alerta | QA, on-call, ML engineers |
| 4 | 🖥️ [Componentes de Frontend](../svgs/frontend.svg) | Capas de Next.js: páginas, componentes de UI, features de dominio | Frontend devs |
| 5 | 📸 [Protocolo de Entrada](../svgs/protocol.svg) | Requisitos de las fotos de usuario/prenda y el pipeline de validación | Producto, frontend, quien define UX de captura |
| 6 | 🔄 [Ciclo de Vida del Modelo](../svgs/lifecycle.svg) | Fases desde desarrollo hasta producción, incluido el gate de calidad | ML engineers, Product Owner |

## Estructura de archivos

```
docs/architecture/
├── diagrams/
│   ├── viewer.html              # generado — la página interactiva
│   ├── diagrams.index.json      # generado — metadata machine-readable de los 6 diagramas
│   └── README.md                # este archivo
└── svgs/
    ├── mlops.svg
    ├── hybrid.svg
    ├── quality.svg
    ├── frontend.svg
    ├── protocol.svg
    └── lifecycle.svg
```

## Actualizar un diagrama

1. Edita el `.svg` correspondiente en `docs/architecture/svgs/`.
2. Si cambia el título, la descripción o las métricas, edita la lista `DIAGRAMS` en
   `scripts/generate_diagrams.py`.
3. Corre `python scripts/generate_diagrams.py` — regenera `viewer.html` y
   `diagrams.index.json`, y falla con un mensaje claro si algún SVG no existe o no es XML
   válido.
4. Commitea el `.svg`, el script (si cambió) y los dos artefactos generados juntos — nunca
   `viewer.html` sin su fuente.

El workflow `.github/workflows/deploy-architecture.yml` corre este mismo script en cada push a
`docs/architecture/**` y falla el build si `viewer.html` quedaría desactualizado respecto a los
SVGs.

## Documentación técnica relacionada

- [`docs/context/plan-base.md`](../../context/plan-base.md) — planteamiento completo del proyecto (full-stack)
- [`docs/adr/`](../../adr/) — decisiones de arquitectura registradas
- [`docs/risks/`](../../risks/) — registro de riesgos
- [`.speckit/constitution.md`](../../../.speckit/constitution.md) — gobernanza del equipo

## Stack tecnológico

Python · PyTorch · FastAPI · Next.js — probador virtual (Virtual Try-On) con IA. Desarrollo en
GPU local (RTX 4070, 8GB VRAM); entrenamiento e inferencia a escala en GPU cloud (H100/A100,
40+ GB VRAM). MVP de 18 semanas.
