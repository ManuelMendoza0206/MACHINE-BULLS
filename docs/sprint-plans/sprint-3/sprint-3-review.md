# Sprint 3 — Review (Asiento C / QA)

**Autor:** Leonardo Ibarra López — Asiento C de Sprint 3 (`team-rotation-plan.md` §7).
**Documento vivo** — se actualiza en cada revisión de PR durante el sprint (23 sep – 6 oct),
no de una sola vez al cierre. Última actualización: **25-sep-2026, día 3 de sprint.**

**Nota de proceso (25-sep):** varios PRs que me correspondía revisar como QA (#24, #25, #32,
#33) fueron aprobados y mergeados por **Jaicel**, no por mí — se movió más rápido de lo que
pude revisar en persona. No bloqueante (Jaicel cumple "revisor ≠ autor"), pero significa que
mi rol de QA de este sprint, en la práctica, se centra en auditar retroactivamente lo ya
mergeado en vez de aprobar antes del merge. Ver §3 actualizado.

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
| #31 | Jaicel | MLflow + ngrok para tracking, cierre de notebooks 01/02 | Ver ADR-302. **Sigue abierto al 25-sep** — Jaicel no puede aprobar su propio PR, necesita otro revisor (yo, Huascar o Manuel). |
| #32 | Huascar | `wardrobe-flow` real: batch upload, resultado editable, catálogo cápsula, `PhotoConsentGate` placeholder | Ver ADR-301. Aprobado y mergeado por Jaicel (no por mí). Contenido revisado igual — código sustancial y bien autodocumentado. |
| #33 | Leonardo | Reestructura ADRs + limpieza sprint-0 | Aprobado y mergeado por Jaicel. |
| #34 | Huascar | `sprint-1-review.md` completo — ver §3.1 | Aprobado y mergeado por Jaicel. Auditado por mí abajo, con evidencia real re-corrida. |

### 3.1 Auditoría de la review de Sprint 1 de Huascar (PR #34)

Trabajo genuinamente riguroso — corrió los comandos, no repitió cifras de memoria. Dos
hallazgos reales que yo no había capturado:

1. **`src/proxy.ts` (redirect de rutas protegidas) sin ningún test** — confirmado por
   `grep -rl "proxy\|redirectTo\|NextRequest" tests/` sin resultados. Requirement de mayor
   riesgo del epic de mayor riesgo, sin red de seguridad automatizada.
2. **Política de contraseña más débil que el checklist de seguridad del sprint** —
   `schemas/auth.ts` exige `min(8)`, el checklist pedía 12+mayúscula+número+especial.

Huascar recomendó `landing-and-auth-flow` → `update required` (no `complete`) con estos 2
seguimientos — decisión correcta, no infló el resultado. También señaló honestamente que no
pudo reproducir la cifra "88 tests / 97.9%" que yo cité en el punto de partida — no la
descartó ni la validó a ciegas, la dejó marcada como sin confirmar. Estándar de QA a seguir
en el resto de las reviews del proyecto.

**Pendiente de mi parte:** confirmar en ClickUp que `landing-and-auth-flow` refleja
`update required` (no `to do` genérico) con las 2 tareas de seguimiento de Huascar anotadas.

### Nota sobre `PhotoConsentGate` (PR #32)

Investigado a fondo — **no es un problema de coordinación**. El cuerpo del PR #32 declara
explícitamente que es un placeholder temporal, no el diseño de Jaicel (Q5), y que debe
reemplazarse cuando Q5 cierre. Documentado formalmente en ADR-301
(`docs/adr/adr-sprint-3/ADR-301-photo-consent-placeholder.md`) para que quede registro fuera
del cuerpo de un PR (que no es un lugar permanente de consulta).

## 4. ADRs escritas este sprint

- [ADR-301](../../adr/adr-sprint-3/ADR-301-photo-consent-placeholder.md) — consent gate placeholder
- [ADR-302](../../adr/adr-sprint-3/ADR-302-mlflow-tracking.md) — MLflow + ngrok

## 5. Estado de ClickUp al 25-sep

| Epic | Estado | Nota |
|---|---|---|
| `frontend/design-system` (S1) | ✅ `complete` | Cerrado por Huascar con evidencia real (PR #34) |
| `frontend/app-shell-and-navigation` (S1) | ✅ `complete` | Ídem |
| `frontend/landing-and-auth-flow` (S1) | 🟡 `update required` | Correcto — 2 seguimientos de seguridad pendientes (§3.1) |
| `frontend/wardrobe-flow` (S3, Huascar) | `to do` | PR #32 ya mergeado — **desactualizado, debería reflejar avance real** |
| `backend/garment-analysis-service` (S3, Manuel) | `to do` | Sin PR todavía, correcto |
| `backend/domain-and-database` (S2, deuda) | `planning` | Sin resolver — Huascar aún no decidió si la toma o la re-planifica (handoff §3) |
| `backend/api-gateway` (S2, deuda) | `planning` | Ídem |
| `Q5 — Seguridad & Compliance` (S3, Jaicel) | `to do` | Sin PR propio — el #31 es otra cosa (MLflow) |

## 6. Pendiente de actualizar en próximas revisiones de este documento

- [ ] Revisar y aprobar/pedir cambios en PR #31 (Jaicel no puede autoaprobarlo)
- [ ] `wardrobe-flow` en ClickUp sigue en `to do` pese al PR #32 mergeado — avisar a Huascar
- [ ] Estado de Q5 (Jaicel) — sin PR propio todavía al 25-sep, y es la tarea crítica del sprint
      (`sprint-3-manifest.md` §4: "sin relevo a mitad, debe coordinar con Huascar en los
      primeros 2 días" — ya pasaron 3)
- [ ] Estado de `garment-analysis-service` (Manuel) — sin PR todavía, incluye la Tarea 0.5 de
      persistencia mínima que su spec exige (ver `INTEGRATION-DIAGNOSIS-2026-09-18.md`)
- [ ] Confirmar que Huascar decidió qué hacer con `domain-and-database`/`api-gateway`
- [ ] Handoff de fin de sprint para quien valide Sprint 3 en Sprint 4
