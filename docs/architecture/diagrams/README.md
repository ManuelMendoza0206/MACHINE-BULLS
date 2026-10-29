# Arquitectura interactiva — StyleSync IA

Visor sin dependencias: `viewer.html` (HTML/CSS/JS puro, los SVG bajan de `../svgs/`).
Doble-click o: `start docs/architecture/diagrams/viewer.html` (Windows).

**Regla de esta carpeta**: solo diagramas del sistema **integrado actual** —
cada caja debe corresponder a archivos reales del repo (código o config).
El roadmap aspiracional vive en `docs/context/plan-base.md`, no aquí.

| # | Diagrama | Qué muestra (ref. en el repo) |
|---|----------|-------------------------------|
| 1 | 🧰 [Stack](../svgs/stack.svg) | compose: 5 contenedores + CatVTON nativo en host GPU (`infra/docker-compose.yml`, `infra/.env`) |
| 2 | 🔄 [Pipeline](../svgs/pipeline.svg) | estados reales del job VTON (`backend/src/domain/enums.py`) |
| 3 | 📸 [Protocolo](../svgs/protocol.svg) | validación real de entrada (`backend/src/services/pose_check.py`, `frontend/src/lib/vision/`) |
| 4 | 🧪 [Pruebas](../svgs/testing.svg) | `backend/tests`, `frontend/tests/e2e`, `infra/smoke.sh` |
| 5 | 🚀 [Despliegue](../svgs/deployment.svg) | 4 modos por env (`backend/src/services/vton/provider.py`) |

Los 5 diagramas anteriores (MLOps/DVC, híbrida cloud, monitoreo de calidad,
frontend con WebSocket, ciclo de vida) eran **aspiracionales** y se retiraron
de este visor: no había código detrás (DVC, H100, WebSocket, alertas).

Metadatos machine-readable: `diagrams.index.json`.
