# Spec 08 — Contrato de API Pendiente (Gaps Consolidados)

**Estado:** Draft para seguimiento · **Depende de:** ninguna · **Referenciado por:** specs 02, 03, 04, 06, 07

Consolida en un único documento, con dueño y criterio de cierre, los endpoints de backend que las specs de UI necesitan pero que `docs/context/base-plan.md` §11 no define todavía. Nace de una auditoría externa de QA/arquitectura (agosto 2026) que encontró estos cinco gaps documentados de forma dispersa — cada uno en la sección "Gap Explícito" de su propia spec — sin un punto único de verdad para planificación de sprint. Este documento no reemplaza esas notas locales (se mantienen como referencia cruzada corta); es la fuente de verdad sobre el estado de cada gap.

**Regla no negociable, heredada de `CLAUDE.md` §8:** ningún gap de este documento se resuelve inventando un contrato. Toda spec de UI que dependa de un gap abierto se desarrolla contra mocks MSW documentados como tales. Ninguna llamada real a un endpoint hipotético se implementa en `src/features/*/api/` hasta que el gap se cierre aquí.

---

## 1. Tabla de gaps

| # | Gap | Bloquea | Fase de corte recomendada | Estado |
| :--- | :--- | :--- | :--- | :--- |
| G1 | Listado de prendas del usuario (`GET /api/v1/garments?user_id=` o equivalente) | `/wardrobe` (spec 02) | Antes de Fase 2 | Pendiente de confirmación con backend |
| G2 | Recuperación de un outfit individual o del último set de recomendaciones (no solo `POST /outfits/recommend`) | `/outfits/[outfitId]` en acceso directo por URL (spec 03) | Antes de Fase 2 | Pendiente de confirmación con backend |
| G3 | Listado de `VTONJob` por usuario (`GET /api/v1/vton/jobs?user_id=` o equivalente) | `/try-on/history` (spec 04) | Antes de Fase 3 | Pendiente de confirmación con backend |
| G4 | Mecanismo de asociación de prendas del catálogo cápsula al usuario | Confirmación de onboarding, paso 2 rama B (spec 02) | Antes de Fase 2 | Pendiente de confirmación con backend |
| G5 | Sincronización `auth.users` (Supabase) ↔ `User` (backend) | Todo flujo de registro end-to-end (spec 06) | Antes de Fase 1 (bloqueante temprano) | Pendiente — ruta preferida ya recomendada, ver §3 |

---

## 2. Detalle por gap

### G1 — Listado de prendas del usuario
**Consumido por:** `specs/02-wardrobe-flow.md` §6. **Placeholder actual:** tipo `GarmentSummary` mínimo (`{ id, processed_image_url, category, dominant_aesthetic }`), servido por mocks MSW.
**Criterio de cierre:** el backend publica la forma exacta del endpoint (paginación, filtros por categoría/estética si aplica); el frontend reemplaza `GarmentSummary` por un schema Zod derivado 1:1 y conecta `/wardrobe` a datos reales.

### G2 — Recuperación de outfit individual
**Consumido por:** `specs/03-outfits-flow.md` §6. **Estado interino:** `/outfits/[outfitId]` depende de la caché de cliente de TanStack Query (navegación desde el grid); acceso directo por URL sin caché muestra "no encontrado en esta sesión".
**Criterio de cierre:** confirmación de si existirá `GET /api/v1/outfits/{outfit_id}` o si el frontend debe siempre re-derivar del último `recommend` — esto determina si el fallback actual es permanente o temporal.

### G3 — Listado de VTONJobs por usuario
**Consumido por:** `specs/04-vton-flow.md` §6. **Estado interino:** `/try-on/history` desarrollado contra mocks MSW.
**Criterio de cierre:** el backend publica el endpoint; el frontend conecta el historial real y evalúa si puede alimentar también la caché de reuso en cliente (`vtonResultCache`, spec 04 §2.4) al montar, no solo mostrar resultados pasados.

### G4 — Asociación de catálogo cápsula al usuario
**Consumido por:** `specs/02-wardrobe-flow.md` §6. **Pregunta abierta:** ¿es un `POST` de asociación separado, o el `user_id` se asigna directamente al seleccionar?
**Criterio de cierre:** confirmación del mecanismo exacto con backend antes de implementar la confirmación del paso 2 de onboarding contra datos reales.

### G5 — Sincronización de identidad `auth.users` ↔ `User`
**Consumido por:** `specs/06-landing-and-auth-flow.md` §6. **Ruta preferida recomendada:** trigger de base de datos sobre `auth.users` (`AFTER INSERT`) que inserta la fila correspondiente en `User` con el mismo `id` — preferible a un endpoint HTTP de sincronización porque ambos sistemas ya comparten el mismo Postgres (`base-plan.md` §6.1), lo que elimina una clase entera de fallos de sincronización (reintentos, orden de operaciones, fallos parciales) que un endpoint adicional no elimina.
**Criterio de cierre:** el equipo backend confirma la implementación del trigger (o, si opta por el endpoint alternativo, lo publica) — `signUpWithEmail` (spec 06 §2.4) ya está diseñado para que ambas rutas sean swappable sin tocar `AuthForm`.

---

## 3. Proceso de cierre de un gap

1. El dueño de la spec de UI afectada escala el gap en la ceremonia de planificación de la fase correspondiente (columna "Fase de corte recomendada").
2. Al confirmarse el contrato con el equipo backend, se actualiza la fila de §1 (Estado → "Cerrado, ver spec.md §X") y se enlaza el commit/PR donde la spec de UI reemplaza su placeholder/mock por el contrato real.
3. Este documento nunca queda desactualizado silenciosamente: si una spec de UI conecta un endpoint real sin que su gap correspondiente se marque cerrado aquí, se considera una desviación de proceso a corregir en la siguiente revisión.
