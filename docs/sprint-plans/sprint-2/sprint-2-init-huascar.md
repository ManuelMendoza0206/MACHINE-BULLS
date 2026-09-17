# Sprint 2 — Inicialización | Asiento B (Huascar Camilo Durán Avendaño)

**Rol:** Feature Support — Domain, Database & API Gateway
**Ventana:** 9 – 22 sep 2026 (hoy: 17-sep, **quedan 5 días**)
**Epics:** `backend/domain-and-database` (cierre — arrancó en Sprint 1 con Jaicel),
`backend/api-gateway` (base)
**Stack:** FastAPI · Python 3.11 · Pydantic v2 · SQLAlchemy 2.0 async · PostgreSQL (ADR-002)

> **Gobernanza (no negociable):** rama `feat/sprint2-<slug>` → PR → ≥1 revisor → merge a
> `main`. Cero commits directos. Declaración de uso de IA en cada PR.

---

## 🎯 Objetivo de Sprint

Cerrar el modelo de dominio y persistencia que Jaicel empezó en Sprint 1, y sentar la base del
API gateway que expone ese dominio al frontend.

**Punto de partida real:** el PR #14 (16-sep) trajo el esqueleto `backend/src/{domain,schemas,
api,services,db}` con `pyproject.toml`. Verifica qué de `domain-and-database/spec.md` ya está
ahí antes de asumir que partes de cero.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Verificar el esqueleto backend — 0.5 días

1. `cd backend && cat pyproject.toml` — confirma dependencias (FastAPI, Pydantic v2,
   SQLAlchemy 2.0 async, driver de Postgres).
2. Lee `openspec/specs/backend/domain-and-database/spec.md` completo — 5 Requirements:
   "Entidades reflejan el modelo canónico sin desviación", "Catálogo cápsula compartido sin
   duplicar prendas", "Sincronización de identidad sin intervención manual", "Búsqueda vectorial
   de compatibilidad eficiente", "Catálogo cápsula con cobertura mínima verificable en el seed".
3. Inventario: ¿cuáles de los 6 modelos SQLAlchemy (`User`, `Garment`, `GarmentOwnership`,
   `Outfit`, `OutfitGarment`, y el que falte) ya existen en `backend/src/domain/`?

**Aceptación:**
- [ ] Inventario en comentario del epic `[EPIC] backend/domain-and-database`

---

### Tarea 1: Cerrar el modelo de dominio — 2 días

**Spec:** `domain-and-database/spec.md` — Requirements 1, 2, 5.

1. Los 6 modelos SQLAlchemy coinciden campo a campo con lo descrito en `plan-base.md` §11 —
   nombres, tipos, enums, nullability. Sin desviación silenciosa.
2. `GarmentOwnership` soporta N usuarios por la misma prenda cápsula sin duplicar la fila de
   `Garment` (catálogo compartido, no copia por usuario).
3. Script de seed del catálogo cápsula: verifica cobertura mínima de combinaciones
   (posición × categoría × estética) antes de darse por completo — no basta con "insertar N
   filas", tiene que demostrarse la cobertura.
4. Migración Alembic: `upgrade` y su `downgrade` simétrico, verificado corriendo ambos en CI
   (no solo escrito — ejecutado).

**AC:**
- [ ] Los 6 modelos SQLAlchemy con tipos/nullability exactos de `plan-base.md` §11
- [ ] `GarmentOwnership` probado con ≥2 usuarios sobre la misma prenda cápsula
- [ ] Script de seed con verificación de cobertura, no solo de conteo
- [ ] Migración Alembic con test de `upgrade`+`downgrade` en CI
- [ ] `pytest backend/tests/ -v --cov=src` ≥ 90% en `src/domain/`
- [ ] PR revisado y mergeado

---

### Tarea 2: Sincronización de identidad (trigger auth.users↔User) — 1 día

**Spec:** `domain-and-database/spec.md` — Requirement "Sincronización de identidad sin
intervención manual"; ADR-003 (autenticación).

> **Nota de continuidad (regla §4.4 del plan de rotación):** este trigger es de importancia
> crítica (G5, gap histórico) — llévalo de punta a punta tú mismo dentro de este sprint, sin
> pasarlo a la siguiente rotación a medio hacer.

1. `on_auth_user_created` (trigger de Supabase → tabla `User`) implementado y verificado en
   los dos caminos: éxito (usuario creado en ambas tablas) y fallo transaccional (si la
   inserción en `User` falla, el registro en `auth.users` no queda huérfano sin reconciliación).
2. Test de integración contra una instancia de Supabase local/staging, no solo mockeado.

**AC:**
- [ ] Trigger probado en éxito y en fallo transaccional
- [ ] Documentado en `docs/adr/` si cambia algo del diseño de ADR-003
- [ ] PR revisado y mergeado

---

### Tarea 3: Base del API Gateway — 1.5 días

**Spec:** `openspec/specs/backend/api-gateway/spec.md` — Requirements "Todo error de dominio
se traduce a un código HTTP consistente", "Paginación por cursor en todos los endpoints de
listado".

1. Exception handler global cubre las 4 subclases de `StyleMeException` (dominio) con el
   código HTTP correcto cada una — mapeo consistente, no un 500 genérico para todo.
2. Los primeros endpoints del gateway (los que bloquean `/wardrobe` del frontend — ver gaps
   G1 en `api-contract-gaps/spec.md`) implementados con paginación por cursor, no offset/limit.
3. Coordina con Jaicel (Asiento A) para que los fixtures de test sean los mismos JSON de
   `frontend/tests/fixtures/api/`.

**AC:**
- [ ] Exception handler con las 4 ramas de `StyleMeException` → código HTTP correcto, testeado
- [ ] Al menos `GET /api/v1/garments` (listado paginado) implementado con cursor
- [ ] Fixtures compartidos con Jaicel confirmados (pair de 15 min)
- [ ] PR revisado y mergeado

---

## ⏱️ Cronograma (5 días restantes desde 17-sep)

| Día | Fecha | Tarea |
|---|---|---|
| 1 | mié 17 sep | Tarea 0 (inventario) |
| 2-3 | jue 18 – vie 19 sep | Tarea 1 (dominio) |
| 4 | sáb 20 sep | Tarea 2 (trigger identidad — crítico, no cortar a medias) |
| 5 | dom 21 – lun 22 sep | Tarea 3 (gateway base) + buffer |

Si el sprint aprieta: la Tarea 3 (gateway) puede dejar solo `GET /api/v1/garments` implementado
y el resto de endpoints pasa a Sprint 3 (Huascar sigue en Asiento A ese sprint con
`wardrobe-flow`, así que hay continuidad natural). **La Tarea 2 (trigger de identidad) no se
recorta** — regla §4.4.

---

## ✅ Definition of Done

- [ ] `pytest backend/tests/ -v --cov=src` ≥ 90% en los módulos tocados
- [ ] CI verde en cada PR (incluye el job de backend si ya existe, o documenta que falta)
- [ ] Los Requirements citados de `domain-and-database/spec.md` y `api-gateway/spec.md`
      cubiertos por test
- [ ] Type hints estrictos (Pydantic v2), sin `Any` sin justificar
- [ ] PRs mergeados a `main` con ≥1 aprobación y declaración de uso de IA

---

## 🤝 Pair Sessions

- **Tarea 1 (seed cápsula):** coordina con quien tenga el detalle de `wardrobe-flow` (Sprint 3
  lo lideras tú mismo, así que documenta bien el seed ahora para no rehacerlo).
- **Tarea 3 (fixtures):** Jaicel — 15 min.
- Deja handoff en `[EPIC] backend/domain-and-database` y `[EPIC] backend/api-gateway` antes del
  23-sep — Leonardo (Asiento C en Sprint 3) valida contra eso.
