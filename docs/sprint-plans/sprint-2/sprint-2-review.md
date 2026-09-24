# Sprint 2 — Review (Asiento C / QA)

**Autor de esta review:** Huascar Camilo Durán Avendaño — Asiento C de Sprint 2, **en
sustitución de Manuel** (contexto completo del intercambio comunicado directamente por
Leonardo, fuera del repo). Documento pendiente de llenar — punto de partida verificado el
24-sep-2026.

## Cómo llenar este documento

Mismo procedimiento que `../sprint-1/sprint-1-review.md`. Además, en Sprint 2 tienes una
responsabilidad extra que Sprint 1 no tenía: **resolver los PRs de Sprint 2 sin review** (lista
en el handoff comunicado directamente) — eso es lo que sustituye lo que Manuel no hizo.

## Punto de partida verificado (24-sep-2026)

| Epic | Dueño | PR | Estado ClickUp al 24-sep | Nota |
|---|---|---|---|---|
| `frontend/api-client-and-schemas` | Jaicel (A) | #14 (base) + cierre | `complete`, 11 subtareas también `complete` | El único epic de S2 genuinamente cerrado con evidencia |
| `backend/domain-and-database` | (Sprint 1: Jaicel: Sprint 2 cierre: Huascar) | **ninguno** | `planning` | **No se hizo — confirmado con `git log --all -- backend/`, no hay ningún commit de Huascar tocando `backend/`. No es una tarea escondida, es deuda real que hay que asumir, no buscar más.** |
| `backend/api-gateway` | Huascar (B) | **ninguno** | `planning` | Mismo caso — `backend/src/` solo tiene `__init__.py` vacíos |
| Q3 — registro de modelos | Leonardo (D) | #21, mergeado | `update required` (mío, pendiente de tu review) | `docs/ml/MODEL_REGISTRY.md` |
| Q1 — suite E2E | Leonardo (D) | #21, mismo PR | `update required` (mío, pendiente de tu review) | 11 tests scaffold en `test.skip()`, ver `docs/sprint-plans/sprint-2/e2e-audit-2026-09.md` |

## Secciones a completar

### 1. `api-client-and-schemas` — ¿quién lo validó realmente?

<!-- Está `complete`, pero no hay registro de que alguien de QA lo haya confirmado —
     reprodúcelo tú (cobertura ≥90% citada en las subtareas, jerarquía de errores). -->

### 2. `domain-and-database` + `api-gateway` — deuda técnica, no hallazgo

<!-- No los "encuentres" en otro lado, ya se buscó a fondo (git log --all) y no existen.
     Documenta esto como deuda técnica asumida, con plan concreto: ¿lo tomas tú en este
     cierre, o queda formalmente pendiente para Sprint 3/4 con dueño y fecha? -->

### 3. Mis 2 tareas (Leonardo, Q1/Q3) — tu validación

<!-- Confirma con comandos reales (no de memoria) y mueve a `complete` si corresponde. -->

### 4. PRs de Sprint 2 sin review — resolución

<!-- Lista y decisión de cada uno: aprobar, pedir cambios, o documentar por qué se acepta sin
     cambios pese a no tener review formal en su momento. Lista base en el handoff comunicado
     directamente por Leonardo. -->

### 5. ADRs escritas este cierre

<!-- docs/adr/adr-sprint-2/ — la lista de candidatas ya identificadas está en su README. -->

### 6. Handoff para Sprint 3

<!-- Leonardo es Asiento C de Sprint 3 — este handoff es lo que él usa para no reconstruir
     contexto de cero. -->
