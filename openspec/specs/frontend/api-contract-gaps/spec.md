## Purpose
Consolida en un único documento, con dueño y criterio de cierre, los endpoints de backend que las specs de UI necesitan pero que el contrato de API todavía no define.

## Requirements

### Requirement: Ningún gap se resuelve inventando un contrato
El sistema SHALL desarrollarse contra mocks MSW documentados mientras un gap de este documento permanezca abierto, sin llamadas reales a endpoints hipotéticos.

#### Scenario: Gap abierto durante desarrollo
- **WHEN** una spec de UI depende de un gap listado como pendiente en este documento
- **THEN** su implementación usa mocks MSW explícitamente documentados como tales, nunca una llamada real al endpoint no confirmado

---

# Spec 08 — Contrato de API Pendiente (Gaps Consolidados)

**Estado:** Draft para seguimiento · **Depende de:** ninguna · **Referenciado por:** specs 02, 03, 04, 06, 07

Consolida en un único documento, con dueño y criterio de cierre, los endpoints de backend que las specs de UI necesitan pero que `docs/context/plan-base.md` §11 no define todavía. Nace de una auditoría externa de QA/arquitectura (agosto 2026) que encontró estos cinco gaps documentados de forma dispersa — cada uno en la sección "Gap Explícito" de su propia spec — sin un punto único de verdad para planificación de sprint. Este documento no reemplaza esas notas locales (se mantienen como referencia cruzada corta); es la fuente de verdad sobre el estado de cada gap.

**Regla no negociable, heredada de `CLAUDE.md` §8:** ningún gap de este documento se resuelve inventando un contrato. Toda spec de UI que dependa de un gap abierto se desarrolla contra mocks MSW documentados como tales. Ninguna llamada real a un endpoint hipotético se implementa en `src/features/*/api/` hasta que el gap se cierre aquí.

---

## 1. Tabla de gaps

| # | Gap | Bloquea | Fase de corte recomendada | Estado |
| :--- | :--- | :--- | :--- | :--- |
| G1 | Listado de prendas del usuario (`GET /api/v1/garments` / `/capsule`) | `/wardrobe` (spec 02) | Antes de Fase 2 | **Cerrado.** Implementado en `backend/src/api/garments.py` y consumido por frontend. |
| G2 | Recuperación de un outfit individual (`GET /api/v1/outfits/{id}`) | `/outfits/[outfitId]` en acceso directo por URL (spec 03) | Antes de Fase 2 | **Cerrado.** Implementado en `backend/src/api/outfits.py` y `frontend/src/features/outfits/api/getOutfit.ts`. |
| G3 | Listado de `VTONJob` por usuario (`GET /api/v1/vton/jobs`) | `/try-on/history` (spec 04) | Antes de Fase 3 | **Cerrado.** Implementado en `backend/src/api/vton.py` y vista `/try-on/history` en frontend (PR #48). |
| G4 | Mecanismo de adopción de prendas del catálogo cápsula al usuario (`POST /api/v1/garments/capsule/{id}/adopt`) | Confirmación de onboarding, paso 2 rama B (spec 02) | Antes de Fase 2 | **Cerrado.** Implementado en `backend/src/api/garments.py` vía `GarmentOwnership`. |
| G5 | Sincronización `auth.users` (Supabase) ↔ `User` (backend) | Todo flujo de registro end-to-end (spec 06) | Antes de Fase 1 (bloqueante temprano) | **Pendiente.** Trigger `AFTER INSERT` documentado en `backend-plan.md` §7, pendiente de migración en Supabase prod. |

---

## 2. Detalle por gap

### G1 — Listado de prendas del usuario
**Consumido por:** `specs/02-wardrobe-flow.md` §6.
**Estado de cierre:** El backend publica `GET /api/v1/garments/capsule` y upload de prendas en `backend/src/api/garments.py`. El frontend consume los schemas Zod correspondientes y conecta `/wardrobe` a datos reales.

### G2 — Recuperación de outfit individual
**Consumido por:** `specs/03-outfits-flow.md` §6.
**Estado de cierre:** El backend implementa `GET /api/v1/outfits/{outfit_id}` en `backend/src/api/outfits.py`. El frontend lo consume vía `frontend/src/features/outfits/api/getOutfit.ts` permitiendo carga directa por ID y fallback en TryOnView.

### G3 — Listado de VTONJobs por usuario
**Consumido por:** `specs/04-vton-flow.md` §6.
**Estado de cierre:** El backend publica `GET /api/v1/vton/jobs` con soporte para filtrado por `user_id`. El frontend implementa la vista `/try-on/history` (PR #48) conectando el historial real y permitiendo re-probar outfits con fotos previas.

### G4 — Asociación de catálogo cápsula al usuario
**Consumido por:** `specs/02-wardrobe-flow.md` §6.
**Estado de cierre:** El backend publica `POST /api/v1/garments/capsule/{garment_id}/adopt` en `backend/src/api/garments.py`, asociando prendas mediante la entidad `GarmentOwnership` de forma idempotente (409 en duplicados).

### G5 — Sincronización de identidad `auth.users` ↔ `User`
**Consumido por:** `specs/06-landing-and-auth-flow.md` §6. **Ruta preferida recomendada:** trigger de base de datos sobre `auth.users` (`AFTER INSERT`) que inserta la fila correspondiente en `User` con el mismo `id` — preferible a un endpoint HTTP de sincronización porque ambos sistemas ya comparten el mismo Postgres (`plan-base.md` §6.1).
**Estado:** Pendiente de ejecución de la migración de base de datos en el entorno de Supabase.

---

## 3. Proceso de cierre de un gap

1. El dueño de la spec de UI afectada escala el gap en la ceremonia de planificación de la fase correspondiente (columna "Fase de corte recomendada").
2. Al confirmarse el contrato con el equipo backend, se actualiza la fila de §1 (Estado → "Cerrado, ver spec.md §X") y se enlaza el commit/PR donde la spec de UI reemplaza su placeholder/mock por el contrato real.
3. Este documento nunca queda desactualizado silenciosamente: si una spec de UI conecta un endpoint real sin que su gap correspondiente se marque cerrado aquí, se considera una desviación de proceso a corregir en la siguiente revisión.
