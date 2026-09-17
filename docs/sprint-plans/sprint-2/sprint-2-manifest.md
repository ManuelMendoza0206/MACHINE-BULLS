# Sprint 2 — Manifiesto canónico (repo ↔ ClickUp)

**Estado:** fuente de verdad de _estructura_ del Sprint 2. Derivado de
`team-rotation-plan.md` §3/§7, las specs de `openspec/specs/{frontend,backend}/`, y una
auditoría real de GitHub + ClickUp ejecutada el **17-sep-2026** (5 días antes del cierre).
**Este documento registra el estado verificado, no el declarado.**

> Por qué existe: al auditar Sprint 2 el 17-sep se encontró que ClickUp no refleja el trabajo
> real ya mergeado en `main` (ver §3), y que al menos una tarea de Asiento D está mal asignada
> respecto a la tabla de rotación (ver §4). Este manifiesto corrige ambas cosas.

---

## 1. Ventana y asientos

| | |
|---|---|
| Sprint 1 (features) | 2 – 8 sep 2026 — **cerrado**, ver `../sprint-1/` |
| Sprint 2 (features) | **9 – 22 sep 2026** |
| Hoy (auditoría) | 17 sep 2026 — **quedan 5 días** |
| Review + Sprint 3 kickoff | 23 sep 2026 |

| Asiento | Persona | Epics Sprint 2 (`team-rotation-plan.md` §3) |
|---|---|---|
| A — Feature Lead | **Jaicel** | `frontend/api-client-and-schemas` |
| B — Feature Support | **Huascar** | `backend/domain-and-database` (cierre), `backend/api-gateway` (base) |
| C — QA & Validación | **Manuel** | Valida Sprint 1: `design-system`, `app-shell-and-navigation`, `landing-and-auth-flow` |
| D — Infra/Release | **Leonardo** | `Q3` (registro de modelos), `Q1` (E2E suite) |

Prompts individuales: `sprint-2-init-jaicel.md`, `sprint-2-init-huascar.md`,
`sprint-2-init-manuel.md`, `sprint-2-init-leonardo.md`.

---

## 2. Qué SÍ está hecho al 17-sep (verificado contra CI real, no contra ClickUp)

Esto quedó mergeado en `main` con CI verde (los 3 jobs `quality`/`build`/`e2e`), pero
corresponde a trabajo de **Sprint 1** que se completó tarde (el PR de Leonardo estuvo abierto
13 días sin revisar) y a adelantos de sprints posteriores hechos en la misma ráfaga de PRs:

| PR | Contenido | Epic real | Merged |
|---|---|---|---|
| #9 | Tokens, theme, providers, 5 componentes, app shell | `frontend/design-system` + `frontend/app-shell-and-navigation` (Sprint 1) | 16-sep |
| #10 | `detectBlur`, `onboardingStore`, `uploadQueue` | `frontend/wardrobe-flow` (Sprint 3, adelantado) | 16-sep |
| #14 | Monorepo `frontend/`+`backend/`, auth Supabase, API client tipado | `frontend/landing-and-auth-flow` (S1) + `frontend/api-client-and-schemas` (**este sprint**, parcial) | 16-sep |
| #15 | Next 16 + React 19 + Tailwind v4 | infra (no epic feature) | 17-sep |
| #16 | Flujo multicapa VTON (schemas + api) | `frontend/vton-flow` (Sprint 6, adelantado) | 17-sep |

**Implicación para este sprint:** el epic de Jaicel (`api-client-and-schemas`) ya tiene una base
real en `main` desde el PR #14 (cliente HTTP + schemas Zod). La Tarea de Jaicel en Sprint 2 es
**cerrar** lo que falta (jerarquía de errores por clase, contract tests), no partir de cero.

## 3. Qué NO está hecho — brecha real de ClickUp

Verificado por API contra el espacio `MachineBulls⚙️🐂` el 17-sep:

- **0 tareas de Sprint 1 o 2 están en `complete`** (solo 3 tareas de Discovery/Sprint-0
  histórico lo están, en todo el tablero de 189 tareas).
- Los epics `[EPIC] frontend/design-system`, `[EPIC] frontend/app-shell-and-navigation`,
  `[EPIC] frontend/landing-and-auth-flow` — **ya mergeados y verificados** — siguen en `to do`
  en ClickUp, `date_updated` de fines de agosto (antes de que existiera el código que los cierra).
