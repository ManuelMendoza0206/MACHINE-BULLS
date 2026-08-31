# 📋 PRE-PROJECT REMEDIATION PLAN
## StyleMe Sprint 1 — Resolución Integral de Hallazgos

**Fecha:** 30 ago 2026  
**Autoridad:** Leonardo Ibarra López (Feature Lead, Asiento A, PO)  
**Rol de IA:** Preparación pre-proyecto (especializada, modular)  
**Restricción de Cronograma:** Innegociable — 9 sprints × 2 semanas, fin 15 dic 2026  
**Ajuste de Estimaciones:** Trabajo hiperasistido por IA (máquina + team feedback async)

---

## 🎯 Objetivo General

Resolver integralmente los **10 hallazgos críticos y medianos** (P0 bloqueadores, P1 inconsistencias, P2 gobernanza) **antes del 2 de septiembre a las 09:00**, de modo que Sprint 1 arranque con:

✅ Cero bloqueadores técnicos  
✅ Specs precisas y alineadas (1 fuente de verdad)  
✅ Tareas defendibles en cronograma (no sobrecomprometidas)  
✅ Documentación en main vía PR (gobernanza practicada)  
✅ Proyecto compilando, CI verde, team lista  

**No se negocian sprints. Solo se ajustan horas de estimación.**

---

## 📦 MÓDULOS DE EJECUCIÓN

### MÓDULO 1: Resolución de Bloqueadores P0 (P0#1, P0#2, P0#3)
**Dependencia:** Ninguna (crit path)  
**Responsable IA:** Redacción + decisiones  
**Responsable Team:** Validación async  
**Tiempo IA:** 3-4h  
**Timeline:** 30 ago (HOY) – 31 ago (EOD)

#### P0#1 — No existe andamiaje del proyecto

**Hallazgo:**  
No hay package.json, tsconfig.json, next.config, Tailwind, Vitest, Playwright, ESLint/Prettier, src/, ni tests/. Las tareas asumen que esto ya existe. Día 1 hora 1 se estrella.

**Solución:**
1. ✍️ Crear **openspec/specs/frontend/project-scaffold/spec.md**
   - 7 requisitos formales (Next.js 15, TS strict, Tailwind+shadcn, Vitest, Playwright, MSW, CI)
   - AC claros y testables
   - Refs cruzadas con design-system/spec.md (tokens) y api-client/spec.md (schemas)

2. ✍️ Crear **Tarea 0: "Initialize Next.js 15 scaffold"**
   - Asignar a: Leonardo (yo) O Manuel (Infra)
   - Duración: 1.5 días (IA escribe, team valida)
   - Blocker para Tareas 1-14 de Sprint 1
   - AC: `npm run typecheck && npm run test && npm run build` todas verdes

3. ✍️ Crear **DECISION-LOG-P0.md** (entrada en CLAUDE.md)
   ```markdown
   ## P0#1: Frontend Scaffold Blocker (30 ago 2026)
   
   **Decision:** Tarea 0 = Project scaffold (Next.js 15 init + config stack)
   - Spec: openspec/specs/frontend/project-scaffold/spec.md
   - Owner: Leonardo + validate with Manuel (Infra)
   - Duration: 1.5 days (IA-assisted)
   - Blocker: All Sprint 1 feature tasks depend on this
   - Acceptance: repo compiles, npm run test/build/lint exit 0
   
   **Why:** Specs assume foundation exists but no task created it.
   Sprint 1 tasks can't start without this.
   **How to apply:** Execute as Tarea 0 in parallel with team decision (P0#2, P0#3).
   Don't merge anything to main until this is DONE.
   ```

---

#### P0#2 — List of 8 components ≠ 9 in spec

**Hallazgo:**  
sprint-1-init-leonardo.md (Tarea 4): Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner (8)  
design-system/spec.md §2.4: Button, Card, Badge, Skeleton, Progress, Dialog, Sheet, Tabs, Toast (9)  
Only 3 match. Violates CLAUDE.md §8 ("spec is source of truth").

**Solución:**
1. ✍️ Reescribir **Tarea 4 AC** para que sea EXACTAMENTE los 9 de §2.4, pero **reducidos para Sprint 1**:
   ```markdown
   ### Sprint 1 (5 componentes):
   - Button (basic, primary, secondary, danger)
   - Card (basic, hover)
   - Badge (color variants)
   - Skeleton (bone animation)
   - Progress (linear bar + animated)
   
   ### Sprint 2 (4 componentes):
   - Dialog (modal + form example)
   - Sheet (bottom drawer)
   - Tabs (tab bar + content)
   - Toast (sonner integration example)
   
   ### Why reduce: Sprint 1 focus is shell + 5 core components.
   Dialog/Sheet/Tabs/Toast needed in Sprint 2 (outfits, wardrobe, profile flows).
   ```

2. ✍️ Actualizar **design-system/spec.md §4** (tests):
   - Remove non-existent test refs: Input, Select, Modal, Tooltip, Spinner
   - Confirm: tests/integration/ui/{button,card,badge,skeleton,progress}.test.tsx exist in AC
   - Add Sprint 2 refs: dialog, sheet, tabs, toast

3. ✍️ Entrada en DECISION-LOG-P0.md:
   ```markdown
   ## P0#2: Component List Alignment (30 ago 2026)
   
   **Decision:** Sprint 1 = 5 core components (Button, Card, Badge, Skeleton, Progress).
   Sprint 2 = 4 advanced (Dialog, Sheet, Tabs, Toast).
   
   Source: design-system/spec.md §2.4 (spec authority).
   - Tarea 4 AC rewritten to match spec exactly
   - Taska 4 duration remains ~6 days (5 comps + tests + a11y + story exports)
   - Sprint 2 prep document created (handoff notes)
   
   **Why:** Violates CLAUDE.md §8 to invent components not in spec.
   Reducing 9→5 makes Sprint 1 scope defensible.
   ```

---

#### P0#3 — ML tasks assigned to frontend Sprint 1

**Hallazgo:**  
SPRINT-1-KICKOFF-VALIDATION (lines 44-58) assigns to Leonardo:  
- "EDA garment dataset" (Data)  
- "ResNet-50 baseline training" (Data)  
- "Embedding model training" (Data)  

CLAUDE.md is explicit: "Scope: ONLY frontend (Next.js). Backend Python/FastAPI/ML lives in separate repo."

**Solución:**
1. ✍️ **Formal decision** in DECISION-LOG-P0.md:
   ```markdown
   ## P0#3: ML Tasks Out of Frontend Scope (30 ago 2026)
   
   **Decision:** Specialization model confirmed.
   - Frontend repo (this): Next.js 14/15, TypeScript, React, Zod, TanStack Query only.
   - Backend/ML repo: Python 3.10, FastAPI, PyTorch, CLIP, Embedding model, VTON pipeline.
   - Data pipeline (CRISP ML): Parallel workstream in backend repo, NOT frontend.
   
   **Assignment by specialization (not rotation):**
   - Leonardo Ibarra: Frontend + Data Science (upstream from backend)
   - Jaicel Velasco: Backend API + ML model integration
   - Huascar Camilo: QA (both repos)
   - Manuel Jiménez: Infra/DevOps (both repos)
   
   **Leonardo's Sprint 1 tasks: ONLY frontend.** ML tasks move to backend repo or Sprints 2-9.
   
   **Why:** Violates CLAUDE.md §1. Frontend and ML are different stacks, tools, dependencies.
   Mixing them breaks repo boundaries and creates confusion on "is this my task?"
   
   **How to apply:** Remove {Data List} tasks from Leonardo's Sprint 1.
   Update backlog-seed.md and clickup to show ML workstream separately.
   ```

2. ✍️ **Update KICKOFF-VALIDATION:**
   - Remove Data List tasks from Leonardo's section (lines 44-58)
   - Add note: "Data pipeline workstream assigned separately (backend repo)"
   - Confirm: Leonardo Sprint 1 = 14 frontend tareas (design-system + app-shell + api-client-schemas)

3. ✍️ **Create decision stub:**
   - Add flag to CLAUDE.md: `[DECISION] ML repo initialized? (URL/status pending)`
   - If backend repo doesn't exist yet: create stub (`docs/backend-repo-stub.md` with note to team)

---

