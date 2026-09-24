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
- [x] Decisión de alcance del "registro de modelos" para este sprint, documentada en el
      comentario del epic Q3 antes de escribir código (ClickUp `86e302a40`, 17-sep)

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
3. Vincula esto con los notebooks de PR #18 (movidos a `notebooks/` en el PR #23) — al menos
   anota en el registro que `01_baseline_stylesync_garments2look.ipynb` y
   `02_eda_visualizacion_outfits.ipynb` son trabajo exploratorio, no modelos versionados, para
   que no se confundan con un entregable.

**AC:**
- [x] `docs/ml/MODEL_REGISTRY.md` existe, con al menos una fila (aunque sea "ninguno en
      producción todavía, ver notebooks de baseline")
- [x] Convención de versionado de artefactos documentada
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
- [x] Resultado de investigar el "flaky" documentado (`e2e-audit-2026-09.md` — intermitente,
      no un defecto determinístico)
- [x] Inventario de cobertura E2E actual vs. los 4 flujos, en el comentario del epic Q1

---

### Tarea 3-4: Scaffold E2E de los 4 flujos críticos — 2 días

**Corrección de alcance (17-sep, tras validar contra el código real):** las versiones
anteriores de estas Tareas pedían un E2E "en verde" del flujo de upload. Verificado contra
`main`: `frontend/src/app/{wardrobe,outfits,try-on}/page.tsx` son **stubs** creados en la
Tarea 5 de Sprint 1 solo para que la navegación compile (commit `e2593c3`, "stubs (flow specs
own them)") — la UI real de cada flujo es un epic de otra persona en un sprint futuro
(`wardrobe-flow` → Huascar, Sprint 3; `outfits-flow` → Manuel, Sprint 4; `vton-flow` → Jaicel,
Sprint 6). Escribir un E2E que se espera "en verde" contra una UI que no existe dejaría CI rojo
en `main` durante semanas — spec-first no significa test-antes-que-código-de-otra-persona.

**Alcance real de esta Tarea (coherente con tu mandato de Asiento D — Q1, infraestructura de
test automation, no features de UI):** dejar el **scaffold** de E2E de los 4 flujos críticos,
explícitamente `test.skip(...)`, para que cada dueño de epic solo tenga que quitar el skip y
llenar los pasos cuando construya la UI — no empezar de cero cada vez.

1. `tests/e2e/wardrobe-upload.spec.ts` — `test.skip('sube 1 prenda válida → aparece en
   resultado editable antes de confirmar', () => { /* TODO(sprint-3, Huascar): implementar
   cuando wardrobe-flow tenga UI real — ver wardrobe-flow/spec.md Requirement "Resultado de
   análisis editable antes de confirmar" */ })`. Describe los pasos esperados en comentarios
   (seleccionar archivo → esperar `detectBlur` → confirmar/editar resultado), usando
   `tests/fixtures/api/garmentUploadResponse.json` (ya existe) como referencia de forma de
   dato para cuando se implemente.
2. `tests/e2e/outfit-recommendation.spec.ts` — mismo patrón, `test.skip`, referencia a
   `outfits-flow/spec.md`, TODO apuntando a Sprint 4 / Manuel.
3. `tests/e2e/vton-submit-and-poll.spec.ts` — mismo patrón, referencia a `vton-flow/spec.md`,
   TODO apuntando a Sprint 6 / Jaicel.
4. `tests/e2e/vton-result-view.spec.ts` — mismo patrón, referencia a `vton-flow/spec.md`
   (visualización de resultado), TODO apuntando a Sprint 6 / Jaicel.
5. Añade una nota equivalente en `sprint-3-init-huascar.md` (y deja el mismo tipo de nota
   pendiente para quien redacte los prompts de Sprint 4 y 6): al implementar el flujo, **quitar
   el `skip`** del spec que dejaste, no escribir uno nuevo desde cero.

**AC:**
- [x] Los 4 archivos de scaffold existen, cada uno con `test.skip` + comentario de spec +
      TODO con sprint/owner
- [x] `npm run test:e2e` (en `frontend/`) exit 0 — Playwright reporta los 11 tests nuevos como
      `skipped`, no `failed`
- [x] Nota de "quitar el skip" añadida en `sprint-3-init-huascar.md`
- [ ] PR revisado y mergeado

---

## ⏱️ Cronograma (5 días restantes desde 17-sep)

| Día | Fecha | Tarea |
|---|---|---|
| 1 | mié 17 sep | Aclarar duplicados (advertencia arriba) + Tarea 0 (alcance registro) |
| 2 | jue 18 sep | Tarea 1 (registro de modelos) |
| 3 | vie 19 sep | Tarea 2 (auditoría E2E actual) |
| 4-5 | sáb 20 – lun 22 sep | Tarea 3-4 (scaffold E2E de los 4 flujos) |

---

## ✅ Definition of Done

- [x] Duplicado de "registro de modelos" resuelto — tarea de Manuel (`86e31bcdu`) marcada
      `cancelled` en ClickUp, con comentario cruzado a la vigente (`86e302a42`)
- [x] Dueño de la tarea de E2E confirmado — reasignada de Manuel a Leonardo en ClickUp
      (`86e302a1c`), con comentario citando `team-rotation-plan.md` §7
- [x] `docs/ml/MODEL_REGISTRY.md` existe y refleja el estado real (aunque sea "nada en
      producción, ver baseline")
- [x] Los 4 flujos críticos tienen scaffold E2E (`test.skip`) con referencia a spec + sprint/
      owner que lo implementa — no una feature fingida contra UI que no existe
- [x] `npm run test:e2e` (dentro de `frontend/`) exit 0, incluyendo lo nuevo (skipped, no failed)
- [ ] PR revisado y aprobado por Manuel (Asiento C este sprint) — pendiente

---

## 🤝 Pair Sessions

- **Tarea 0:** Manuel/Jaicel — resolver el duplicado y el alcance del registro, 20 min.
- **Tarea 3-4:** Huascar/Manuel/Jaicel (dueños futuros de cada flujo) — confirma que el
  `test.skip` describe los pasos que ellos realmente necesitan, no una suposición tuya del
  flujo de UI.
- Deja handoff en `[EPIC] Q1` y `[EPIC] Q3` antes del 22-sep — no hay Asiento C específico para
  epics transversales, pero el equipo completo los revisa en el Sprint Review del 23-sep.
