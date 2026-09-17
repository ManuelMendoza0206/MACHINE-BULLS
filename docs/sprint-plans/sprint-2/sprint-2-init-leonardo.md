# Sprint 2 — Inicialización | Asiento D (Leonardo Ibarra López)

**Rol:** Infra/Release — Registro de modelos (Q3) + Suite E2E (Q1)
**Ventana:** 9 – 22 sep 2026 (hoy: 17-sep, **quedan 5 días**)
**Epics transversales:** `Q3` (registro de modelos, historia de este sprint),
`Q1` (test automation & coverage, historia de este sprint)

> **Contraste con Sprint 1:** en Sprint 1 fuiste Asiento A (feature lead de frontend). Este
> sprint eres Asiento D — infra/release, no features de UI. No abras trabajo nuevo de
> componentes o pantallas; eso es de Jaicel (Asiento A) y Huascar (Asiento B) este sprint.

---

## 🎯 Objetivo de Sprint

Dos entregables concretos, ninguno de los cuales existe todavía según la auditoría del 17-sep:

1. **Registro y versionado de modelos** — trazabilidad de qué modelo (CLIP fine-tuned,
   embedding de compatibilidad) está en qué versión, entrenado con qué datos, con qué métrica.
2. **Suite E2E completa** de los 4 flujos críticos: upload de prenda → recomendación de outfit
   → ciclo VTON (submit → polling → resultado) → visualización de resultado.

---

## ⚠️ Antes de empezar — 2 cosas que aclarar, no asumir

1. **Duplicado de tarea:** ClickUp tiene "Registro y versionado de modelos" asignada a ti y
   "Model Registry & Versioning" (lista `Data`) asignada a Manuel, mismo vencimiento (22-sep).
   Confirma con Manuel cuál es la vigente antes de trabajar dos veces lo mismo.
2. **Dueño real de la Suite E2E:** por `team-rotation-plan.md` §3, el Q1 de este sprint es
   tuyo. Pero en ClickUp la tarea "Completar la suite E2E cubriendo los 4 flujos críticos" está
   asignada a Manuel. Aclara en el standup si la tomas tú (como dice la rotación) o si Manuel
   ya avanzó algo y prefieren dejarla con él — no la dupliques sin confirmar.

---

## 📋 Tareas (orden estricto, asumiendo que confirmas ambas como tuyas)

### Tarea 0: Definir el alcance real de "registro de modelos" — 0.5 días

Todavía no existe ningún modelo entrenado en este proyecto (los notebooks de PR #18 son
baseline/EDA, no un modelo versionado en producción). Antes de construir infraestructura de
registro, define con Manuel/Jaicel (dueños de los epics de ML en `Data`) qué mínimo viable
tiene sentido *ahora*:

1. ¿Un archivo `MODEL_REGISTRY.md` versionado en el repo (nombre, versión, fecha, dataset,
   métrica, ruta de artefacto) es suficiente para este sprint, o se espera una herramienta
   (MLflow, W&B) ya integrada?