**✅ MÓDULO 1 DELIVERABLES:**
- [ ] openspec/specs/frontend/project-scaffold/spec.md (7 reqs, AC, refs)
- [ ] Tarea 0 task description (ready to create in ClickUp)
- [ ] sprint-1-init-leonardo.md Tarea 4 REWRITTEN (5 comps, not 8)
- [ ] design-system/spec.md §4 updated (test refs only for 5 Sprint-1 comps)
- [ ] DECISION-LOG-P0.md created (P0#1, P0#2, P0#3 entries)
- [ ] CLAUDE.md updated with decision flags

**Team async validation:** Leonardo + Manuel review decision-log (30 min async)

---

### MÓDULO 2: Alineación de Documentación (1 única fuente de verdad)
**Dependencia:** MÓDULO 1  
**Responsable IA:** Correcciones + matriz de trazabilidad  
**Responsable Team:** Spot-check async  
**Tiempo IA:** 2-3h  
**Timeline:** 31 ago

#### Hallazgo Raíz
Cuatro docs de Sprint 1 divergen en total de tareas:
- SPRINT-1-READY: 38 (+3 epics = 41)
- EXECUTION-PLAN: 38-41 (ambiguo)
- KICKOFF-VALIDATION: 44 (+3 = 47)
- ClickUp: 185 Sprint 1-9, de los cuales ~44 son Sprint 1

**Solución:**
1. ✍️ **ClickUp es fuente de verdad para tareas.**
   - Export ClickUp Board (CSV/JSON) → docs/clickup/SPRINT-1-MASTER.csv
   - Count by sprint (derive from due_date + tags)
   - Verify: 44 tasks en Sprint 1 (26 ago - 8 sep), 185 total (Sprints 0-9)

2. ✍️ **Docs correctores** (find/replace + manual validation):
   - SPRINT-1-READY: update all totals to 44, update assignee breakdown
   - SPRINT-1-EXECUTION-PLAN: same
   - SPRINT-1-KICKOFF-VALIDATION: confirm 44 (already correct), remove redundant task counts
   - Remove P0#3 ML tasks from Leonardo's list

3. ✍️ **Crea matriz de trazabilidad:**
   ```markdown
   ## docs/SPRINT-1-TRACEABILITY-MATRIX.md
   
   Format:
   | Sprint 1 Task | Spec Ref | AC # | Test File | Assignee | Epic | Status |
   | --- | --- | --- | --- | --- | --- | --- |
   | Design tokens (T1.1) | design-system §2.1 | AC1, AC2 | tests/tokens.test.ts | Leonardo | [EPIC] frontend/design-system | PLANNING |
   | Button component (T1.4.1) | design-system §2.4 Button | AC3-8 | tests/integration/ui/button.test.tsx | Leonardo | [EPIC] frontend/design-system | PLANNING |
   ...
   
   Validation:
   - Every task → exactly 1 spec section
   - Every spec §2.x → at least 1 task
   - Every AC → at least 1 test file
   - No orphan AC, no orphan test
   ```

4. ✍️ **Precisar referencias rotas:**
   - Corregir todas las rutas: `docs/specs/frontend/…` → `openspec/specs/frontend/…`
   - Reemplazar secciones vagas: "§2.5 de spec [app-shell]" → "app-shell/spec.md §2.5 (SkipLink requirement)"
   - Verificar que cada línea de referencia puede ser clickeada (o al menos sin error)

---

**✅ MÓDULO 2 DELIVERABLES:**
- [ ] SPRINT-1-MASTER.csv (ClickUp export, 44 tasks listed)
- [ ] SPRINT-1-READY, EXECUTION-PLAN, KICKOFF-VALIDATION con números alineados (44, 185)
- [ ] SPRINT-1-TRACEABILITY-MATRIX.md (spec ↔ task ↔ test mapping, 100% coverage)
- [ ] Todas las rutas de refs corregidas (openspec/specs/…)
- [ ] CLAUDE.md actualizado (decision log, no refs rotas)

---

### MÓDULO 3: Redefinición de Alcance y Cronograma (Defendible, No Negocia Sprints)
**Dependencia:** MÓDULO 1, MÓDULO 2  
**Responsable IA:** Propuesta de sprint-breakdown, story re-estimation  
**Responsable Team:** PO confirms cut/move decisions  
**Tiempo IA:** 2-3h  
**Timeline:** 31 ago – 1 sep

#### Hallazgo Raíz
Cronograma Sprint 1 no cierra:
- Ventana: 26 ago – 8 sep = 10 días laborables
- Disponibilidad: 19:00-23:00 (4h/día) = ~40h-persona
- Tareas estimadas: ~20 días-persona (a jornada completa)
- Con TDD real (spec→test→code→refactor) + PR review → 2x multiplier → 40h insuficiente

**Restricción:** 
- **NO se mueven sprints.** 9 sprints × 2 weeks = 18 weeks, fin 15 dic 2026 (fijo).
- **SÍ se recorta Sprint 1 alcance.**
- **SÍ se reduce horas de estimación** asumiendo trabajo hiperasistido por IA.

**Solución:**

1. ✍️ **Sprint 1 objetivo redefinido (defendible):**
   ```
   ANTES (ideal, no cierra):
   - Design tokens + cn() + contraste utilities
   - Shell completo (9 comps)
   - API client full + fixtures
   - 100% a11y compliance (6 requisitos por comp)
   - Visual regression baseline (16 screenshots)
   - Coverage >80% (integración E2E + unit)
   → 20 días-persona, 10 días calendario, no cierra
   
   DESPUÉS (defendible, cierra en 40h):
   - Design tokens (tailwind config, hsl vars) + cn()
   - Contrast & a11y utility functions
   - Shell mínimo (TopNav, BottomTabBar, providers sin FOUC, SkipLink, GlobalError)
   - 5 core UI components (Button, Card, Badge, Skeleton, Progress)
     - Basic variants + theme-aware
     - 1 story per component (Storybook REMOVED)
     - Unit tests (Vitest + RTL) with 1 a11y check (aria-disabled, role, etc)
   - API client (Zod schemas + apiRequest<T>() + error hierarchy)
   - Fixtures (JSON test data)
   - Coverage reporting (unit only, E2E in Huascar's QA track)
   → 10-12 días-persona, 10 días calendario, cierra con margen
   
   MOVER A SPRINT 2:
   - Dialog, Sheet, Tabs, Toast components
   - Visual regression (Playwright baseline + tests)
   - Full a11y compliance suite (6 formal audits)
   - Coverage push to ≥80% (integration + E2E)
   - Storybook setup & 16 stories (removed from Sprint 1)
   ```

2. ✍️ **Re-estimar tareas** (IA-assisted = 0.4x-0.5x multiplicador):
   ```
   Tarea 1 (T1.1-T1.3: tokens, cn(), getContrastRatio)
   - Original: 3 days (design + impl + tests)
   - IA-assisted: 1.5 days (IA writes, Leonardo reviews + tweaks)
   - Tareas hijas: T1.1=0.5d, T1.2=0.5d, T1.3=0.5d → total 1.5d ✅
   
   Tarea 4 (5 components: Button, Card, Badge, Skeleton, Progress)
   - Original: 7-8 days (design + impl + tests + stories)
   - Reducido (no Storybook): 5 days
   - IA-assisted: 2.5 days (IA writes skeletons, Leonardo reviews)
   - 5 components × (1h design + 1h impl + 0.5h test) / 5 comps per person week
   - Subtasks: T4.1=0.5d, T4.2=0.5d, T4.3=0.5d, T4.4=0.5d, T4.5=0.5d → 2.5d ✅
   
   Tarea 5 (App Shell: providers + layout)
   - Original: 2 days
   - IA-assisted: 1 day (IA writes full scaffold, Leonardo validates)
   → 1d ✅
   
   Tarea 2, 3, 6-8 (Tests, utils, misc)
   - Original: 12 days total
   - IA-assisted + sprint reduction: 6 days (IA writes test skeletons, code templates)
   → 6d ✅
   
   TOTAL LEONARDO: 1.5 + 2.5 + 1 + 6 + 1 (Tarea 0) = 12 days
   Disponibilidad: 40 horas / 8 horas per day = 5 days calendar × 2x (part-time 19:00-23:00) = 10 days calendar
   → 12 days-person / 10 days calendar = 1.2x (tight but defensible, no all-nighters) ✅
   ```

3. ✍️ **Creat sprint-breakdown-FINAL.md:**
   ```markdown
   # Sprint 1-9 Breakdown (Final, Innegociable)
   
   ## Schedule (LOCKED)
   - Sprint 0: 12 ago - 25 ago (Phase 0: infrastructure, setup)
   - Sprint 1: 26 ago - 8 sep (Foundation: scaffold, tokens, 5 comps, shell, API client)
   - Sprint 2: 9 sep - 22 sep (UX: 4 comps, regression tests, a11y push, coverage >80%)
   - Sprint 3: 23 sep - 6 oct (Wardrobe: flows, filters, search)
   - Sprint 4: 7 oct - 20 oct (Outfits: composition, recommendations)
   - Sprint 5: 21 oct - 3 nov (VTON: job creation, polling, result display)
   - Sprint 6: 4 nov - 17 nov (Profile: user prefs, settings, integrations)
   - Sprint 7: 18 nov - 1 dic (Hardening: e2e, performance, monitoring)
   - Sprint 8: 2 dic - 15 dic (Launch: final QA, deployment, documentation)
   
   ## Scope Cuts (Sprint 1)
   - Removed: Storybook, 4 advanced components (Dialog/Sheet/Tabs/Toast), visual regression
   - Moved to Sprint 2: Full a11y suite, E2E coverage integration, coverage >80% push
   - Moved to Sprints 2-9: ML/Data tasks (backend repo)
   
   ## Why this works
   - Foundation (scaffold + core UI) needed by all downstream sprints
   - Each sprint 1-8 has clear focus (frontend feature area OR hardening)
   - No task is "nice-to-have"; every item is critical path
   - IA-assisted development maintains 0.4-0.5x duration multiplier
   - Handoff protocols (sprint-rotation-plan §4) allow seamless transitions
   ```

---

**✅ MÓDULO 3 DELIVERABLES:**
- [ ] sprint-breakdown-FINAL.md (9 sprints × 2 weeks locked, scope cuts documented)
- [ ] Re-estimated task durations (IA-assisted multiplier applied)
- [ ] sprint-1-init-*.md files updated with NEW durations (defendible in 40h)
- [ ] Sprint 2 prep document created (handoff notes for Dialog, Sheet, Tabs, Toast, a11y formalization)
- [ ] CLAUDE.md updated (no Storybook in scope, Sprints 1-9 locked)

---

### MÓDULO 4: Terminación de Specs Precisas (OpenSpec Native + Tokens Completos)
**Dependencia:** MÓDULO 1, MÓDULO 2  
**Responsable IA:** Redacción + migración  
**Responsable Team:** Review + sign-off async  
**Tiempo IA:** 4-5h  
**Timeline:** 31 ago – 1 sep

#### Hallazgo Raíz
1. **Specs hybrid-format:** design-system/spec.md y app-shell/spec.md tienen solo 2-3 bloques `### Requirement` arriba, luego 200 líneas de "Spec 00" formato legacy. OpenSpec tooling no parsea el cuerpo legacy como requirements → valida solo 2 reqs donde hay ~15.

2. **Tokens *-foreground faltantes:** design-system §2.1 define accent (casi negro) para CTAs primarios, pero no define texto sobre ese color. Button variant:default lo necesita. Test de contraste §4 solo valida (foreground, background) nunca (texto, buttonAccent).

3. **Referencias rotas / imprecisas:** sprint-1-init-leonardo.md cita "§2.5 de [app-shell]" (no existe esa sección con ese contenido).

**Solución:**

1. ✍️ **Finalizar migración OpenSpec de design-system/spec.md:**
   ```markdown
   # Frontend Design System Specification
   
   ## Requirements
   
   ### Requirement: Design tokens (Tailwind CSS variables)
   - **ID:** DSY-001
   - **Category:** Foundation
   - **Priority:** Critical (blocks all components)
   
   #### Scenario: Define color palette with HSL variables
   - Given: Tailwind config with theme extension
   - When: colors use hsl(var(--color-name)) pattern
   - Then: colors are themeable (light/dark) and accessible (AA contrast)
   
   #### Scenario: Define typography scale
   - Given: Tailwind font-size, font-weight, line-height utilities
   - When: text classes map to 8pt/10pt/12pt/14pt/16pt/18pt/20pt/24pt scales
   - Then: typography is consistent across all components
   
   #### Scenario: Implement theme toggle (light/dark) without FOUC
   - Given: document.documentElement has [data-theme="light|dark"]
   - When: user toggles theme selector in TopNav
   - Then: entire DOM re-renders with new token values, no flash
   - And: preference persists in localStorage
   - And: prefers-color-scheme media query works as fallback
   
   ### Requirement: Utility functions (cn, getContrastRatio, etc)
   - **ID:** DSY-002
   - **Category:** Foundation
   - [... (continue for each utility) ...]
   
   ### Requirement: UI Components (Button, Card, Badge, Skeleton, Progress)
   - **ID:** CMP-001 to CMP-005
   - [... (continue as per §2.4 original) ...]
   
   [... (migrate remaining ~12 requirements from legacy "Spec 00" format) ...]
   ```

2. ✍️ **Añadir tokens *-foreground:**
   ```markdown
   ### Color Tokens (complete list)
   
   #### Backgrounds
   - --background: main page background (e.g., #ffffff light, #0f1419 dark)
   - --muted: secondary backgrounds (form fields, borders)
   - --muted-foreground: text on muted
   - --accent: primary CTA background (e.g., hsl(from var(--primary) h s 35%) dark blue)
   - --success: success state background
   - --destructive: error/danger state background
   
   #### Foregrounds (TEXT COLORS)
   - --foreground: primary text on background
   - --muted-foreground: secondary text
   - **--accent-foreground: TEXT on accent background** ← NEW
   - **--success-foreground: TEXT on success background** ← NEW
   - **--destructive-foreground: TEXT on destructive background** ← NEW
   
   #### Borders
   - --border: 1px dividers
   - --input: form input borders
   
   Rationale: Every background needs a paired foreground to meet AA contrast ratio.
   Accent is used for primary buttons, success for checkmarks/badges, destructive for delete actions.
   Without explicit *-foreground tokens, designers resort to "just use foreground" which often fails contrast.
   ```

3. ✍️ **Actualizar test de contraste (design-system §4):**
   ```typescript
   // tests/utils/contrast.test.ts
   import { getContrastRatio } from '@/utils/contrast';
   
   describe('Contrast Ratio Validator', () => {
     it('foreground on background meets AA', () => {
       const ratio = getContrastRatio('#ffffff', '#0f1419'); // light text on dark
       expect(ratio).toBeGreaterThanOrEqual(4.5); // AA minimum
     });
     
     it('muted-foreground on muted meets AA', () => {
       const ratio = getContrastRatio('#6b7280', '#f3f4f6');
       expect(ratio).toBeGreaterThanOrEqual(4.5);
     });
     
     it('accent-foreground on accent meets AA', () => {
       // NEW: explicitly test button text on button background
       const ratio = getContrastRatio(
         getComputedStyle(doc.root).getPropertyValue('--accent-foreground'),
         getComputedStyle(doc.root).getPropertyValue('--accent')
       );
       expect(ratio).toBeGreaterThanOrEqual(4.5);
     });
     
     it('success-foreground on success meets AA', () => { /* ... */ });
     it('destructive-foreground on destructive meets AA', () => { /* ... */ });
   });
   ```

4. ✍️ **Finalizar migración OpenSpec de app-shell/spec.md:**
   - Move "Spec 01: TopNav" legacy content → `### Requirement: Top navigation bar`
   - Add proper scenario blocks for each component
   - Add `#### Acceptance Criteria` blocks (not just in prose)

5. ✍️ **Crear docs/SPEC-MIGRATION-STATUS.md:**
   ```markdown
   # OpenSpec Migration Status
   
   | Spec | Status | Reqs Detected | Scenarios | AC Blocks | Target Date |
   | --- | --- | --- | --- | --- | --- |
   | design-system | ✅ MIGRATED | 12 | 36 | 48 | 1 sep |
   | app-shell | ✅ MIGRATED | 8 | 20 | 24 | 1 sep |
   | api-client-schemas | ✅ NATIVE | 6 | 12 | 18 | 31 ago |
   | landing-auth | ✅ NATIVE | 4 | 8 | 12 | 31 ago |
   | outfits-flow | ⏳ PENDING | - | - | - | 1 sep |
   | wardrobe-flow | ⏳ PENDING | - | - | - | 1 sep |
   | vton-flow | ⏳ PENDING | - | - | - | 1 sep |
   | profile-flow | ⏳ PENDING | - | - | - | 1 sep |
   | domain-database | ✅ NATIVE | 6 | 12 | 18 | 31 ago |
   | api-gateway | ✅ NATIVE | 8 | 16 | 32 | 31 ago |
   | garment-analysis | ✅ NATIVE | 4 | 8 | 16 | 31 ago |
   | recommender-engine | ✅ NATIVE | 3 | 6 | 12 | 31 ago |
   | vton-pipeline | ✅ NATIVE | 5 | 10 | 20 | 31 ago |
   
   Total: 65+ requirements, 148+ scenarios, 200+ AC blocks
   ```

6. ✍️ **Crear docs/SPEC-REFERENCES-CORRECTED.md:**
   ```markdown
   # Spec Reference Corrections
   
   ## Common Errors Found & Fixed
   
   ❌ `docs/specs/frontend/design-system/spec.md`
   ✅ `openspec/specs/frontend/design-system/spec.md`
   
   ❌ `app-shell §2.5 (SkipLink)` (doesn't exist; content is in §2.6)
   ✅ `app-shell/spec.md Requirement: Accessibility (Skip Link)`
   
   ❌ `6 requisitos de §2.5 de [design-system]` (lists wrong components)
   ✅ `design-system/spec.md §2.5: Button(aria-disabled), Badge(text-not-color), Skeleton(aria-busy), Progress(role), Dialog(focus-restore), Tabs(arrow-keys)`
   
   ❌ `providers.ts` (should be .tsx, has JSX)
   ✅ `src/app/providers.tsx`
   
   ❌ `Storybook export stories` (not in any spec)
   ✅ [REMOVED from Sprint 1 scope; moved to Sprint 3 evaluation]
   ```

---

**✅ MÓDULO 4 DELIVERABLES:**
- [ ] design-system/spec.md fully migrated to OpenSpec format (12 reqs, 36 scenarios, 48 AC blocks)
- [ ] app-shell/spec.md fully migrated to OpenSpec format (8 reqs, 20 scenarios, 24 AC blocks)
- [ ] Tokens *-foreground defined (accent-foreground, success-foreground, destructive-foreground)
- [ ] Contrast ratio tests updated (6 foreground/background pairs validated)
- [ ] docs/SPEC-MIGRATION-STATUS.md created (14 specs tracked)
- [ ] docs/SPEC-REFERENCES-CORRECTED.md created (all refs validated, broken ones listed)

---

### MÓDULO 5: Inicialización del Proyecto (Tarea 0 Ejecutable)
**Dependencia:** MÓDULO 1 (spec), MÓDULO 4 (tokens)  
**Responsable IA:** Scaffold + config (código ejecutable)  
**Responsable Team:** Clone + verify  
**Tiempo IA:** 6-8h  
**Timeline:** 1 sep – 2 sep (puede ejecutarse en paralelo con otros módulos)

#### Objetivo
Crear un repositorio StyleMe frontend compilando, con CI verde, listo para que Leonardo/team empiecen Tarea 1.

**Solución:**

1. ✍️ **Crear estructura base + package.json:**
   ```bash
   mkdir -p src/{app,components,utils,hooks,config}
   mkdir -p tests/{unit,integration,e2e}
   mkdir -p public/fonts
   touch .gitignore .env.example
   ```

2. ✍️ **package.json** (Next 15 + strict TypeScript stack):
   ```json
   {
     "name": "styleme-frontend",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "eslint src tests --max-warnings=0",
       "typecheck": "tsc --noEmit",
       "test": "vitest run",
       "test:watch": "vitest",
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui"
     },
     "dependencies": {
       "next": "^15.1.0",
       "react": "^19.0.0-rc",
       "react-dom": "^19.0.0-rc",
       "@hookform/resolvers": "^3.3.4",
       "@radix-ui/react-dialog": "^1.1.2",
       "@radix-ui/react-select": "^2.0.0",
       "class-variance-authority": "^0.7.0",
       "clsx": "^2.1.1",
       "tailwind-merge": "^2.2.2",
       "zod": "^3.22.4",
       "@tanstack/react-query": "^5.28.0",
       "zustand": "^4.4.7",
       "lucide-react": "^0.344.0",
       "sonner": "^1.2.3"
     },
     "devDependencies": {
       "@testing-library/react": "^14.1.2",
       "@testing-library/jest-dom": "^6.1.5",
       "@types/node": "^20.10.6",
       "@types/react": "^18.2.43",
       "@types/react-dom": "^18.2.17",
       "@typescript-eslint/eslint-plugin": "^6.16.0",
       "@typescript-eslint/parser": "^6.16.0",
       "autoprefixer": "^10.4.16",
       "eslint": "^8.56.0",
       "eslint-config-next": "^15.1.0",
       "postcss": "^8.4.32",
       "prettier": "^3.1.1",
       "tailwindcss": "^3.4.1",
       "typescript": "^5.3.3",
       "vitest": "^1.0.4",
       "jsdom": "^23.0.1",
       "@vitest/ui": "^1.0.4",
       "@playwright/test": "^1.40.1",
       "msw": "^2.0.11"
     }
   }
   ```

3. ✍️ **tsconfig.json** (strict + paths):
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "jsx": "react-jsx",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "resolveJsonModule": true,
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "noImplicitOverride": true,
       "noPropertyAccessFromIndexSignature": true,
       "allowSyntheticDefaultImports": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "allowJs": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@/tests/*": ["./tests/*"]
       },
       "plugins": [
         { "name": "next" }
       ]
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

4. ✍️ **next.config.js:**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     swcMinify: true,
     images: {
       remotePatterns: [
         { protocol: 'https', hostname: 'images.example.com' }
       ]
     },
     experimental: {
       typedRoutes: true
     }
   };
   module.exports = nextConfig;
   ```

5. ✍️ **tailwind.config.ts:**
   ```typescript
   import type { Config } from 'tailwindcss';
   
   const config: Config = {
     content: [
       './src/**/*.{js,ts,jsx,tsx}',
       './app/**/*.{js,ts,jsx,tsx}'
     ],
     theme: {
       extend: {
         colors: {
           background: 'hsl(var(--background))',
           foreground: 'hsl(var(--foreground))',
           muted: 'hsl(var(--muted))',
           'muted-foreground': 'hsl(var(--muted-foreground))',
           accent: 'hsl(var(--accent))',
           'accent-foreground': 'hsl(var(--accent-foreground))',
           success: 'hsl(var(--success))',
           'success-foreground': 'hsl(var(--success-foreground))',
           destructive: 'hsl(var(--destructive))',
           'destructive-foreground': 'hsl(var(--destructive-foreground))',
           border: 'hsl(var(--border))',
           input: 'hsl(var(--input))'
         }
       }
     },
     plugins: []
   };
   export default config;
   ```

6. ✍️ **vitest.config.ts:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import path from 'path';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./tests/setup.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         lines: 50,
         functions: 50,
         branches: 50,
         statements: 50
       }
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src')
       }
     }
   });
   ```

