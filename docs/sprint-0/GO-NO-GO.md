# Sprint 1 — Evaluación de arranque (GO / NO-GO)

**Autor:** Leonardo Ibarra López (Product Owner / Asiento A)
**Fecha:** 31 ago 2026
**Decisión:** 🟢 **GO** — condicionada al merge del PR `chore/sprint-1-prep`.

---

## 1. Qué se evaluó

El planteamiento (`plan-base.md`, `frontend-plan.md`), las specs, el scaffold, y los cuatro
prompts de inicialización — con **ejecución real** del toolchain, no revisión de papel.

## 2. Estado por dimensión

| Dimensión | Estado | Nota |
|---|---|---|
| **Toolchain** | 🟢 | `npm ci · typecheck · lint · test · test:e2e · build` → todos exit 0, verificados desde árbol limpio. Ver `SCAFFOLD-VERIFICATION.md`. |
| **Contratos de spec** | 🟢 | `design-system` y `app-shell` en formato OpenSpec nativo. `api-client` define la jerarquía de errores y el contrato de env. Gaps de API (G1–G5) documentados con dueño y fase de corte. |
| **Design system** | 🟢 | Tokens WCAG-AA (6 pares de texto ≥ 4.5:1, ambos temas). `tailwind.config` deriva de `design-tokens.ts`. Falta el test guardián (Tarea 1). |
| **Gobernanza** | 🟢 | `main` protegida, PR + CODEOWNERS + template con declaración de IA. El prep se entregó por PR, no commit directo. |
| **Alcance** | 🟢 | Frontend-only confirmado; ML/Data fuera de este repo. Storybook fuera de Sprint 1. 5 componentes, no 9. |
| **Cronograma** | 🟡 | ~7 tareas-día de trabajo en ~6 días de 4 h para el Asiento A. Ajustado, sin holgura. Mitigación: Tarea 6 y `BottomTabBar` son la válvula de escape del mid-sprint. |
| **Contexto ClickUp** | 🟡 | Fuente única del reparto/conteo de tareas, pero no verificada en esta sesión (token compartido fue revocado; export pendiente). No bloquea el arranque del Asiento A. |

## 3. Riesgos abiertos y su dueño

| Riesgo | Prob. | Impacto | Mitigación / dueño |
|---|---|---|---|
| Cronograma del Asiento A se desborda | Media | Medio | Recorte pactado en el mid-sprint (Tarea 6 / BottomTabBar → Sprint 2). PO decide. |
| `CODECOV_TOKEN` sin configurar → coverage no sube | Alta | Bajo | Manuel, Sprint 1 semana 1. `fail_ci_if_error: false` ya evita que rompa CI. |
| Divergencia tokens (Leonardo) ↔ consumo en specs 02–04 | Baja | Medio | El test de sync `globals.css` ↔ `design-tokens.ts` (Tarea 1) + revisión cruzada. |
| CSP baseline con `'unsafe-inline'` en scripts | Baja | Medio | Follow-up de endurecimiento a nonce+strict-dynamic en rutas dinámicas (Manuel). Documentado, no urgente para MVP académico. |
| `app.users` ↔ `User` (G5) sin implementar | Media | Alto | Backend/Jaicel + trigger de DB. Fuera del Asiento A; el frontend lo aísla tras interfaz swappable. |

## 4. Condición de GO

**El PR `chore/sprint-1-prep` debe estar mergeado a `main` con CI verde antes de la Tarea 1.**
Eso es la Tarea 0 (verificación, 0.5 días). Hasta entonces: NO-GO para features.

## 5. Definición de "listo para desarrollo" (checklist de arranque del Asiento A)

- [x] Repo compila y las 6 puertas pasan desde árbol limpio
- [x] `sprint-1-init-leonardo.md` sin ambigüedades (rutas, variantes, fechas, refs de spec)
- [x] Specs de las Tareas 1–6 en formato verificable (Requirement + Scenario + AC)
- [x] Tokens de diseño AA; decisión de paleta registrada (`CLAUDE.md` §10 D1)
- [x] Gobernanza operativa (branch protection, PR template, CODEOWNERS)
- [ ] PR `chore/sprint-1-prep` mergeado (← Tarea 0)
- [ ] Export de ClickUp confirmando el reparto (← Manuel/PO, no bloqueante)

## 6. Primer movimiento (post-merge)

`git checkout -b feat/tarea1-design-tokens` →
`src/lib/utils/cn.ts` + `getContrastRatio.ts` + los 3 tests (spec → rojo → verde) →
decidir el detalle fino de `border`/focus-ring en la misma PR → review de Jaicel → merge.

---

*Esta evaluación es la base para el kick-off. Se revisa en el mid-sprint (4 sep).*
