# Sprint 2 — Inicialización | Asiento A (Jaicel Velasco)

**Rol:** Feature Lead — API Client & Schemas
**Ventana:** 9 – 22 sep 2026 (hoy: 17-sep, **quedan 5 días**)
**Epic:** `frontend/api-client-and-schemas`
**Stack:** Next.js 16 · React 19 · TypeScript strict · Zod · TanStack Query

> **Gobernanza (no negociable):** rama `feat/sprint2-<slug>` → PR → ≥1 revisor → merge a
> `main`. Cero commits directos. Declaración de uso de IA en cada PR (ya lo vienes haciendo
> bien — mantenlo).

---

## 🎯 Objetivo de Sprint

Cerrar el contrato de comunicación frontend↔backend: cliente HTTP tipado, schemas Zod que
espejan los modelos Pydantic, y una jerarquía de errores tipada que ningún hook devuelve sin
pasar por ella.

**Punto de partida real (no desde cero):** el PR #14 (16-sep) ya trajo `frontend/src/lib/api/client.ts`,
`frontend/src/schemas/api/{garments,outfits,vton}.ts`, y `frontend/src/lib/errors.ts` existe desde
el scaffold de Sprint 0. Verifica el estado actual antes de reimplementar nada.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Verificar lo que ya existe — 0.5 días

1. `git checkout main && git pull` — confirma que `frontend/src/lib/api/client.ts` y
   `frontend/src/schemas/api/*.ts` están ahí (PR #14).
2. `cd frontend && npm ci && npm run typecheck && npm run lint && npm run test && npm run build`
   — todos exit 0 antes de tocar nada.
3. Lee `openspec/specs/frontend/api-client-and-schemas/spec.md` completo — 2 Requirements:
   "Validación obligatoria de toda respuesta de red" y "Errores tipados por clase, nunca
   genéricos". Compara contra `client.ts`/`errors.ts` actuales: ¿qué falta?

**Aceptación:**
- [ ] Inventario escrito (comentario en el epic de ClickUp) de qué de la spec ya está cubierto
      por el código de #14 y qué falta.

---

### Tarea 1: Cerrar "Validación obligatoria de toda respuesta de red" — 1.5 días

**Spec:** `api-client-and-schemas/spec.md` — Requirement "Validación obligatoria de toda
respuesta de red".

1. Cada función en `src/features/*/api/*.ts` (`uploadGarment`, `recommendOutfits`,
   `createVtonJob`, `getVtonJobStatus`) debe parsear la respuesta con su schema Zod
   correspondiente antes de devolverla — cero `as` sobre el JSON crudo de `fetch`.
2. Un `safeParse` fallido se traduce en `ValidationError` (con el `ZodIssue[]` original), nunca
   en un retorno silencioso ni en un `any` implícito.
3. Test por cada función: respuesta válida → objeto tipado; respuesta con campo faltante/tipo
   incorrecto → `ValidationError` lanzado, nunca un crash no controlado.

**AC:**
- [ ] Las 4 funciones de fetch (garments, outfits, vton×2) parsean con Zod antes de retornar
- [ ] `tests/unit/lib/api/*.test.ts` cubre el caso válido y el caso de parseo fallido de cada una
- [ ] PR revisado y mergeado

---

### Tarea 2: Cerrar "Errores tipados por clase, nunca genéricos" — 1.5 días

**Spec:** `api-client-and-schemas/spec.md` — Requirement "Errores tipados por clase, nunca
genéricos"; `CLAUDE.md` §5 (jerarquía `StyleMeError` → `ApiError`/`ValidationError`/
`NetworkError`/`VtonJobTimeoutError`).

1. Verifica que `src/lib/errors.ts` (ya existe) cubre las 4 subclases con `code: string` y
   `cause?: unknown`.
2. `client.ts`: toda respuesta no-`2xx` se relanza como `ApiError` (status + código del payload
   + detalle), nunca como `Error` genérico ni `throw response`.
3. Todo hook de TanStack Query (`useUploadGarment`, `useRecommendOutfits`, etc., los que ya
   existan o los que falten de `wardrobe-flow`/`outfits-flow`) captura en su `queryFn`/
   `mutationFn` y relanza como subclase de `StyleMeError` — prohibido `catch (e) { console.log(e) }`.
4. Test: fetch con status 404/500 → `ApiError` con el código correcto; fetch sin respuesta
   (network down, mockeado) → `NetworkError`.

**AC:**
- [ ] Cero `throw` de `Error` genérico o de la respuesta cruda en todo `src/lib/api/` y
      `src/features/*/api/`
- [ ] Tests de las 4 subclases de error en verde
- [ ] PR revisado y mergeado

---

### Tarea 3: Contract tests frontend↔backend — 1 día

**Spec:** ligada al gap G1-G5 de `openspec/specs/frontend/api-contract-gaps/spec.md` (epic de
Huascar en Architecture, pero los fixtures son tuyos).

1. Los fixtures de test del gateway (`backend/`) deben ser los **mismos JSON** que
   `frontend/tests/fixtures/api/*.json` — una sola fuente de verdad de forma de datos, no dos
   copias que puedan divergir.
2. Coordina con Huascar (Asiento B, cierra `backend/api-gateway` este sprint) para que su
   suite de contract tests importe estos fixtures en vez de inventar los suyos.

**AC:**
- [ ] `backend/tests/` referencia los fixtures de `frontend/tests/fixtures/api/`, no duplicados
- [ ] Confirmado con Huascar antes de cerrar la tarea (pair de 15 min)

---

## ⏱️ Cronograma (5 días restantes desde 17-sep)

| Día | Fecha | Tarea |
|---|---|---|
| 1 | mié 17 sep | Tarea 0 (inventario) + arranque Tarea 1 |
| 2-3 | jue 18 – vie 19 sep | Tarea 1 (validación de red) |
| 4 | sáb 20 sep | Tarea 2 (errores tipados) |
| 5 | dom 21 – lun 22 sep | Tarea 2 (cierre) + Tarea 3 (contract tests) + buffer review |

Si no alcanza: la Tarea 3 (contract tests) es la que se corre a Sprint 3 sin bloquear el cierre
del epic — coordínalo con Manuel (Asiento C, valida esto en Sprint 3).

---

## ✅ Definition of Done

- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build`
      (dentro de `frontend/`) — todos exit 0
- [ ] CI verde en cada PR
- [ ] Los 2 Requirements de `api-client-and-schemas/spec.md` cubiertos por test
- [ ] Cero `any`; cero `as` sobre respuestas de red sin pasar por Zod primero
- [ ] PRs mergeados a `main` con ≥1 aprobación y declaración de uso de IA

---

## 🤝 Pair Sessions

- **Tarea 3:** Huascar (fixtures compartidos con `backend/api-gateway`) — 15 min.
- Deja un comentario de handoff en `[EPIC] frontend/api-client-and-schemas` antes del Sprint
  Review (23-sep) — regla §4.1 de `team-rotation-plan.md`: qué quedó completo, qué en
  `update required`, decisiones no documentadas. Manuel (Asiento A de Sprint 3 para backend...
  no, Manuel es B en Sprint 3) — en realidad quien valida tu epic en Sprint 3 es **Leonardo**
  (Asiento C), déjaselo a él explícitamente.