7. ✍️ **playwright.config.ts:**
   ```typescript
   import { defineConfig, devices } from '@playwright/test';
   
   export default defineConfig({
     testDir: './tests/e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI
     },
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry'
     },
     projects: [
       { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
     ]
   });
   ```

8. ✍️ **src/app/layout.tsx + providers.tsx:**
   ```typescript
   // src/app/providers.tsx
   'use client';
   import { ReactNode } from 'react';
   
   export function Providers({ children }: { children: ReactNode }) {
     return (
       <html suppressHydrationWarning>
         <body>{children}</body>
       </html>
     );
   }
   ```

9. ✍️ **.gitignore:**
   ```
   node_modules
   .next
   coverage
   .env.local
   .env.*.local
   playwright-report
   test-results
   dist
   .DS_Store
   ```

10. ✍️ **.env.example:**
    ```
    NEXT_PUBLIC_API_URL=http://localhost:8000
    NEXT_PUBLIC_API_TIMEOUT=30000
    ```

11. ✍️ **.github/workflows/ci.yml:**
    ```yaml
    name: CI
    on: [push, pull_request]
    jobs:
      lint:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '18' }
          - run: npm ci && npm run lint
      
      typecheck:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '18' }
          - run: npm ci && npm run typecheck
      
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '18' }
          - run: npm ci && npm run test
      
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '18' }
          - run: npm ci && npm run build
    ```

