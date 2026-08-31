# 🔍 Revisión Crítica del Plan de Remediación Pre-Proyecto
## StyleMe — Hallazgos, Riesgos, Ajustes Propuestos

**Fecha:** 30 ago 2026  
**Rol:** IA Auto-Crítica (validación del plan antes de ejecutar)  
**Destinatario:** Leonardo (Feature Lead, PO)

---

## Resumen Ejecutivo

El plan M1-M8 es **estructuralmente sólido** pero tiene **7 supuestos optimistas** y **3 dependencias críticas** que podrían colapsar la timeline si no se gestionan. Recomiendo:

1. **Hacer el "core dump" M1-M3 primero** (hoy 30 ago), validar decisiones ANTES de escribir código (M5).
2. **Asignar un revisor humano** (Jaicel o Manuel) que valide cada módulo mientras se ejecuta.
3. **Reducir MÓDULO 5 (scaffold) de 6-8h a "verificación" de repo existente**, si el repo ya está inicializado en GitHub.
4. **Bifurcar M6 (prompts)** en "estructura" (hoy) + "redacción" (después de M1-M3), no en paralelo.
5. **Añadir MÓDULO 8.5: "Rollback Plan"** — qué hacer si Tarea 0 simulacro falla 2 sep.

---

## 📋 Hallazgos de la Revisión

### 🟢 LO QUE ESTÁ BIEN

#### 1. **Estructura M1-M3 (decisiones antes que código)**
✅ Correcto: P0/P1 se resuelven ANTES de escribir specs o código.  
✅ Correcto: DECISION-LOG.md como "fuente de verdad" para no re-litigar.  
✅ Correcto: "Una fuente" (ClickUp) en M2 evita divergencia de números.

**Por qué funciona:** Si M1-M3 se validan hoy (30 ago), el equipo entra a M4-M6 con certeza. Hay menos re-trabajo.

---

#### 2. **Cronograma Innegociable (9 sprints × 18 semanas)**
✅ EXCELENTE: Fijar cronograma ANTES de estimar tareas es disciplina de primeras empresas.  
✅ EXCELENTE: Sprint 1 "defendible 10 días" no es negación de PM, es honestidad de ingeniería.

**Riesgo:** Si alguien (PO, stakeholder) dice "pero necesitamos Dialog + Toast en Sprint 1", la respuesta ya está lista: "está documentado en DECISION-LOG.md §P1#5, y Sprint 2 los tiene listos para el 22 sep".

---

#### 3. **Paralelograma M4, M5, M6 (después de M1-M3)**
✅ Correcto: Una vez P0/P1/P2 congeladas, los tres pueden correr en paralelo sin conflictos.

**Por qué funciona:** M4 (specs), M5 (código), M6 (prompts) no tienen dependencias entre sí. Todos leen de la misma DECISION-LOG.md.

---

### 🟡 SUPUESTOS OPTIMISTAS (Riesgo Medio)

#### Supuesto 1: "OpenSpec migration toma 4-5h"
**Realidad:** design-system/spec.md tiene ~200 líneas de "Spec 00 legacy format" + tablas + requisitos en prosa. Convertir a `### Requirement` + `#### Scenario` + `#### AC` es mecánico pero requiere validar que CADA línea se mapea a ALGÚN bloque.

**Riesgo:** Si una AC se pierde en la migración (e.g., "Button debe tener active:focus-visible" vive solo en una tabla, no en un Requirement block), entonces Tarea 4 (Leo) la implementa sin saberlo → defecto en producción.

**Mitigación propuesta:**
- Crear `docs/SPEC-MIGRATION-AUDIT.md` que liste CADA AC de legacy y su nuevo bloque de destino.
- Leo + Jaicel validan audit (30 min sync).
- Solo entonces M4 se marca DONE.

**Nuevo tiempo:** 4-5h + 1h audit = **5-6h** (no crítico, M4 sigue siendo paralelo).

---