- **Ningún epic frontend de Sprint 0-2 tiene comentario de handoff** (regla §4.1 del plan de
  rotación: "quien ocupó A/B debe dejar, antes del Sprint Review, un comentario con qué quedó
  completo, qué en `update required`, y decisiones técnicas no documentadas").
- La tarea de Asiento C de Manuel (**validar Sprint 1**) no tiene rastro: ni comentario de
  revisión en los epics, ni review formal de GitHub en los PRs #14/#15/#16/#17 (Manuel los
  mergeó pero no dejó un review — `constitution.md` §3 exige ≥1 revisor aprobando).

## 4. Corrección de asignación — Asiento D (Leonardo)

`team-rotation-plan.md` §3 asigna a Leonardo (Asiento D, Sprint 2): **registro de modelos (Q3)**
y **E2E suite (Q1)**. En ClickUp:

| Tarea | Asignado hoy en ClickUp | Debería ser (según rotación) |
|---|---|---|
| "Registro y versionado de modelos" | Leonardo — `to do`, vence 22-sep | ✅ correcto |
| "Model Registry & Versioning" (lista `Data`) | Manuel — `to do`, vence 22-sep | ⚠️ posible duplicado de la anterior |
| "Completar la suite E2E cubriendo los 4 flujos críticos" | Manuel — `to do`, vence 22-sep | ⚠️ debería ser Leonardo (Q1, Asiento D de este sprint) |

**Acción:** antes de que Leonardo tome la tarea de E2E, confirmar con el equipo si es un error
de tablero o una decisión informal de dejarla con Manuel — no asumir unilateralmente.

**Hallazgo aparte, no asignado a nadie por rotación:** 3 tareas de ML (`EDA: Garment Dataset
Analysis`, `Baseline Model: ResNet-50 Training`, `Embedding Model: Triplet Loss Training`)
pasaron a `in progress` el 17-sep, asignadas a Leonardo, coincidiendo con el PR #18 (3 notebooks
de ML en la raíz del repo, autor Manuel, review Jaicel). Leonardo no tiene commits ahí. Esto
además reabre P0#3 (`CLAUDE.md` §10 — "ML/Data → repo backend, CERO en este repo") sin ADR ni
actualización de `CLAUDE.md` §1 que lo respalde. No es parte del alcance de Asiento D de
Leonardo en Sprint 2 — es una reasignación que alguien más hizo y debe aclararse, no ejecutarse
por inercia.

---

## 5. Checklist de reconciliación ClickUp (dueño: Manuel / Asiento C este sprint)

- [ ] Mover `[EPIC] frontend/design-system`, `app-shell-and-navigation`, `landing-and-auth-flow`
      a `complete` con el link del PR correspondiente como evidencia (#9, #9, #14/#16).
- [ ] Dejar comentario de handoff en cada uno de esos 3 epics (qué quedó completo / en
      `update required` / decisiones no documentadas) — regla §4.1 del plan de rotación.
- [ ] Aclarar la duplicación "Registro de modelos" (Leonardo) vs. "Model Registry & Versioning"
      (Manuel) — fusionar en una sola tarea con un solo dueño.
- [ ] Reasignar o confirmar el dueño real de "Completar la suite E2E" (¿Leonardo por rotación,
      o Manuel por decisión informal?).
- [ ] Aclarar el origen y dueño de las 3 tareas de ML reasignadas a Leonardo el 17-sep — si se
      mantiene el trabajo de ML en este repo, registrar la decisión (ADR + `CLAUDE.md` §1).
- [ ] Manuel deja un review formal de GitHub (no solo el merge) en los PRs #14/#15/#16/#17,
      o documenta por qué se saltó ese paso.
- [ ] Confirmar el conteo de tareas de este sprint contra `docs/clickup/clickup_estructura.md`
      y anotarlo en `CLAUDE.md` §10.

Cuando todo lo anterior esté hecho: **ClickUp = verde y alineado con `main`** para Sprint 2.

---

## 6. Integración ClickUp ↔ repo

`scripts/clickup/sync-sprint-1.mjs` cubre Sprint 1; no hay script equivalente para Sprint 2
todavía — extenderlo o crear `sync-sprint-2.mjs` es responsabilidad del Asiento D en turno
(Leonardo este sprint), coordinado con Manuel (dueño histórico del script).