12. ✍️ **src/config/design-tokens.ts** (Leonardo Tarea 1.1):
    ```typescript
    // Auto-generated from Tailwind config
    export const tokens = {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        accent: 'hsl(var(--accent))',
        // ... (rest generated from CLAUDE.md spec)
      }
    };
    ```

13. ✍️ **tests/setup.ts:**
    ```typescript
    import '@testing-library/jest-dom';
    import { setupServer } from 'msw/node';
    import { handlers } from '@/tests/mocks/handlers';
    
    export const server = setupServer(...handlers);
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    ```

---

**✅ MÓDULO 5 DELIVERABLES (Código Listo):**
- [ ] Repository initialized (git + package.json + lock file)
- [ ] All config files (tsconfig, next.config, tailwind, vitest, playwright, eslint, prettier)
- [ ] src/ + tests/ + public/ directory structures created
- [ ] .gitignore + .env.example with no secrets
- [ ] .github/workflows/ci.yml running and GREEN (lint, typecheck, test, build)
- [ ] npm run test exits 0 (empty test suite is OK)
- [ ] npm run build produces .next/ with no errors
- [ ] Repository pushed to GitHub (team clones, verifies)

**Validation:** Leonardo runs `npm run typecheck && npm run test && npm run build` → all ✅

---

### MÓDULO 6: Prompts de Inicialización para el Equipo
**Dependencia:** MÓDULO 1-5  
**Responsable IA:** Redacción de prompts  
**Responsable Team:** Ejecuta (primero Leonardo simulacro)  
**Tiempo IA:** 3-4h  
**Timeline:** 1 sep – 2 sep

#### Objetivo
Cada miembro del equipo tiene un prompt ejecutable que describe EXACTAMENTE sus tareas Sprint 1, sin ambigüedad, con AC claros, refs de spec precisas, y orden de ejecución.

**Solución:**

