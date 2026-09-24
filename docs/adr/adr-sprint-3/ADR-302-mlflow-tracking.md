# ADR 302 — MLflow + ngrok para tracking de experimentos

Estado: aceptado
Fecha: 2026-09-24 (PR #31, Jaicel)

## Contexto

`docs/ml/MODEL_REGISTRY.md` (Sprint 2, Leonardo, Tarea 0-1) dejó el alcance de registro de
modelos como un documento versionado en el repo, explícitamente **sin herramienta externa**
ese sprint, con la nota de reevaluar "cuando el número de modelos o la necesidad de comparar
runs lo justifique". Los notebooks de baseline (01 VTON, 02 composición) empezaron a generar
corridas reales con métricas (SSIM 0.7401, cobertura 88%, FITB de 500 casos) que sí necesitan
compararse entre sí — el punto que `MODEL_REGISTRY.md` anticipaba.

## Decision

Se adopta **MLflow** para tracking de experimentos, corriendo en el entorno de notebooks
(Colab) y expuesto vía **ngrok** (`backend/scripts/mlflow_ngrok.py`) para que el equipo pueda
ver el dashboard sin desplegar infraestructura propia. Dependencias añadidas a
`backend/pyproject.toml`: `mlflow`, `psutil`, `pyngrok`. Artefactos de MLflow excluidos de git
vía `.gitignore`.

## Alternativas

No hay evidencia en el PR de que se evaluaran alternativas (Weights & Biases, un MLflow
autoalojado en un servidor propio, o seguir solo con `MODEL_REGISTRY.md` manual). Dado que
`MODEL_REGISTRY.md` ya había señalado esta decisión como pendiente de reevaluación, habría sido
el momento natural de comparar opciones — no ocurrió, o no quedó documentado. **Se anota como
gap de esta ADR, no se inventa una comparación que no existió.**

## Consecuencias

El equipo gana comparación real de runs sin montar infraestructura — razonable para el alcance
académico del proyecto. El costo: MLflow vía ngrok en Colab es una URL efímera (se cae al
cerrar la sesión de Colab), no un tracking server persistente — no reemplaza la necesidad de
`MODEL_REGISTRY.md` como registro *permanente* de qué modelo quedó en qué versión; son
complementarios, no el mismo propósito. `MODEL_REGISTRY.md` debe actualizarse para referenciar
esto explícitamente (pendiente — ver seguimiento en `docs/sprint-plans/sprint-3/sprint-3-review.md`).
