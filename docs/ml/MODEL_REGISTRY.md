# Registro de Modelos — StyleMe/StyleSync IA

**Dueño:** Asiento D en turno (Leonardo, Sprint 2). Ver `team-rotation-plan.md` §3/§7 — la
propiedad de este documento rota con Q3.
**Alcance decidido (Tarea 0, Sprint 2, 17-sep-2026):** un documento versionado en el repo es el
mínimo viable de este sprint. No se integra una herramienta externa (MLflow, Weights & Biases)
todavía — se reevalúa cuando el número de modelos o la necesidad de comparar runs lo justifique.
Decisión registrada también en el epic `[EPIC] Q3 — MLOps` de ClickUp.

**Actualización (Sprint 3, PR #31):** Jaicel adoptó MLflow (vía ngrok, corriendo en Colab) para
comparar runs de los notebooks de baseline — ver `docs/adr/adr-sprint-3/ADR-302-mlflow-tracking.md`.
Es tracking de experimentos, **no reemplaza este registro**: MLflow-vía-ngrok es efímero (la URL
muere con la sesión de Colab), este documento sigue siendo el registro permanente de qué modelo
quedó en qué versión. Cuando el primer modelo pase de `experimental` a `candidato`, su fila aquí
debe referenciar el run de MLflow que lo respalda (run ID), no reemplazar la fila por un link.

---

## Estado actual: modelos de runtime y artefactos entrenados

**No hay un checkpoint entrenado del adapter registrado y reproducible en este repositorio.**
Esto no significa que el runtime carezca de modelos: el backend carga Fashion-CLIP para clasificar
prendas y calcular embeddings; el análisis usa prompts zero-shot y puede activar un fallback
ResNet configurable cuando la confianza CLIP no alcanza el umbral. El pipeline VTON consume un
proveedor externo intercambiable (CatVTON/HTTP, Replicate o mock), no un modelo entrenado/versionado
por este repo.

Los notebooks del PR #18 (`notebooks/01_baseline_stylesync_garments2look.ipynb`,
`notebooks/01_baseline_stylesync_garments2lookA.ipynb`, `notebooks/02_eda_visualizacion_outfits.ipynb`
— movidos de la raíz a `notebooks/` en el PR #23) son trabajo **exploratorio** — EDA y una
inferencia de prueba con CatVTON — no un modelo entrenado con versión, dataset y métrica
fijados. No confundir con un entregable de este registro.

Los 3 modelos previstos por el proyecto (`plan-base.md` §11, `openspec/specs/backend/`):

| Modelo | Uso | Estado |
|---|---|---|
| Clasificador de categoría/estética | `garment-analysis-service` | Runtime: Fashion-CLIP zero-shot + fallback ResNet configurable; no hay checkpoint propio de adapter registrado |
| Embeddings de prenda y compatibilidad | `garment-analysis-service` / `recommender-engine` | Embeddings Fashion-CLIP en runtime; no hay modelo propio de compatibilidad promovido |
| Pose y VTON | `pose_check` / `vton-pipeline` | MediaPipe para validación de pose; inferencia mediante provider externo intercambiable |

---

## Tabla de registro

Una fila por versión de modelo entrenado. Se añade una fila cuando un modelo pasa de
`experimental` a estar disponible para consumo por otro servicio — no antes.

| Modelo | Versión | Fecha | Dataset (+versión) | Métrica principal | Artefacto | Estado |
|---|---|---|---|---|---|---|
| CatVTON Inference Pipeline | v0.2.0 | 2026-11-26 | sample_data (curated pairs) | SSIM: 0.7467 (target: 0.70), PSNR: 24.33 dB, Latency p50: 5.2s | docs/ml/vton_benchmark_results.json | candidato |

**Estados válidos:** `experimental` (entrenado, sin evaluar contra el gate de calidad) ·
`candidato` (evaluado, pendiente de promoción) · `producción` (consumido por un servicio real).

---

## Línea Base de Inferencia CatVTON (Paso 5)

Evaluación generada con el arnés reproducible `scripts/eval_catvton.py`:
- **Hardware objetivo:** NVIDIA GeForce RTX 4070 (8GB VRAM) / fallback CPU/Cloud
- **Resolución estándar:** 768x1024
- **Hiperparámetros óptimos recomendados:**
  - `steps`: 30 (balance óptimo calidad/latencia frente a 50)
  - `guidance_scale`: 2.5
  - `seed`: 42
- **Latencia calibrada:** p50 = 5.2s / capa, p95 = 8.5s / capa.
- **Métricas de fidelidad visual:**
  - SSIM medio: `0.7467` (supera umbral mínimo de `0.70`)
  - PSNR medio: `24.33 dB` (supera umbral mínimo de `20.0 dB`)
- **Estimación operativa:** `ESTIMATED_SECONDS_PER_LAYER = 12.0` s/capa (calibrado en backend).

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