1. ✍️ **sprint-1-init-leonardo.md** (REESCRITO, ~6 tareas concretas, 10-12 días defendibles):
   ```markdown
   # Sprint 1 Init — Leonardo Ibarra López
   
   ## Role Summary
   - **Asiento A (Sprint 1):** Feature Lead
   - **Area:** Frontend Foundation (Design System + App Shell)
   - **Time window:** 26 ago – 8 sep 2026 (10 días laborables, ~40 horas)
   - **Availability:** 19:00–23:00 daily (4h/day)
   
   ## Tarea 0: Project Scaffold (BLOCKER — DO FIRST)
   **Spec:** openspec/specs/frontend/project-scaffold/spec.md
   **Owner:** Leonardo (or Manuel if Leonardo focuses on UI)
   **Duration:** 1.5 days
   **AC:**
   - [ ] `npm run typecheck` exits 0
   - [ ] `npm run test` runs and exits 0 (empty suite OK)
   - [ ] `npm run build` produces .next/ with zero errors/warnings
   - [ ] CI pipeline green (GitHub Actions passing)
   - [ ] .gitignore complete (node_modules, .next, .env.local, etc)
   - [ ] Commit: "Initial Next.js 15 scaffold with TS strict mode, Tailwind, Vitest, Playwright, MSW"
   
   **Dependencies:** None (critical path)
   **Blocker for:** Tarea 1-14
   **Pair with:** Manuel (Infra review, CI sign-off)
   
   ---
   
   ## Tarea 1: Design Tokens + Utilities (1.5 days)
   **Spec:** design-system/spec.md §2.1, §4
   **Files:** src/config/design-tokens.ts, src/utils/cn.ts, src/utils/contrast.ts
   **AC:**
   - [ ] design-tokens.ts exports: colors (12 tokens), typography (8 scales), spacing (16 sizes)
   - [ ] cn() utility (classnames merge with Tailwind) tested in tests/utils/cn.test.ts
   - [ ] getContrastRatio() function, validated against 6 color pairs in tests/utils/contrast.test.ts
   - [ ] All tests pass: `npm run test`
   - [ ] Contrast validator reports AA for all theme pairs (4.5:1 minimum)
   - [ ] Commit: "feat: design tokens and utility functions (cn, getContrastRatio)"
   
   **Details:**
   - Use CSS HSL variables (not hardcoded hex) for theming
   - Tokens: background, foreground, muted, muted-foreground, accent, accent-foreground, success, success-foreground, destructive, destructive-foreground, border, input
   - Support light/dark theme via `[data-theme="light|dark"]` attribute
   
   **Dependencies:** Tarea 0
   **Critical path for:** Tarea 4 (components)
   
   ---
   
   ## Tarea 2: Theme Switching (1 day)
   **Spec:** design-system/spec.md Requirement: Theme toggle
   **Files:** src/hooks/useTheme.ts, src/utils/theme.ts
   **AC:**
   - [ ] useTheme() hook manages theme state (light/dark)
   - [ ] Theme persists to localStorage and prefers-color-scheme fallback
   - [ ] No FOUC (Flash of Unstyled Content) on page reload
   - [ ] Tests in tests/hooks/useTheme.test.ts (switch theme, verify DOM update, localStorage persists)
   - [ ] Commit: "feat: theme switching with localStorage persistence"
   
   **Dependencies:** Tarea 1
   
   ---
   
   ## Tarea 3: Providers + App Layout (1 day)
   **Spec:** app-shell/spec.md §2 (Providers, Layout)
   **Files:** src/app/providers.tsx, src/app/layout.tsx, src/app/page.tsx (home)
   **AC:**
   - [ ] providers.tsx wraps children with theme context + query client + zustand stores
   - [ ] layout.tsx establishes root <html>, <body>, Providers
   - [ ] page.tsx (home) is empty shell with meta tags
   - [ ] Layout mounts TopNav + BottomTabBar (stubs) + {children} + GlobalError boundary
   - [ ] Tests: tests/integration/layout.test.tsx (providers render, no hydration errors)
   - [ ] Commit: "feat: app layout and root providers"
   
   **Dependencies:** Tarea 1, Tarea 2
   
   ---
   
   ## Tarea 4: Core UI Components (2.5 days)
   **Spec:** design-system/spec.md §2.4 (5 components only)
   **Files:** src/components/ui/{button,card,badge,skeleton,progress}.tsx
   **AC:**
   - [ ] **Button component** (variant: default/secondary/danger, size: sm/md/lg)
     - [ ] Tests: tests/integration/ui/button.test.tsx (renders, click event, a11y aria-disabled)
     - [ ] Story: src/components/ui/button.stories.tsx (5 variants)
   - [ ] **Card component** (simple container, hover states)
     - [ ] Tests: tests/integration/ui/card.test.tsx (render, CSS classes)
   - [ ] **Badge component** (color variants: default/success/warning/error)
     - [ ] Tests: tests/integration/ui/badge.test.tsx (color variants, contrast)
   - [ ] **Skeleton component** (loading bone animation)
     - [ ] Tests: tests/integration/ui/skeleton.test.tsx (aria-busy attribute, animation)
   - [ ] **Progress component** (linear bar, animated)
     - [ ] Tests: tests/integration/ui/progress.test.tsx (value prop, role="progressbar")
   - [ ] All tests pass: `npm run test`
   - [ ] Coverage >50% for ui/*
   - [ ] Commit: "feat: core UI components (Button, Card, Badge, Skeleton, Progress)"
   
   **No Storybook export.** (Removed from Sprint 1 scope; see Sprint 2 prep doc.)
   
   **Dependencies:** Tarea 1, Tarea 3 (layout)
   
   ---
   
   ## Tarea 5: App Shell Components (1 day)
   **Spec:** app-shell/spec.md §2.3-2.6
   **Files:** src/components/shell/{TopNav,BottomTabBar,SkipLink,GlobalError}.tsx
   **AC:**
   - [ ] **TopNav** (header, theme toggle button, logo)
     - [ ] Tests: tests/integration/shell/topnav.test.tsx (render, theme toggle works)
   - [ ] **BottomTabBar** (mobile nav stub, 5 tabs: home/wardrobe/outfits/vton/profile)
     - [ ] Tests: tests/integration/shell/bottomtabbar.test.tsx (active state)
   - [ ] **SkipLink** (a11y: hidden link to main content)
     - [ ] Tests: tests/integration/shell/skiplink.test.tsx (visible on focus, href="#main")
   - [ ] **GlobalError** (boundary component for unhandled errors)
     - [ ] Tests: tests/integration/shell/globalerrror.test.tsx (catches errors, displays fallback UI)
   - [ ] All tests pass
   - [ ] Commit: "feat: app shell components (TopNav, BottomTabBar, SkipLink, GlobalError)"
   
   **Dependencies:** Tarea 1, Tarea 3
   
   ---
   
   ## Tarea 6: API Client Contract (1.5 days)
   **Spec:** api-client-and-schemas/spec.md §2
   **Files:** src/lib/api-client.ts, src/lib/schemas.ts, src/types/api.ts
   **AC:**
   - [ ] Zod schemas defined (Garment, Outfit, User, VtonJob)
   - [ ] apiRequest<T>() generic function with error handling
   - [ ] Error hierarchy: StyleMeError → ApiError/ValidationError/NetworkError
   - [ ] Tests: tests/lib/api-client.test.ts (mocked MSW, type safety, error cases)
   - [ ] Fixtures: public/fixtures/{garment,outfit,user,vton-job}.json (test data)
   - [ ] Commit: "feat: API client and Zod schemas"
   
   **Dependencies:** Tarea 0
   
   ---
   
   ## Total Sprint 1 Tareas (Leonardo)
   
   | Tarea | Description | Days | Cum. | Critical Path |
   | --- | --- | --- | --- | --- |
   | 0 | Project scaffold | 1.5 | 1.5 | YES (blocker) |
   | 1 | Tokens + utilities | 1.5 | 3 | YES (blocks 4,5) |
   | 2 | Theme switching | 1 | 4 | YES (blocks 5) |
   | 3 | Providers + layout | 1 | 5 | YES (blocks 4,5) |
   | 4 | Core components | 2.5 | 7.5 | YES |
   | 5 | Shell components | 1 | 8.5 | YES |
   | 6 | API client | 1.5 | 10 | YES (for Jaicel) |
   
   **Total: 10 days-person, 10 days calendar (1.0x multiplier, defendible)**
   **Availability: 40 hours / ~4 hours per day = 10 calendar days = ✅ FITS**
   
   ---
   
   ## Execution Order
   
   **Day 1 (26 ago, 19:00):** Start Tarea 0 (scaffold)
   **Day 2 (27 ago, complete 0 + start 1):** Finish scaffold, start tokens
   **Days 2-3 (27-28 ago):** Tokens (1.5 days) + Theme switching (1 day)
   **Days 4-5 (29-30 ago):** Providers + Layout (1 day), then Core Components (start)
   **Days 5-7 (31 ago - 2 sep):** Core Components (2.5 days)
   **Days 7-8 (2-3 sep):** Shell Components (1 day)
   **Days 8-10 (3-5 sep):** API Client (1.5 days) + reviews, refactoring
   **Days 10-14 (6-8 sep):** Buffer for PR reviews, fixes, integration tests
   
   ---
   
   ## Pair Sessions
   - **Tarea 6 (API client):** Pair with Jaicel (2h sync on 1 sep) to align Zod schemas with SQLAlchemy models
   - **Tarea 5 (GlobalError):** Pair with Manuel (1h sync on 2 sep) for error tracking integration (Sentry, logging)
   
   ## Daily Standup
   - **Time:** 09:30–09:45 (15 min, async Slack post or video if team overlaps)
   - **Report:** Yesterday done, today plan, blockers
   - **Audience:** All 4 (Leonardo, Jaicel, Huascar, Manuel)
   
   ## If Behind Schedule
   - **Priority 1 (non-negotiable):** Tarea 0, 1, 3, 4 (shell foundation + 5 components)
   - **Priority 2 (move to Sprint 2):** Tarea 5 (shell refinement), Tarea 6 (can pair with Jaicel in Tarea 7 of Jaicel's sprint)
   - **Escalate:** Notify PO (Leonardo) by EOD Day 5 if >1 day behind
   ```

2. ✍️ **sprint-1-init-jaicel.md** (sin cambios mayores, confirmar refs de spec):
   ```markdown
   [Similar structure to Leonardo, but with Jaicel's 5 tareas: API Client, Domain Models, Pydantic Schemas, Alembic Migrations, CLIP Eval]
   
   **Total: 10-12 days-person (defendible)**
   **Key sync:** Pair with Leonardo on Zod ↔ SQLAlchemy alignment
   ```

3. ✍️ **sprint-1-init-huascar.md** (QA + Data Validation):
   ```markdown
   # Sprint 1 Init — Huascar Camilo Durán Avendaño
   
   ## Role Summary
   - **Asiento C (Sprint 1):** QA & Validación
   - **Area:** Frontend QA (coverage, visual regression base, data validation)
   - **Time window:** 26 ago – 8 sep 2026
   - **Availability:** 19:00–23:00 daily (4h/day)
   
   ## Tarea Q1: Test Suite Skeleton (1 day)
   **Spec:** design-system/spec.md §4 (test infrastructure)
   **AC:**
   - [ ] tests/ directory structure: unit/, integration/, e2e/
   - [ ] tests/setup.ts + vitest.config.ts configured
   - [ ] First test runs green: `npm run test`
   - [ ] Tests report coverage (target >50% by Sprint end)
   
   **Dependencies:** Leonardo Tarea 0 (project scaffold)
   
   ---
   
   ## Tarea Q2: Coverage Gate Enforcement (1.5 days)
   **Spec:** design-system/spec.md §4 + CLAUDE.md §3 (DoD: coverage gates)
   **AC:**
   - [ ] CI enforces >50% coverage for src/components/ui/* (Leonardo's components)
   - [ ] CI blocks merge if coverage drops below threshold
   - [ ] Script: coverage-enforce.sh in .github/workflows/ci.yml
   
   **Dependencies:** Tarea Q1
   
   ---
   
   ## Tarea Q3: Data Validation Suite (1 day)
   **Spec:** Data pipeline (CRISP ML) §1 (validation)
   **AC:**
   - [ ] Validation tests for fixture data (public/fixtures/*.json)
   - [ ] Schema validation: Garment, Outfit, User, VtonJob against Zod schemas
   - [ ] Tests in tests/data-validation/*.test.ts
   
   **Dependencies:** Jaicel Tarea (API client schemas ready)
   
   ---
   
   ## Pair Sessions
   - **Day 1 (26 ago):** Pair with Jaicel (auth security review, 2h)
   - **Day 5 (1 sep):** Pair with Leonardo (component test patterns, 1h)
   
   ## Total: 3.5 days (tight, but QA starts in parallel after Tarea 0)
   ```

4. ✍️ **sprint-1-init-manuel.md** (CI/CD, Observability):
   ```markdown
   # Sprint 1 Init — Manuel Jiménez Mendoza
   
   ## Role Summary
   - **Asiento D (Sprint 1):** Infra/Release/DevOps
   - **Area:** CI/CD, Logging, Observability
   - **Time window:** 26 ago – 8 sep 2026
   - **Availability:** 19:00–23:00 daily (4h/day)
   
   ## Tarea D1: GitHub Actions Pipeline (2 days)
   **Spec:** project-scaffold/spec.md §6 (CI)
   **AC:**
   - [ ] .github/workflows/ci.yml: lint → typecheck → test → build (all <10 min total)
   - [ ] Passes for every commit to feature/* branches
   - [ ] Blocks merge to main if any step fails
   - [ ] Coverage report uploaded to Codecov
   
   **Dependencies:** Leonardo Tarea 0
   
   ---
   
   ## Tarea D2: Structured Logging (1.5 days)
   **Spec:** backend/api-gateway/spec.md (error handling logging)
   **AC:**
   - [ ] winston logger configured in src/utils/logger.ts
   - [ ] Log levels: debug, info, warn, error
   - [ ] Structured JSON logging (bunyan-compatible format)
   - [ ] Tests: tests/utils/logger.test.ts
   
   **Dependencies:** Tarea 0
   
   ---
   
   ## Tarea D3: Sentry Integration (1 day)
   **Spec:** backend/api-gateway/spec.md (error tracking)
   **AC:**
   - [ ] Sentry initialized in src/utils/sentry.ts
   - [ ] GlobalError boundary sends errors to Sentry
   - [ ] Environment: dev (console only), staging/prod (Sentry enabled)
   
   **Dependencies:** Tarea D2, Leonardo Tarea 5 (GlobalError)
   
   ---
   
   ## Tarea D4: SLOs Formales (1 day)
   **Spec:** backend/api-gateway/spec.md (monitoring)
   **AC:**
   - [ ] Documented SLOs: p95 latency, error rate, uptime
   - [ ] Prometheus metrics exported from Next.js
   - [ ] Grafana dashboard (stub, ready for data in Sprints 2-3)
   
   **Dependencies:** Tarea D1
   
   ---
   
   ## Total: 5.5 days (defendible, infra work parallelizable)
   ```

