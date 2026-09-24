# Sprint 3 — Review (Asiento C / QA)

**Autor:** Leonardo Ibarra López — Asiento C de Sprint 3 (`team-rotation-plan.md` §7).
**Documento vivo** — se actualiza en cada revisión de PR durante el sprint (23 sep – 6 oct),
no de una sola vez al cierre. Última actualización: **24-sep-2026, día 2 de sprint.**

---

## 1. Qué valido este sprint

Por `sprint-3-manifest.md` §1: `api-client-and-schemas` (Jaicel, S2 — ✅ ya confirmado
`complete` con evidencia) y `domain-and-database` (Huascar/Jaicel, S2 — ❌ nunca se implementó,
ver §2 abajo). Además, como parte normal de QA de sprint, reviso los PRs que van entrando a
Sprint 3 a medida que se abren.

## 2. `domain-and-database` — cierre de la investigación

**No hay nada que validar porque no existe código.** Confirmado el 24-sep con
`git log --all -- backend/`: solo 2 commits tocaron `backend/` en toda la historia del repo —
la restructura a monorepo (`6455d6a`, solo `__init__.py`) y el script de MLflow del PR #31
(`c451a82`, no toca el dominio). Cero commits de Huascar en `backend/`, en ninguna rama.

**No es una tarea escondida ni sustituida en otro lugar — es deuda técnica real, asumida
formalmente por el equipo el 24-sep-2026.** Plan de cierre: Huascar la resuelve como parte de
su QA de Sprint 2 (intercambio de asiento con Manuel), con guía detallada comunicada
directamente por Leonardo, fuera del repo.

## 3. PRs de Sprint 3 revisados

| PR | Autor | Contenido | Revisión |
|---|---|---|---|
| #31 | Jaicel | MLflow + ngrok para tracking, cierre de notebooks 01/02 | Ver ADR-302. Sin review de GitHub todavía — pendiente. |
| #32 | Huascar | `wardrobe-flow` real: batch upload, resultado editable, catálogo cápsula, `PhotoConsentGate` placeholder | Ver ADR-301. Código sustancial y bien autodocumentado (el propio PR declara el placeholder de consentimiento). Sin review de GitHub todavía — pendiente. |

### Nota sobre `PhotoConsentGate` (PR #32)

Investigado a fondo — **no es un problema de coordinación**. El cuerpo del PR #32 declara
explícitamente que es un placeholder temporal, no el diseño de Jaicel (Q5), y que debe
reemplazarse cuando Q5 cierre. Documentado formalmente en ADR-301
(`docs/adr/adr-sprint-3/ADR-301-photo-consent-placeholder.md`) para que quede registro fuera
del cuerpo de un PR (que no es un lugar permanente de consulta).

## 4. ADRs escritas este sprint

- [ADR-301](../../adr/adr-sprint-3/ADR-301-photo-consent-placeholder.md) — consent gate placeholder
- [ADR-302](../../adr/adr-sprint-3/ADR-302-mlflow-tracking.md) — MLflow + ngrok

## 5. Estado de ClickUp al 24-sep

Epics de Sprint 3, todos en `to do` salvo `api-gateway` (`planning`) — consistente con que el
sprint recién empieza (día 2). Sin discrepancia código↔ClickUp que reportar todavía, distinto
a lo que se encontró en Sprint 1-2.

## 6. Pendiente de actualizar en próximas revisiones de este documento

- [ ] Review de PR #31 y #32 (aprobar / pedir cambios)
- [ ] Estado de Q5 (Jaicel) — sin PR propio todavía al 24-sep
- [ ] Estado de `garment-analysis-service` (Manuel) — sin PR todavía, incluye la Tarea 0.5 de
      persistencia mínima que su spec exige (ver `INTEGRATION-DIAGNOSIS-2026-09-18.md`)
- [ ] Handoff de fin de sprint para quien valide Sprint 3 en Sprint 4