2. Registra la decisión — este es exactamente el tipo de alcance que si se asume mal, se
   redescubre a medio sprint (como pasó con P0#3 y los notebooks).

**Aceptación:**
- [ ] Decisión de alcance del "registro de modelos" para este sprint, documentada en el
      comentario del epic Q3 antes de escribir código

---

### Tarea 1: Registro de modelos — mínimo viable — 1.5 días

**Depende de la Tarea 0.** Si el alcance acordado es un documento versionado:

1. `docs/ml/MODEL_REGISTRY.md` — tabla con: nombre del modelo, versión (semver o hash de
   commit), fecha de entrenamiento, dataset/versión de dataset usado, métrica principal
   reportada, ruta del artefacto (o "no persistido aún" si aplica), estado
   (`experimental`/`candidato`/`producción`).
2. Si además se acuerda una convención de nombres de artefactos (ej. `<modelo>-v<semver>-
   <fecha>.pt`), documéntala aquí mismo — es lo que usará quien primero promueva un modelo a
   producción (Sprint 4, gate de promoción de modelo, Q3 sigue apareciendo ahí).
3. Vincula esto con los notebooks de PR #18 — al menos anota en el registro que
   `01_baseline_stylesync_garments2look.ipynb` y `02_eda_visualizacion_outfits.ipynb` son
   trabajo exploratorio, no modelos versionados, para que no se confundan con un entregable.

**AC:**
- [ ] `docs/ml/MODEL_REGISTRY.md` existe, con al menos una fila (aunque sea "ninguno en
      producción todavía, ver notebooks de baseline")
- [ ] Convención de versionado de artefactos documentada
- [ ] PR revisado y mergeado

---

### Tarea 2: Auditoría de la suite E2E actual — 0.5 días

**Solo si confirmaste que esta tarea es tuya (ver advertencia arriba).**

1. `cd frontend && npm run test:e2e` — corre lo que ya existe (`navigation.spec.ts`,
   `theme.spec.ts`). En la auditoría del 17-sep, 3 casos salieron "flaky" (fallan al primer
   intento, pasan en retry) por cold-start del dev server en sandbox — confirma si es un
   problema real o del entorno antes de dar la suite actual por buena.
2. Inventario contra los 4 flujos críticos del objetivo: ¿cuántos tienen algún test E2E hoy?
   (Respuesta esperada: 0 de los 4 — navigation/theme no son flujos de negocio.)

**AC:**
- [ ] Resultado de investigar el "flaky" documentado
- [ ] Inventario de cobertura E2E actual vs. los 4 flujos, en el comentario del epic Q1

---

### Tarea 3: E2E del flujo de upload de prenda — 1.5 días

**Spec:** `openspec/specs/frontend/wardrobe-flow/spec.md` — Requirement "Subida por lote con
techo de concurrencia" (la base ya existe: `detectBlur`, `uploadQueue` del PR #10 de Huascar).

1. `tests/e2e/wardrobe-upload.spec.ts` — sube 1 prenda válida → aparece en el resultado
   editable antes de confirmar (segundo Requirement de la spec). Usa los fixtures de
   `tests/fixtures/api/garmentUploadResponse.json` (ya existen) o mockea la respuesta del
   backend si el endpoint real no está listo (coordina con Huascar/Jaicel — puede no estarlo
   aún, ver sus prompts de este sprint).
2. Caso de error: subida que excede el techo de concurrencia → mensaje de error, no crash.

**AC:**
- [ ] Test E2E del flujo de upload, camino feliz + 1 caso de error
- [ ] PR revisado y mergeado

---

### Tarea 4: E2E del flujo de recomendación + inicio de VTON — 1 día (si alcanza)

**Spec:** `frontend/outfits-flow/spec.md` (aún no implementado como feature — este test puede
quedar como esqueleto/skip documentado si el flujo de UI todavía no existe).

Si el flujo de outfits/VTON no tiene UI todavía (epics de Sprint 4 y 6 respectivamente), no
inventes un test contra código que no existe — documenta el gap y dedica el tiempo restante a
reforzar la Tarea 3, que sí tiene base real.

**AC:**
- [ ] O el test existe y pasa, o el gap está documentado explícitamente (no un test vacío
      fingiendo cobertura)

---

## ⏱️ Cronograma (5 días restantes desde 17-sep)

| Día | Fecha | Tarea |
|---|---|---|
| 1 | mié 17 sep | Aclarar duplicados (advertencia arriba) + Tarea 0 (alcance registro) |
| 2 | jue 18 sep | Tarea 1 (registro de modelos) |
| 3 | vie 19 sep | Tarea 2 (auditoría E2E actual) |
| 4-5 | sáb 20 – lun 22 sep | Tarea 3 (E2E upload) + Tarea 4 si alcanza |

---

## ✅ Definition of Done

- [ ] Duplicado de "registro de modelos" resuelto con Manuel antes de reportar avance
- [ ] Dueño de la tarea de E2E confirmado con el equipo (tú o Manuel, no ambos por separado)
- [ ] `docs/ml/MODEL_REGISTRY.md` existe y refleja el estado real (aunque sea "nada en
      producción, ver baseline")
- [ ] Al menos 1 flujo crítico (upload) con test E2E real, no solo navegación/tema
- [ ] `npm run test:e2e` (dentro de `frontend/`) exit 0, incluyendo lo nuevo
- [ ] PRs mergeados con ≥1 aprobación y declaración de uso de IA

---

## 🤝 Pair Sessions

- **Tarea 0:** Manuel/Jaicel — resolver el duplicado y el alcance del registro, 20 min.
- **Tarea 3:** Huascar (dueño de `uploadQueue`/`detectBlur`) si necesitas contexto del flujo.
- Deja handoff en `[EPIC] Q1` y `[EPIC] Q3` antes del 22-sep — no hay Asiento C específico para
  epics transversales, pero el equipo completo los revisa en el Sprint Review del 23-sep.