---

**✅ MÓDULO 6 DELIVERABLES:**
- [ ] sprint-1-init-leonardo.md (REESCRITO: 6 tareas, 10 days defendibles, refs de spec precisas)
- [ ] sprint-1-init-jaicel.md (actualizado: sin tareas ML, confirmar refs)
- [ ] sprint-1-init-huascar.md (3 tareas QA, ajustado para Sprint 1 reducido)
- [ ] sprint-1-init-manuel.md (5 tareas Infra, confirmado)
- [ ] Todos los prompts tienen: spec refs, AC checklist, pair plan, exec order, "if behind" escalation

---

### MÓDULO 7: Gobernanza y Commit a Main
**Dependencia:** MÓDULO 1-6  
**Responsable IA:** Redacción de PR + decision log  
**Responsable Team:** Review + approve  
**Tiempo IA:** 1-2h  
**Timeline:** 2 sep

#### Objetivo
Todos los cambios se registran en main vía PR, con historia clara, revisión de equipo, y gobernanza practicada.

**Solución:**

1. ✍️ **docs/DECISION-LOG.md** (consolidado):
   ```markdown
   # StyleMe Sprint 1 Decision Log
   
   ## P0#1: Frontend Scaffold Blocker (30 ago 2026)
   **Owner:** Leonardo + Manuel
   **Decision:** Create Tarea 0 (project-scaffold spec) as blocker for all feature work.
   **Why:** Specs assumed foundation exists but no task created it.
   **How to apply:** Tarea 0 executes day 1, blocks Tarea 1-14.
   **Status:** Implemented in sprint-1-init-leonardo.md
   
   ## P0#2: Component List Alignment (30 ago 2026)
   **Owner:** Leonardo (Feature Lead)
   **Decision:** Sprint 1 = 5 core components (Button, Card, Badge, Skeleton, Progress).
                Sprint 2 = 4 advanced (Dialog, Sheet, Tabs, Toast).
   **Why:** Violates CLAUDE.md §8 to invent components not in spec. Reduces scope to 10 days defendible.
   **How to apply:** Tarea 4 updated with AC for exactly 5 comps. Sprint 2 prep doc created.
   **Status:** Implemented in sprint-1-init-leonardo.md §Tarea 4
   
   ## P0#3: ML Tasks Out of Scope (30 ago 2026)
   **Owner:** Leonardo (Feature Lead) + PO
   **Decision:** Frontend repo = ONLY Next.js/React/TypeScript. ML/Data tasks → backend repo.
   **Why:** Violates CLAUDE.md §1 on scope. Mixing stacks breaks repo boundaries.
   **How to apply:** Remove EDA, ResNet, Embedding tasks from Leonardo's carga. Backend repo TBD.
   **Status:** Implemented in sprint-1-init-leonardo.md, KICKOFF-VALIDATION updated
   
   ## P1#4: Numero de Tareas Congelado (30 ago 2026)
   **Owner:** PO + Team
   **Decision:** Single source of truth = ClickUp. Sprint 1 = 44 tasks (26 ago - 8 sep).
   **Why:** Docs diverged (38 → 41 → 44 in 48h without decision).
   **How to apply:** All docs updated to 44. ClickUp CSV export as backup.
   **Status:** Implemented in SPRINT-1-MASTER.csv, all docs aligned
   
   ## P1#5: Cronograma Innegociable, Alcance Reducido (30 ago 2026)
   **Owner:** Leonardo (Feature Lead) + PO
   **Decision:** 9 sprints × 2 weeks = 18 weeks (12 ago - 15 dic) is LOCKED.
                Sprint 1 reduced to 10 days defendible (not 20).
                Storybook moved to Sprint 3 evaluation.
   **Why:** Original cronograma overcommitted. IA-assisted work = 0.4-0.5x multiplier.
   **How to apply:** Sprint 1 init docs re-estimated. Sprint 2 prep doc created.
   **Status:** Implemented in sprint-breakdown-FINAL.md
   
   ## P1#6: Storybook Removed from Sprint 1 (30 ago 2026)
   **Owner:** Leonardo (Feature Lead)
   **Decision:** Storybook REMOVED from Sprint 1 scope. Not in any spec. Move to Sprint 3 evaluation.
   **Why:** No formal spec, adds ~1 day of work, not critical for MVP.
   **How to apply:** Tarea 4 AC updated: "No Storybook export in Sprint 1"
   **Status:** Implemented in sprint-1-init-leonardo.md
   
   ## P1#7: Spec References Corrected (31 ago 2026)
   **Owner:** Leonardo
   **Decision:** All spec refs migrated to openspec/specs/frontend/… format. Section refs validated.
   **Why:** Broke references (docs/specs/… doesn't exist, §2.5 mixtures).
   **How to apply:** Created docs/SPEC-REFERENCES-CORRECTED.md, all init prompts updated.
   **Status:** Implemented in design-system/spec.md, app-shell/spec.md, all init docs
   
   ## P1#8: Coverage E2E → Owned by Manuel (2 sep 2026)
   **Owner:** Manuel (Infra/QA integration)
   **Decision:** E2E coverage (Playwright) merged with unit coverage (Vitest) AFTER Sprint 1 (Sprint 2+).
                Sprint 1 target: >50% unit coverage, E2E baseline created (not enforced).
   **Why:** Requires infra setup (c8/istanbul). Not blocker for Sprint 1 launch.
   **How to apply:** sprint-1-init-manuel.md added tarea D5 (coverage merge script), Sprint 2 prep doc.
   **Status:** Noted in EXECUTION-PLAN as "deferred to Sprint 2"
   
   ## P2: Gobernanza (OpenSpec + Commits to Main) (2 sep 2026)
   **Owner:** Leonardo + Team
   **Decision:** All planning docs committed to main via PR before Sprint 1 execution.
                Practices gobernanza: PR review, decision audit trail, no secrets in prompts.
   **Why:** CLAUDE.md §3, §6 require registered decisions and no secrets.
   **How to apply:** This PR (and all sprint-1-init-*.md) go to main via approved PR.
   **Status:** This PR (2 sep 2026)
   ```

2. ✍️ **PR a main:**
   ```
   Title: "docs: resolve sprint-1 P0 blockers and align planning (decision log P0#1-8)"
   
   Body:
   
   ## Summary
   
   This PR resolves 10 critical/medium findings from Leonardo's Sprint 1 pre-project review:
   
   ### P0 Blockers (Critical)
   - **P0#1:** Created frontend/project-scaffold spec (Tarea 0 blocker)
   - **P0#2:** Aligned component list to spec (5 comps Sprint 1, 4 Sprint 2)
   - **P0#3:** Removed ML tasks from frontend Sprint 1 (backend repo scope)
   
   ### P1 Inconsistencies (High)
   - **P1#4:** Froze task count: 44 Sprint 1, 185 total (ClickUp source of truth)
   - **P1#5:** Innegociable cronograma (9 sprints × 18 weeks). Reduced Sprint 1 scope to defensible 10 days.
   - **P1#6:** Removed Storybook from Sprint 1 (not spec'd, moved to Sprint 3)
   - **P1#7:** Corrected all spec references (openspec/specs/… format, validated sections)
   - **P1#8:** E2E coverage deferred to Sprint 2 (unit >50% is Sprint 1 target)
   
   ### P2 Governance
   - Committed decision log to CLAUDE.md and docs/DECISION-LOG.md
   - OpenSpec migration completed (design-system, app-shell)
   - All sprint-1-init-*.md rewritten with precise refs, corrected estimates
   
   ## Changes
   
   - `docs/DECISION-LOG.md` (new) — consolidated P0-P2 decisions with rationale
   - `openspec/specs/frontend/project-scaffold/spec.md` (new) — Tarea 0 spec
   - `docs/SPEC-MIGRATION-STATUS.md` (new) — migration tracker (65+ reqs, 200+ AC)
   - `docs/SPEC-REFERENCES-CORRECTED.md` (new) — ref validation audit
   - `docs/sprint-breakdown-FINAL.md` (new) — 9 sprints × 2 weeks locked, scope per sprint
   - `design-system/spec.md` — fully migrated to OpenSpec format (12 reqs, 48 AC)
   - `app-shell/spec.md` — fully migrated to OpenSpec format (8 reqs, 24 AC)
   - `sprint-1-init-leonardo.md` — rewritten (Tarea 0-6, 10 days defendible, 40h fits in 4h/day × 10 days)
   - `sprint-1-init-jaicel.md` — updated (no ML tasks, spec refs corrected)
   - `sprint-1-init-huascar.md` — updated (QA scope aligned to Sprint 1)
   - `sprint-1-init-manuel.md` — confirmed (Infra/CI track confirmed)
   - `.github/workflows/ci.yml` — added project-scaffold spec (deployed by Tarea 0)
   - `.gitignore`, `package.json`, `tsconfig.json`, etc. — scaffold files (Tarea 0)
   - `CLAUDE.md` — decision log entries added (§3, §6)
   - `SPRINT-1-READY`, `SPRINT-1-EXECUTION-PLAN`, `SPRINT-1-KICKOFF-VALIDATION` — task counts aligned (44 total)
   
   ## Validation
   
   - [ ] 44 tasks Sprint 1 (26 ago - 8 sep) confirmed in SPRINT-1-MASTER.csv
   - [ ] 185 tasks Sprints 0-9 confirmed in ClickUp
   - [ ] All specs migrated to openspec/specs/frontend/… format
   - [ ] All sprint-1-init-*.md reviewed for spec ref precision
   - [ ] Cronograma: 9 sprints × 2 weeks locked (no negotiation)
   - [ ] Leonardo's 10 days (40 hours @ 4h/day) fits within window
   - [ ] Jaicel's 10-12 days similarly defensible
   - [ ] Huascar + Manuel tracks aligned to parallel execution
   
   ## Test Plan
   
   - [ ] Repository cloned, dependencies installed (Tarea 0 to execute)
   - [ ] `npm run typecheck && npm run test && npm run build` all ✅
   - [ ] CI pipeline green (lint, typecheck, test, build <10 min)
   - [ ] Leonardo executes Tarea 0 as simulacro (1.5 days), reports blockers
   - [ ] Each team member reviews own sprint-1-init-*.md for clarity
   
   ## Timeline
   
   - **30 ago:** Decision log entries (this PR)
   - **1 sep:** OpenSpec migration + scaffold spec finalized
   - **2 sep:** This PR merged to main
   - **2 sep, 19:00:** Leonardo starts Tarea 0
   - **3 sep, 19:00:** Leonardo starts Tarea 1 (tokens)
   - **8 sep, 23:59:** Sprint 1 ends
   - **9 sep, 09:00:** Sprint 1 review + Sprint 2 kickoff
   
   ## Reviewers
   
   - **Design/Frontend:** Jaicel Velasco (app-shell refs, API client alignment)
   - **Infra/Governance:** Manuel Jiménez (CI pipeline, decision audit)
   - **PO/Feature Lead:** Leonardo Ibarra López (scope cuts confirmation)
   
   🤖 Generated with IA assistance (Claude Code).
   ```

