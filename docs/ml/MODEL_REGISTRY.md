# Registro de Modelos — StyleMe/StyleSync IA

**Dueño:** Asiento D en turno (Leonardo, Sprint 2). Ver `team-rotation-plan.md` §3/§7 — la
propiedad de este documento rota con Q3.
**Alcance decidido (Tarea 0, Sprint 2, 17-sep-2026):** un documento versionado en el repo es el
mínimo viable de este sprint. No se integra una herramienta externa (MLflow, Weights & Biases)
todavía — se reevalúa cuando el número de modelos o la necesidad de comparar runs lo justifique.
Decisión registrada también en el epic `[EPIC] Q3 — MLOps` de ClickUp.

---

## Estado actual: sin modelos en producción

**Ningún modelo de este proyecto está entrenado, versionado ni desplegado en producción a la
fecha de este documento.** Los notebooks del PR #18 (`01_baseline_stylesync_garments2look.ipynb`,
`01_baseline_stylesync_garments2lookA.ipynb`, `02_eda_visualizacion_outfits.ipynb`) son trabajo
**exploratorio** — EDA y una inferencia de prueba con CatVTON — no un modelo entrenado con
versión, dataset y métrica fijados. No confundir con un entregable de este registro.

Los 3 modelos previstos por el proyecto (`plan-base.md` §11, `openspec/specs/backend/`):

| Modelo | Uso | Estado |
|---|---|---|
| Clasificador de estética (CLIP zero-shot / fine-tuned) | `garment-analysis-service` | No entrenado — zero-shot con prompts es el camino inicial (`sprint-3-init-manuel.md`) |
| Embedding de compatibilidad cromática | `recommender-engine` | No entrenado |
| Modelo de pose/VTON | `vton-pipeline` | No entrenado — se usa un proveedor externo swappable (`VtonInferenceProvider`) |

---

## Tabla de registro

Una fila por versión de modelo entrenado. Se añade una fila cuando un modelo pasa de
`experimental` a estar disponible para consumo por otro servicio — no antes.

| Modelo | Versión | Fecha | Dataset (+versión) | Métrica principal | Artefacto | Estado |
|---|---|---|---|---|---|---|
| _(ninguno todavía)_ | — | — | — | — | — | — |

**Estados válidos:** `experimental` (entrenado, sin evaluar contra el gate de calidad) ·
`candidato` (evaluado, pendiente de promoción) · `producción` (consumido por un servicio real).

---

## Convención de versionado de artefactos

Cuando exista el primer modelo entrenado:

- **Nombre de archivo:** `<modelo>-v<semver>-<fecha-YYYYMMDD>.<ext>` — ej.
  `aesthetic-clip-finetuned-v0.1.0-20261005.pt`.
- **Versión (semver):** `MAJOR` cambia con un cambio de arquitectura o de tarea; `MINOR` con
  reentrenamiento sobre datos nuevos o cambio de hiperparámetros que mueve la métrica; `PATCH`
  para fixes que no deberían mover la métrica (ej. corrección de un bug de normalización).
- **Dataset referenciado por versión, no por nombre suelto** — si el dataset de garments cambia
  de tamaño o composición, es una versión de dataset distinta, y la fila del registro debe
  distinguirlo (ej. `garments2look-v2`).
- **Ruta del artefacto:** mientras no haya almacenamiento de modelos definido (fuera del
  alcance de este sprint — ver `ADR-002-stack-backend.md`), anotar "no persistido, solo
  reproducible desde el notebook/script + seed" en vez de una ruta inventada.

## Gate de promoción a producción (referencia adelantada)

El gate formal de promoción de modelo es una historia de **Sprint 4** (`Q3`, ver
`clickup_estructura.md`). Este registro no implementa ese gate — solo dejar la estructura de
datos lista para cuando exista, evitando que Sprint 4 tenga que inventar el formato de cero.

---

## Historial de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-09-17 | Creado (Sprint 2, Asiento D — Leonardo). Sin modelos en producción; estructura y convención de versionado definidas. |