#### Supuesto 2: "Project scaffold toma 6-8h y npm run build ✅"
**Realidad:** Crear `package.json`, `tsconfig.json`, Tailwind, Vitest, Playwright, ESLint, Prettier, CI, MSW handlers base es trabajo real. Pero asumo:
- Versions pinned correctamente → sin dependency conflicts
- Config de shadcn/ui funciona a la primera (it doesn't; siempre hay "missing peer dependency")
- CI pipeline correría sin tweaks

**Riesgo:** Si leo corro `npm install` mañana 1 sep y hay un conflicto (e.g., "react@19-rc incompatible con @testing-library/react@14"), me quedo en "npm audit errors" y nada compila. Timeline se cae.

**Mitigación propuesta:**
- Crear package.json CON versiones específicas pinned (no `^` o `~`, sino `19.0.0-rc.1` exacto).
- Incluir `.nvmrc` (node version lock).
- Incluir `npm ci` en bootstrap steps (not `npm install`).
- Test CI locally ANTES de publicar repo → `npm run build` debe ✅ sin errores.

**Nuevo tiempo:** 6-8h pero con **validación local pre-push** = **8-10h** (espacio rojo, pero aún manejable si empezamos M5 hoy 31 ago).

---

#### Supuesto 3: "Leonardo simulacro Tarea 0 takes 1.5h y pasa"
**Realidad:** Tarea 0 es "inicializar proyecto, configs, CI verde". Leo clona, npm ci, npm run typecheck/test/build. Si TODO está perfecto, 1.5h es realista.

**Riesgo:** Si alguno falla (TypeScript strict error, ESLint rule, Playwright dependency), Leo está stuck en troubleshooting hasta las 21:30, no inicia Tarea 1 (tokens) que es blocker para el resto. Sprint 1 arranca con retraso.

**Mitigación propuesta:**
- No solo "npm run build ✅", sino **leo hace un commit vacío + push + CI completa**.
  - Esto valida: CI workflow exists, GitHub Actions secrets OK, repo push allowed.
- Si CI falla: Leo posts error en Slack, IA/Manuel debugga ESA NOCHE (31 ago), fix merged 1 sep 09:00.
- Fallback: Si no se resuelve → Leo avanza Tarea 1 (tokens) sin Storybook/advanced build steps (stripped-down Tarea 0).

**Nuevo tiempo:** Simulacro 1.5h + **1h contingency buffer** = **2.5h allocado**.

---

#### Supuesto 4: "Team async feedback on M1-M3 takes 30 min"
**Realidad:** Leo + Jaicel + Huascar + Manuel están en horario **19:00-23:00 (Chile UTC-3 = UTC)**, pero IA está en conversación continua con Usuario (UTC-3 también).

Pero "30 min async" asume que todos 4 revisan en paralelo y responden "sí, conforme" sin preguntas.

**Riesgo:** Si alguien (e.g., Jaicel) tiene duda: "¿en M3, dice que Sprint 2 tendrá Dialog/Sheet/Tabs — pero yo necesito Dialog en Sprint 1 para auth modal?" → hay que re-litigar P1#5. Se pierde 1h+.

**Mitigación propuesta:**
- Incluir en DECISION-LOG.md una sección "FAQ — Common Objections" que pre-resuelva:
  ```markdown
  Q: But don't we need Dialog in Sprint 1 for auth?
  A: No. Auth uses a simple centered <form> in <main>, no Dialog.
     Dialog in §Requirement list is for future flows (wardrobe, outfits, vton).
     See design-system/spec.md §3 for auth form design.
  ```
- Jaicel revisa "FAQ" antes de levantar objeción.

**Nuevo tiempo:** 30 min + **FAQ pre-population 30 min** = **1h prep** (hoy 30 ago), luego 30 min validación.

---

#### Supuesto 5: "M6 (prompts) se redactan en paralelo con M4-M5"
**Realidad:** sprint-1-init-leonardo.md depende de DECISIONES DE M1-M3 (cuántas tareas, duración, componentes 5 vs 8).

Si redacto el prompt en paralelo (asumiendo 5 componentes) pero M2/M3 no finalizan y resulta que "en realidad son 4 componentes", tengo que reescribir Tarea 4.

**Riesgo:** Ineficiencia. Reescritura. Versiones en conflicto del mismo documento.

**Mitigación propuesta:**
- M6 **NO es paralelo**. Orden real:
  1. M1-M3 DONE (hoy 30 ago EOD)
  2. M4-M5 en paralelo (31 ago - 1 sep)
  3. M6 inicia DESPUÉS de M3 congelada (31 ago 18:00) con estructura/outline clara
  4. M6 redacción completa 1 sep 21:00

**Nuevo cronograma M6:** No "en paralelo", sino **secuencial con lag pequeño (6h después de M3)**.

---

#### Supuesto 6: "Checksum final M8 toma 1-2h"
**Realidad:** SPRINT-1-FINAL-VALIDATION.md es una checklist de 30+ items. Si todo ya está hecho, validar es mecánico.

Pero si hay un item que falla (e.g., "todos los sprint-1-init-*.md should have spec refs validated" y se descubre que Jaicel's doc cita una sección no-migrada de app-shell/spec.md), hay que fix + re-validate.

**Riesgo:** El "2h" no incluye potential fixes. Si M8 descubre 2-3 mini-issues, la timeline slips a 3-4h.

**Mitigación propuesta:**
- M8 es CHECKLIST SOLO (reportar sí/no).
- Si "no" en cualquier item → escalate a IA para fix inmediato (30 min max).
- Nuevo tiempo: 1-2h checklist + **0.5h escalation buffer** = **2.5h M8**.

---

### 🔴 DEPENDENCIAS CRÍTICAS (Riesgo Alto)

#### Crítico 1: M1-M3 deciden; M4-M6 escriben sobre esas decisiones

**Cadena de riesgo:**
```
M1 (P0#1: Tarea 0 spec) ←─── si falla decision ──→ M5 (scaffold) escribe sin spec
M1 (P0#2: 5 comps vs 8) ←─── si falla decision ──→ M6 (prompt) cita componentes incorrectos
M3 (Sprint breakdown)   ←─── si falla decision ──→ M6 (prompt) estima duración incorrecta
```

**Mitigación crítica:** 
- M1-M3 NO avanzan a "done" hasta que Leonardo (PO) firma explícitamente "conforme".
- Formato: Post en Slack (o mensaje en este chat) = "DECISION-LOG P0#1-P1#8 validated. Proceeding to M4."
- Sin esa firma, no empiezo M4.

**Nuevo gate:** Paso 0.5 → **Validación Leo de M1-M3 (hoy 30 ago, EOD)**.

---

#### Crítico 2: Repository debe existir en GitHub antes de M5

**Cadena de riesgo:**
```
M5 escribe package.json, tsconfig.json, código ─→ ¿a dónde sube?
  ├─ Si repo no existe: crear en GitHub toma 10 min (pero requiere permisos)
  └─ Si repo existe con contenido viejo: M5 overwrites? Merge? Conflict?
```

**Mitigación propuesta:**
- Antes de M5: confirmar que repo `styleme-frontend` existe en GitHub y está limpio (o create nuevo).
- .gitignore debe estar en LUGAR antes de subir (no después), para evitar accidentales `node_modules/` commits.
- Nuevo pre-requisito M5: **GitHub repo initialized, empty or clean** (10 min setup).

---

#### Crítico 3: ClickUp data freshness en M2

**Cadena de riesgo:**
```
M2 exporta ClickUp CSV (44 tasks)
  ├─ ¿Está ClickUp actualizado? (o hay cambios pendientes 30 ago?)
  └─ Si alguien hace cambios EN ClickUp mientras yo escribo specs (M4), 
     el CSV de M2 se vuelve stale
```

**Mitigación propuesta:**
- **BEFORE M2:** Leo confirma ClickUp estado (frozen, no changes today).
- **DURING M2:** ClickUp read-only (no edits de team hasta que M7 merged).
- **AFTER M7 merge:** ClickUp updates resume (para Sprint 1 active).

**Nuevo gate:** Paso 0.25 → **ClickUp freeze confirmation** (antes de M2).

---

### 🟠 DEPENDENCIAS NO EXPLÍCITAS (Riesgo Medio)

#### 1. **Estoy asumiendo que todos los specs ya existen y son correctos**

**Realidad:** El plan M1-M8 TRATA specs como "fuente de verdad" pero no valida que estén **completas y correctas**.

E.g., design-system/spec.md define "Button component" pero ¿tiene TODAS las variantes que Tarea 4 necesita? ¿O está incompleta?

**Mitigación propuesta:**
- Añadir **M0.5: Spec Audit** (1h) ANTES de M1.
  - IA revisa 14 specs para gaps (e.g., "Button spec no menciona disabled state")
  - Reporta "spec audit ready / needs fixes" antes de que Leo congele decisiones.

**Nuevo tiempo:** 1h audit = **+1h a pre-proyecto** (total 33-39h → 34-40h).

---

#### 2. **Frontend repo puede estar desacoplado de backend — pero hay supuestos implícitos en MSW mocks**

**Realidad:** M5 scaffold crea MSW handlers base. Pero ¿cuál es la forma exacta de respuesta del backend?

E.g., "GET /api/garments" — ¿retorna `{ data: [...] }` o `[...]` directamente?

Si el shape mismatch, Leo (Tarea 6, API client) y Jaicel (Tarea 1, SQLAlchemy models) escriben schemas incompatibles.

**Mitigación propuesta:**
- M4 debe incluir **"API Contract Specification"** (pintar exactamente qué shape retorna cada endpoint).
- Esto hace que MSW mocks (M5) sean 100% compatibles con Jaicel's models.

**Nuevo contenido M4:** +schemas.json (OpenAPI-style endpoint contracts).

---

#### 3. **Asumo que "IA-assisted" multiplier 0.4-0.5x es realista**

**Realidad:** 0.4-0.5x multiplier significa "tarea que normalmente toma 4 días, IA-assisted toma 2 días".

Es cierto SI:
- IA escribe correctamente a la primera (sin bugs).
- Leo solo revisa + tweaks (no re-escribe).

Pero si Leo lee el código de Tarea 1 (tokens) y dice "esto no es lo que esperaba, debe ser así...", ahí perdemos el 0.4x multiplier.

**Mitigación propuesta:**
- M1-M3 tiene spec MUY clara, hasta nivel de "token X debe ser CSS variable, no SCSS".
- Así cuando IA escribe, es siguiendo "blueprint exacto", no "guía vaga".
- Leo revisa contra spec (checklist), no hace descubrimientos.

**Nuevo requisito:** M1-M3 **SPEC-PRECISION** (no es suficiente congelar, debe ser ULTRAPRECISO).

---

## 📊 TABLA RESUMIDA: Supuestos + Riesgos + Ajustes

| # | Supuesto | Riesgo | Mitigación | Tiempo Δ |
| --- | --- | --- | --- | --- |
| 1 | OpenSpec migration 4-5h | AC se pierde | Audit mapping | +1h |
| 2 | Scaffold compila 6-8h | Dependencies conflict | Pinned versions + local test | +2h |
| 3 | Tarea 0 simulacro 1.5h | Fail en CI | Pre-validate CI + fallback plan | +1h |
| 4 | Team async 30 min | Objeciones | FAQ section + pre-review | +1h prep |
| 5 | M6 en paralelo | Inconsistencia | Secuencial con M3 | Reorder |
| 6 | M8 validation 1-2h | Descubrimientos | Buffer escalation | +0.5h |
| 7 | Specs correctas | Gaps missed | M0.5 Spec Audit | +1h |
| 8 | MSW mocks OK | Shape mismatch backend | API contract spec | M4 content |
| 9 | 0.4-0.5x multiplier | Leo re-escribe | Ultra-precision specs M1-M3 | Process |
| — | — | — | **TOTAL ΔTIME** | **+7h** |

**Nuevo total:** 24-32h → **31-39h** (1-2 horas más por día)  
**Nuevo timeline:** 30 ago - 2 sep → **30 ago - 3 sep** (se extiende 1 día, pero aún antes de kickoff 2 sep 19:00)

---

## 🎯 PROPUESTA DE AJUSTES AL PLAN

### **Orden de Ejecución Revisado**

```
Paso 0: PRE-REQUISITOS (30 ago, 14:00-15:00)
├─ [10 min] GitHub repo check (styleme-frontend clean/empty?)
├─ [10 min] ClickUp freeze confirmation (Leo signs off)
└─ [10 min] Slack channel ready (team notified)

Paso 0.5: M0.5 SPEC AUDIT (30 ago, 15:00-16:00)
└─ IA audits 14 specs for gaps, reports "audit OK / needs X fixes"

Paso 1: M1-M3 DECISIONS (30 ago, 16:00-22:00)
├─ M1 (P0 blockers): 3-4h
├─ M2 (doc alignment): 2-3h
├─ M3 (sprint breakdown): 2-3h
└─ Entregable: DECISION-LOG consolidado

Paso 1b: LEO VALIDATION (30 ago, 22:00)
└─ Leo firma: "DECISION-LOG P0#1-P1#8 conforme, proceda M4-M6"
   (Sin esto, no avanzo. Crítico.)

Paso 2: M4, M5, M6 EN PARALELO (31 ago - 1 sep)
├─ M4 (OpenSpec migration): 5-6h (con audit mapping)
│  └─ Entregable: 14 specs OpenSpec-native, API contracts
├─ M5 (Project scaffold): 8-10h (con pre-test local)
│  └─ Entregable: Repo compilando, CI verde
└─ M6 Structure (outlines only): 1-2h
   └─ Entregable: skeleton sprint-1-init-{leonardo,jaicel,huascar,manuel}.md

Paso 3: M6 REDACCIÓN COMPLETA (1 sep, 18:00 - 2 sep, 12:00)
└─ IA redacta prompts full specs post M3/M4 frozen

Paso 4: M7 PR + GOVERNANCE (2 sep, 12:00-14:00)
├─ DECISION-LOG.md consolidado
├─ PR a main (Jaicel + Manuel reviewers)
└─ Merge

Paso 5: M8 VALIDATION (2 sep, 14:00-16:00)
├─ Checklist final
├─ Any issues → escalate & fix (30 min max)
└─ Sign-off: "GO for M9"

Paso 6: M9 LEO TAREA 0 SIMULACRO (2 sep, 19:00-21:00)
├─ Clone, npm ci, build, commit, push
├─ CI pipeline runs (GitHub Actions)
└─ Report: "Tarea 0 DONE / Blocker X"
   ├─ Si DONE → Sprint 1 active 3 sep 09:00
   └─ Si Blocker → Escalate (IA debugs 31 ago noche, merged 1 sep 09:00)

Paso 7: Sprint 1 FULL ACTIVE (3 sep, 19:00)
└─ Leonardo + Jaicel + Huascar + Manuel all start

Paso 8: Daily Standup (3 sep 09:00 onwards)
└─ 15 min, 09:30 UTC-3
```

---

## 🚨 TOP 3 RIESGOS SIN MITIGACIÓN = BLOQUEOS GARANTIZADOS

### Riesgo 1: **Leo no valida M1-M3 decisiones hoy (30 ago)**
→ Si no hay firma, M4-M6 avanzan sobre supuestos, todo colapsa 1 sep cuando Leo dice "no, eso no es lo que quería".

**Mitigación:** Paso 1b es GATE CRÍTICO. Sin firma, nada avanza.

---

### Riesgo 2: **GitHub repo no existe o está sucio (old code)**
→ M5 crea scaffold, pero ¿dónde sube? Conflicto de merge. Tiempo perdido 1 sep.

**Mitigación:** Paso 0 pre-requisito. Repo must be clean before M5.

---

### Riesgo 3: **Node.js / npm version incompatibility descubierto en Tarea 0 simulacro (2 sep 19:00)**
→ Leo no puede compilar. Sprint 1 NO arranca 3 sep. Cascada de retrasos.

**Mitigación:** 
- M5 prueba scaffold localmente (IA) ANTES de subir a GitHub.
- `.nvmrc` versionado (Leo usa exact version).
- Pre-test: "npm ci && npm run build" debe ✅ en laptop IA antes de 2 sep.

---

## ✅ RECOMENDACIÓN FINAL

**Ajusta el plan así:**

1. **Añade M0 + M0.5** (25 min): Pre-requisitos + spec audit.
2. **Añade gate Paso 1b** (Leo firma M1-M3 decisiones).
3. **Reorden M6:** No en paralelo con M4-M5, sino **después de M3** (secuencial lag).
4. **Extiende M5:** De 6-8h a 8-10h (pre-test local + CI validation).
5. **Añade M8.5:** Rollback plan (si Tarea 0 falla 2 sep, plan B qué?).
6. **Aumenta buffer:** Total 31-39h (no 24-32h), timeline = 30 ago - 3 sep (no 30 ago - 2 sep).
7. **Cada módulo tiene "IA + REVISOR HUMANO":** No solo IA escribe. Jaicel/Manuel validan en vivo.

---

## 📝 DOCUMENTO RECOMENDADO A ACTUALIZAR

Reescribir PRE-PROJECT-REMEDIATION-PLAN.md con:
- Paso 0 (pre-requisitos): GitHub + ClickUp freeze + audit spec
- Paso 1b (Leo gate): Firma decisiones
- M0.5 (Spec Audit): 1h
- M6 reordenado (no paralelo)
- M8.5 (Rollback): plan B si algo falla
- Tabla de "Revisor Humano" por módulo

---

## 🎯 ¿PROCEDO CON AJUSTES?

**Si Leonardo aprueba estos ajustes:**
1. Reescribo PRE-PROJECT-REMEDIATION-PLAN.md (versión 2).
2. Iniciamos Paso 0 hoy mismo (14:00).
3. Paso 1 (decisiones) 16:00-22:00.
4. Paso 1b (tu firma) EOD 30 ago.
5. Paso 2-8: ejecuta en timeline ajustado.

**¿Sí?**
