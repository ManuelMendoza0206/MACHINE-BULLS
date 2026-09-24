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
| **Cronograma** | 🟢 | Tarea 6 (API skeleton) movida a Sprint 2 — es del epic F3 de Jaicel, no del Asiento A (`CLAUDE.md` §10 D4). Sprint 1 Leonardo = Tareas 0–5 ≈ 8 tarea-días en 7 días de 4h, con `BottomTabBar` como válvula de escape pactada. |
| **Contexto ClickUp** | 🟢 | Alcance del Asiento A es autocontenido en el repo (`sprint-1-init-leonardo.md` + specs + rotación). Reconciliación completa del tablero = `scripts/clickup/sync-sprint-1.mjs` (Asiento D), no bloqueante (`CLAUDE.md` §10 D5). |

## 3. Riesgos abiertos y su dueño

| Riesgo | Prob. | Impacto | Mitigación / dueño |
|---|---|---|---|
| Cronograma del Asiento A se desborda | Baja | Medio | Tarea 6 ya fuera; `BottomTabBar` es el recorte de reserva (mid-sprint, PO decide). |
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
- [x] Cronograma del Asiento A cerrado (Tareas 0–5; Tarea 6 → Sprint 2)
- [x] Alcance del Asiento A autocontenido en el repo (no depende de verificar ClickUp)
- [ ] PR `chore/sprint-1-prep` mergeado (← Tarea 0)
- [ ] Export de ClickUp confirmando el reparto de los 4 asientos (← Manuel/PO, no bloqueante)

## 6. Primer movimiento (post-merge)

`git checkout -b feat/tarea1-design-tokens` →
`src/lib/utils/cn.ts` + `getContrastRatio.ts` + los 3 tests (spec → rojo → verde) →
decidir el detalle fino de `border`/focus-ring en la misma PR → review de Jaicel → merge.

---

*Esta evaluación es la base para el kick-off. Se revisa en el mid-sprint (4 sep).*