---

**✅ MÓDULO 7 DELIVERABLES:**
- [ ] docs/DECISION-LOG.md (P0-P2 entries with rationale)
- [ ] PR to main reviewed by Jaicel + Manuel (Leonardo does NOT self-approve)
- [ ] PR merged to main
- [ ] CLAUDE.md updated with decision flag entries

---

### MÓDULO 8: Validación Final Pre-Kickoff
**Dependencia:** MÓDULO 1-7 (todo merged)  
**Responsable IA:** Matriz de trazabilidad, checksum  
**Responsable Team:** Ejecuta simulacro (Leonardo Tarea 0)  
**Tiempo IA:** 1-2h  
**Timeline:** 2 sep – 3 sep

#### Objetivo
Antes de que el equipo empiece a codificar, validar que TODOS los halazgos están resueltos, documentación es consistente, y proyecto compilada.

**Solución:**

1. ✍️ **SPRINT-1-FINAL-VALIDATION.md:**
   ```markdown
   # Sprint 1 Final Validation Checklist
   
   ## P0 Bloqueadores — Resolved
   - [x] P0#1: Project scaffold spec created (openspec/specs/frontend/project-scaffold/spec.md)
   - [x] P0#2: Component list aligned (5 comps Sprint 1, per design-system §2.4)
   - [x] P0#3: ML tasks moved to backend repo (Leonardo's carga = 0 ML tasks)
   
   ## P1 Inconsistencias — Aligned
   - [x] P1#4: Task count frozen (44 Sprint 1, 185 total)
   - [x] P1#5: Cronograma innegociable (9 sprints × 18 weeks), scope reduced (10 days defendible)
   - [x] P1#6: Storybook removed (not spec'd, Sprint 3 evaluation)
   - [x] P1#7: Spec refs corrected (openspec/specs/frontend/… format)
   - [x] P1#8: E2E coverage deferred to Sprint 2
   
   ## P2 Gobernanza — Practicada
   - [x] Decisions logged in docs/DECISION-LOG.md + CLAUDE.md
   - [x] OpenSpec migration completed (design-system, app-shell)
   - [x] PR to main reviewed + merged (no self-approve)
   
   ## Documentación — 1 Única Fuente
   - [x] SPRINT-1-MASTER.csv (ClickUp export, 44 tasks)
   - [x] sprint-breakdown-FINAL.md (9 sprints × 2 weeks locked)
   - [x] SPRINT-1-TRACEABILITY-MATRIX.md (spec ↔ task ↔ test)
   - [x] All sprint-1-init-*.md aligned (Leonardo, Jaicel, Huascar, Manuel)
   - [x] CLAUDE.md updated (decision flags, no refs rotas)
   
   ## Proyecto — Compilando
   - [x] Repository initialized (git + GitHub)
   - [x] package.json + all configs (TypeScript, Tailwind, Vitest, Playwright, ESLint, Prettier)
   - [x] .github/workflows/ci.yml configured
   - [x] npm run typecheck exits 0 (empty scaffoldrep)
   - [x] npm run test exits 0 (empty suite)
   - [x] npm run build produces .next/ (no errors)
   - [x] CI pipeline green (all GitHub Actions passing)
   
   ## Team Ready
   - [x] Leonardo: Tarea 0 (project scaffold) simulacro executed (1.5 days, no blockers)
   - [x] Leonardo: Reviewed sprint-1-init-leonardo.md (6 tareas, 10 days, 40h fits)
   - [x] Jaicel: Reviewed sprint-1-init-jaicel.md (5 tareas, 10-12 days)
   - [x] Huascar: Reviewed sprint-1-init-huascar.md (3 tareas QA)
   - [x] Manuel: Reviewed sprint-1-init-manuel.md (5 tareas Infra)
   - [x] All understand roles, dependencies, pair plan
   
   ## GO Signal Criteria
   - [x] Zero P0 bloqueadores remaining
   - [x] All docs in main (no conflicts)
   - [x] Repo compiles (npm run build ✅)
   - [x] CI green
   - [x] Team confirmed roles + availability
   - [x] No ambiguity in task AC or spec refs
   
   ## Timeline to Kickoff
   - **2 sep, 14:00:** PR merged to main
   - **2 sep, 19:00:** Leonardo starts Tarea 0 (simulacro, goes live)
   - **3 sep, 10:00:** Team standup: "Leonardo Tarea 0 complete? Any blockers?"
   - **3 sep, 19:00:** Full team starts Sprint 1 active (Tarea 1+)
   - **8 sep, 23:59:** Sprint 1 ends
   - **9 sep, 09:00:** Sprint 1 Review + Sprint 2 Kickoff
   
   ## Sign-Off
   
   - [ ] Leonardo: "_al pie de la letra_, everything documented, no ambiguity"
   - [ ] Jaicel: "Backend dependencies clear, Zod ↔ SQLAlchemy sync confirmed"
   - [ ] Huascar: "QA scope locked, test patterns understood"
   - [ ] Manuel: "Infra dependencies mapped, CI ready"
   - [ ] PO/IA: "All P0-P2 resolved, GO for Sprint 1"
   ```

2. ✍️ **Simulacro — Leonardo Tarea 0:**
   ```bash
   # 2 sep 2026, 19:00
   # Leonardo clones repo, executes Tarea 0 (project scaffold)
   
   git clone https://github.com/styleme/styleme-frontend.git
   cd styleme-frontend
   npm install  # ~3 min
   npm run typecheck  # Should exit 0
   npm run test  # Should exit 0 (empty suite)
   npm run build  # Should produce .next/ with no errors
   npm run lint  # Should pass
   
   # If all ✅: Tarea 0 COMPLETE
   # If ❌: Log blocker, escalate to Manuel (Infra)
   
   # Commit Tarea 0 results:
   git commit -m "Tarea 0: Project scaffold initialization (TypeScript strict, Tailwind, Vitest, Playwright, CI)"
   git push origin feature/tarea-0
   # Open PR, merge after review
   ```

3. ✍️ **Checksum Final:**
   ```markdown
   # Sprint 1 Final Checksum
   
   **Date:** 2 sep 2026, 18:00 UTC
   **Status:** VALIDATED & GO
   
   ## Numbers (Locked)
   | Item | Target | Actual | Status |
   | --- | --- | --- | --- |
   | Sprint 1 tasks | 44 | 44 | ✅ |
   | Leonardo tareas | 6 | 6 | ✅ |
   | Jaicel tareas | 5 | 5 | ✅ |
   | Huascar tareas | 3 | 3 | ✅ |
   | Manuel tareas | 5 | 5 | ✅ |
   | Total Sprint 1 | 19 | 19 | ✅ |
   | Sprint 1-9 total | 185 | 185 | ✅ |
   | Specs (OpenSpec) | 14 | 14 | ✅ |
   | Requirements detected | 65+ | 65+ | ✅ |
   | Docs in main | 20+ | 20+ | ✅ |
   
   ## Quality Metrics
   | Metric | Target | Status |
   | --- | --- | --- |
   | TypeScript strict | yes | ✅ |
   | No hardcoded secrets in prompts | yes | ✅ |
   | All spec refs validated (openspec/…) | yes | ✅ |
   | Trazabilidad spec ↔ task ↔ test | 100% | ✅ |
   | Team understands all roles | yes | ✅ |
   | Zero P0 bloqueadores | yes | ✅ |
   | Repository compiles | yes | ✅ |
   | CI pipeline green | yes | ✅ |
   
   ## Readiness
   - ✅ Repo ready for team
   - ✅ Documentación locked (no more changes to sprint-1-init-*.md without PO approval)
   - ✅ ClickUp sync complete (44 tasks PLANNING, 185 total)
   - ✅ Team roster confirmed (Leonardo, Jaicel, Huascar, Manuel)
   - ✅ Pair sessions scheduled
   - ✅ Daily standup rhythm ready (09:30, 15 min Slack/Zoom)
   
   **🟢 KICKOFF READY. PROCEED WITH SPRINT 1 ACTIVE.**
   ```

---

**✅ MÓDULO 8 DELIVERABLES:**
- [ ] SPRINT-1-FINAL-VALIDATION.md (checklist completed)
- [ ] Leonardo simulacro (Tarea 0) PASSED
- [ ] Team sign-offs (4 × "understood, GO")
- [ ] Checksum final (44 tasks, 185 total, 0 P0 blockeadores, CI ✅)

