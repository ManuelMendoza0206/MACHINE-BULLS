# Sprint 3 — Manifiesto canónico (repo ↔ ClickUp)

**Estado:** planificación hacia adelante — Sprint 3 **no ha comenzado** al momento de escribir
este documento (17-sep-2026, Sprint 2 sigue en curso hasta el 22-sep). Este manifiesto fija la
estructura antes del kickoff para que no se repita el patrón de Sprint 1-2 (prompts corregidos
a medio sprint porque no se verificó el punto de partida real).

> **⚠️ Actualización 18-sep — leer antes de seguir cualquier prompt individual:**
> `INTEGRATION-DIAGNOSIS-2026-09-18.md` (en esta misma carpeta) confirma que el punto de
> partida real es peor de lo asumido abajo: `backend/domain-and-database` y `backend/
> api-gateway` **no tienen código**, solo `__init__.py` vacíos. Esto afecta directamente el
> alcance de Manuel (Tarea 0.5 nueva), Jaicel (Tarea 4 bloqueada/reordenada) y Leonardo (Tarea
> 2 pasa de "validar" a "escalar bloqueador"). Los 4 prompts individuales ya están corregidos
> con esto — este manifiesto queda como estaba en lo demás (§1 sigue correcto).

---

## 1. Ventana y asientos

| | |
|---|---|
| Sprint 2 (features) | 9 – 22 sep 2026 — en curso |
| Sprint 3 (features) | **23 sep – 6 oct 2026** |
| Review + Sprint 4 kickoff | 7 oct 2026 |

| Asiento | Persona | Epics Sprint 3 (`team-rotation-plan.md` §3) |
|---|---|---|
| A — Feature Lead | **Huascar** | `frontend/wardrobe-flow` |
| B — Feature Support | **Manuel** | `backend/garment-analysis-service` |
| C — QA & Validación | **Leonardo** | Valida Sprint 2: `frontend/api-client-and-schemas`, `backend/domain-and-database` |
| D — Infra/Release | **Jaicel** | `Q5` — diseño de consentimiento/retención de fotos (**crítico**, regla §4.4: sin relevo a mitad), pagination del gateway |

Prompts individuales: `sprint-3-init-huascar.md`, `sprint-3-init-manuel.md`,
`sprint-3-init-leonardo.md`, `sprint-3-init-jaicel.md`.

---

## 2. Punto de partida real al kickoff (verificar el 23-sep, no antes)

Estos prompts se escribieron el 17-sep, **6 días antes** de que arranque el sprint. Antes de
seguirlos al pie de la letra, cada quien debe re-verificar contra `main` en el momento real del
kickoff — Sprint 2 todavía tiene 5 días de trabajo pendiente que puede cambiar el punto de
partida:

- `frontend/wardrobe-flow` (epic de Huascar este sprint) ya tiene una base adelantada: PR #10
  (16-sep) trajo `detectBlur`, `onboardingStore`, `uploadQueue`. Huascar arranca este sprint
  **cerrando**, no desde cero — ver su prompt para el inventario exacto.
- `backend/garment-analysis-service` (epic de Manuel) **confirmado bloqueado** —
  `backend/api-gateway` (Huascar, Sprint 2) no tiene el endpoint base de garments, ni ningún
  otro. No es hipotético: es un bloqueo real, resuelto en su prompt con la Tarea 0.5 (mínimo de
  persistencia acotado a su propia feature).
- La validación de Leonardo (Asiento C) depende de que Jaicel y Huascar dejen handoff en sus
  epics de Sprint 2 antes del 22-sep (regla §4.1) — si no lo dejan, avisar en el Sprint Review
  del 23-sep, no reconstruir contexto solo.

## 3. Riesgo heredado de Sprint 1-2 — no repetir

La auditoría del 17-sep encontró que **ningún epic de Sprint 1 llegó a `complete` en ClickUp**
pese a estar mergeado y verificado en `main`. Regla para Sprint 3: **el epic no se da por
cerrado hasta que su estado en ClickUp diga `complete` con el link del PR como evidencia** — no
basta con que el código esté en `main`. Esto es responsabilidad de quien ocupa cada Asiento
A/B al terminar su propio trabajo, no solo de quien valida después.

---

## 4. Tarea crítica del sprint — Q5, consentimiento y retención de fotos (Jaicel)

`team-rotation-plan.md` §3 marca esto como **crítico** y §4.4 prohíbe relevarlo a mitad de
tarea. Motivo: `wardrobe-flow` (Huascar, este mismo sprint) y el futuro `vton-flow` dependen de
que exista una política clara de qué pasa con las fotos de prendas y de usuario — sin esto
diseñado, Huascar puede construir sobre un supuesto que luego haya que deshacer.

**Jaicel debe entregar el diseño de consentimiento/retención ANTES o EN PARALELO al arranque
real de `wardrobe-flow`**, no después — coordinación de kickoff obligatoria entre Jaicel y
Huascar en los primeros 2 días del sprint.

---

## 5. Checklist de reconciliación ClickUp (dueño: Jaicel / Asiento D este sprint)

- [ ] Confirmar en el kickoff (23-sep) que los 3 epics de Sprint 1 (design-system, app-shell,
      landing-and-auth-flow) están en `complete` en ClickUp — si Manuel no cerró esto en
      Sprint 2 (ver `sprint-2-manifest.md` §5), es bloqueante para que Leonardo pueda validar
      con una línea base limpia.
- [ ] Verificar que `frontend/api-client-and-schemas` y `backend/domain-and-database`
      (epics que Leonardo valida este sprint) tienen handoff de Jaicel y Huascar respectivamente.
- [ ] Crear/confirmar en ClickUp la tarea de Q5 (consentimiento/retención) con la etiqueta de
      crítico y sin fecha de relevo a mitad de sprint.
- [ ] Exportar el estado del tablero a `docs/clickup/` al cierre del sprint (7-oct) como
      evidencia, igual que se hizo (tarde) para Sprint 1.