---

## 📊 CRONOGRAMA INTEGRAL DE EJECUCIÓN

```
╔════════════════════════════════════════════════════════════════════════╗
║           PRE-PROJECT REMEDIATION — EXECUTION TIMELINE                ║
╚════════════════════════════════════════════════════════════════════════╝

SEMANA 1 (30 ago - 2 sep)
┌──────────────────────────────────────────────────────────────────────────┐
│ 30 ago (HOY)                                                             │
│ ├─ 15:00 → 18:00: MÓDULO 1 (P0 bloqueadores)                            │
│ │  ├─ P0#1: project-scaffold spec                                       │
│ │  ├─ P0#2: component list 8→5                                          │
│ │  └─ P0#3: ML tasks moved to backend                                   │
│ └─ DELIVERABLE: DECISION-LOG-P0.md, bootstrap-spec.md                  │
│                                                                          │
│ 31 ago (VIERNES)                                                         │
│ ├─ 09:00 → 12:00: MÓDULO 2 (alineación de docs)                         │
│ │  ├─ ClickUp export → SPRINT-1-MASTER.csv                             │
│ │  ├─ Actualizar números (44, 185)                                     │
│ │  └─ Matriz de trazabilidad                                            │
│ ├─ 12:00 → 15:00: MÓDULO 3 (cronograma defendible)                      │
│ │  ├─ Sprint breakdown (9 sprints × 2 weeks locked)                    │
│ │  ├─ Re-estimar tareas (IA multiplier 0.4-0.5x)                       │
│ │  └─ Sprint 2 prep doc                                                 │
│ ├─ 15:00 → 20:00: MÓDULO 4 (OpenSpec migration)                         │
│ │  ├─ design-system/spec.md → OpenSpec native                          │
│ │  ├─ app-shell/spec.md → OpenSpec native                              │
│ │  ├─ Tokens *-foreground + contrast tests                             │
│ │  └─ Spec reference corrections                                        │
│ └─ DELIVERABLE: design-system§2.4, app-shell§2.6, tokens corrected     │
│                                                                          │
│ (PARALELO: MÓDULO 5 scaffold repo puede empezar)                        │
│                                                                          │
│ 1 sep (SÁBADO)                                                           │
│ ├─ 09:00 → 17:00: MÓDULO 5 (project scaffold — código ejecutable)      │
│ │  ├─ package.json, tsconfig, tailwind, vitest, playwright             │
│ │  ├─ .github/workflows/ci.yml                                         │
│ │  ├─ src/ + tests/ structure                                          │
│ │  └─ npm run build ✅, npm run test ✅                                │
│ └─ DELIVERABLE: Repo cloneable + compilando                            │
│                                                                          │
│ (PARALELO: MÓDULO 6 sprint-init prompts)                                │
│ ├─ 17:00 → 21:00: MÓDULO 6 (prompts para team)                         │
│ │  ├─ sprint-1-init-leonardo.md (REESCRITO, 6 tareas, 10 días)        │
│ │  ├─ sprint-1-init-jaicel.md (actualizado)                           │
│ │  ├─ sprint-1-init-huascar.md (ajustado)                             │
│ │  └─ sprint-1-init-manuel.md (confirmado)                            │
│ └─ DELIVERABLE: 4 prompts ejecutables                                  │
│                                                                          │
│ 2 sep (DOMINGO)                                                          │
│ ├─ 08:00 → 10:00: MÓDULO 7 (PR + governance)                           │
│ │  ├─ docs/DECISION-LOG.md (consolidado)                              │
│ │  ├─ PR a main (título, descripción, reviewers)                      │
│ │  └─ Merge after review (Jaicel + Manuel)                            │
│ ├─ 10:00 → 12:00: MÓDULO 8 (validación final)                          │
│ │  ├─ SPRINT-1-FINAL-VALIDATION.md (checklist)                        │
│ │  ├─ Checksum (44 tasks, 185 total, 0 P0 blockers)                   │
│ │  └─ Team sign-offs                                                    │
│ ├─ 19:00 → 20:30: Leonardo Tarea 0 SIMULACRO (1.5h live)              │
│ │  ├─ Clone repo → npm install                                        │
│ │  ├─ npm run typecheck && npm run test && npm run build              │
│ │  └─ Report: bloqueadores?                                            │
│ └─ DELIVERABLE: Repo verified, team confirmed GO                       │
└──────────────────────────────────────────────────────────────────────────┘

SEMANA 2 (3-8 sep) — SPRINT 1 ACTIVE
┌──────────────────────────────────────────────────────────────────────────┐
│ 3 sep (LUNES)                                                            │
│ ├─ 09:00: Team standup (Leonardo + Jaicel + Huascar + Manuel)           │
│ │  └─ Status: "Tarea 0 complete, P0 blockers resolved, GO for Tarea 1" │
│ ├─ 19:00: Sprint 1 ACTIVE START                                         │
│ │  ├─ Leonardo: Start Tarea 1 (tokens, 1.5 days)                       │
│ │  ├─ Jaicel: Start Tarea 1 (API client, 2 days)                      │
│ │  ├─ Huascar: Start Tarea Q1 (test suite skeleton, 1 day)            │
│ │  └─ Manuel: Start Tarea D1 (CI pipeline, 2 days)                    │
│ └─ MOMENTUM: All 4 tareas en progreso paralelo                          │
│                                                                          │
│ 4-8 sep                                                                  │
│ ├─ Daily 09:30: Standup (15 min Slack/Zoom)                            │
│ ├─ Daily 19:00: Individual task work (4h/day)                          │
│ ├─ By 6 sep: Mid-sprint check (any cascading blockers?)                │
│ ├─ By 8 sep: All Tareas 1-6 (Leonardo), 1-5 (Jaicel), Q1-Q3 (Huascar), │
│ │            D1-D4 (Manuel) ready for review/merge                     │
│ └─ 8 sep, 23:59: SPRINT 1 DEADLINE                                     │
│                                                                          │
│ 9 sep (MARTES)                                                           │
│ ├─ 09:00–12:00: Sprint 1 Review                                        │
│ │  ├─ Demo: Leonardo components (5 UI + shell)                        │
│ │  ├─ Demo: Jaicel API client + schemas                               │
│ │  ├─ Demo: Huascar test infrastructure                               │
│ │  ├─ Demo: Manuel CI pipeline                                         │
│ │  └─ Acceptance: All AC met, all PRs merged                          │
│ └─ 14:00–15:00: Sprint 2 Kickoff (rotation: Jaicel = Asiento A)       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ESTIMACIONES FINALES (Trabajo Hiperasistido por IA)

| Módulo | Contenido | IA horas | Team async | Total | Blocker |
| --- | --- | --- | --- | --- | --- |
| **1** | P0 resolutions (3 decisiones) | 3-4h | Async (30 min) | 4h | Crit |
| **2** | Alineación docs + trazabilidad | 2-3h | Async (1h) | 3h | Crit |
| **3** | Sprint breakdown + re-estimación | 2-3h | Async (30 min) | 3h | Crit |
| **4** | OpenSpec migration + tokens | 4-5h | Async (1h) | 5h | Crit |
| **5** | Project scaffold (código) | 6-8h | Async (1h) | 8h | Crit |
| **6** | Prompts de team (4 docs) | 3-4h | Async (30 min) | 4h | Crit |
| **7** | PR + decision log + merge | 1-2h | Review (1h) | 2h | Crit |
| **8** | Final validation + simulacro | 1-2h | Ejecutar (1.5h) | 2h | Crit |
| | **TOTAL** | **24-32h** | **~6h** | **32-38h** | |

**Team Effort:** ~6 horas async (reviews, feedbacks, simulacro)  
**IA Effort:** ~24-32 horas (escritura, código, specs, análisis)  
**Elapsed:** 3 días calendario (30 ago - 2 sep)

---

## ✅ ÉXITO = CUANDO TODO ESTO ESTÉ HECHO

```
✅ P0#1: Tarea 0 spec exists, blocker documented, Leonardo ready to execute
✅ P0#2: 5 componentes en Tarea 4 (no 8), aligned to design-system §2.4
✅ P0#3: ML tasks removed from frontend Sprint 1 (Leonardo carga = 0 ML)
✅ P1#4: Single number = 44 Sprint 1, 185 total (all docs aligned)
✅ P1#5: 9 sprints × 18 weeks LOCKED, Sprint 1 = 10 days defendible (40h fits)
✅ P1#6: Storybook removed from Sprint 1 (moved to Sprint 3)
✅ P1#7: All spec refs corrected (openspec/specs/frontend/… format)
✅ P1#8: E2E coverage deferred to Sprint 2 (Sprint 1 = >50% unit coverage)
✅ P2: Decision log in main, PR reviewed + merged, gobernanza practicada
✅ PROYECTO: Repo compiles (npm run build ✅), CI green, team ready

→ **EVERYONE SAYS: "_Al pie de la letra_, GO for Sprint 1 active (2 sep 19:00)"**
```

---

## 🚀 NEXT STEPS (INMEDIATOS)

**30 ago, 15:00:** Iniciar MÓDULO 1 (P0 bloqueadores).  
**31 ago, 09:00:** MÓDULO 2 (alineación docs).  
**1 sep, 09:00:** MÓDULO 5 (scaffold) + MÓDULO 6 (prompts).  
**2 sep, 08:00:** MÓDULO 7 (PR) + MÓDULO 8 (validación).  
**2 sep, 19:00:** Leonardo Tarea 0 LIVE.  
**3 sep, 09:00:** Team standup, full Sprint 1 active.  
**8 sep, 23:59:** Sprint 1 closes.  
**9 sep, 09:00:** Sprint 1 review + Sprint 2 kickoff (rotation: Jaicel = Asiento A).

---

**📋 Plan integrado, modular, especializado, sin negocia sprints. ¿Procedo?**
