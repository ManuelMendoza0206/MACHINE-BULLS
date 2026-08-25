## Purpose

Consolida en un único contrato pendiente los endpoints de backend que las specs 02, 03, 04, 06 y 07 necesitan pero que `docs/context/base-plan.md` §11 no define todavía, para que dejen de resolverse de forma dispersa e implícita en cada spec de UI.

## ADDED Requirements

### Requirement: Listado de prendas del usuario
El sistema SHALL exponer un endpoint que devuelva las prendas asociadas a un usuario autenticado, consumible por `/wardrobe` (spec 02) sin depender de mocks MSW en producción.

#### Scenario: Backend confirma el contrato antes de Fase 2
- **WHEN** el equipo backend confirma la forma de `GET /api/v1/garments?user_id=` (o equivalente)
- **THEN** `specs/02-wardrobe-flow` reemplaza su tipo placeholder `GarmentSummary` por el schema Zod real y elimina la dependencia exclusiva de mocks MSW para `/wardrobe`

#### Scenario: Backend no confirma antes de Fase 2
- **WHEN** la Fase 2 del cronograma (`base-plan.md` §7.1) comienza sin este contrato confirmado
- **THEN** el equipo escala el bloqueo explícitamente en la ceremonia de planificación del sprint, en vez de dejar `/wardrobe` conectado silenciosamente a datos simulados en el entregable de fase

### Requirement: Listado de outfits recomendados por usuario
El sistema SHALL exponer una forma de recuperar un outfit individual o el último conjunto de recomendaciones de un usuario sin depender exclusivamente de la caché de cliente de TanStack Query, para que `/outfits/[outfitId]` funcione en acceso directo por URL.

#### Scenario: Acceso directo a un outfit sin caché de cliente
- **WHEN** un usuario abre `/outfits/[outfitId]` sin haber navegado antes desde el grid (cache MISS, `specs/03-outfits-flow` §3.2)
- **THEN** el sistema resuelve el detalle contra el backend en vez de mostrar permanentemente el estado "no encontrado en esta sesión"

### Requirement: Listado de trabajos VTON por usuario
El sistema SHALL exponer un endpoint de listado de `VTONJob` por usuario, consumido por `/try-on/history` (spec 04 §3.4).

#### Scenario: Historial disponible tras Fase 3
- **WHEN** el backend confirma `GET /api/v1/vton/jobs?user_id=` (o equivalente)
- **THEN** `/try-on/history` dejar de depender de mocks MSW y refleja trabajos reales, incluyendo la reutilización descrita en spec 04 §2.4 (reuso de resultados cacheados)

### Requirement: Asociación de prendas del catálogo cápsula al usuario
El sistema SHALL definir el mecanismo por el cual una prenda del catálogo público "Básicos StyleMe" queda asociada al armario de un usuario (endpoint dedicado o asignación directa de `user_id`).

#### Scenario: Usuario confirma selección de catálogo cápsula en onboarding
- **WHEN** el usuario selecciona N prendas del catálogo cápsula y confirma el paso 2 del onboarding (`specs/02-wardrobe-flow` §3.2)
- **THEN** el sistema persiste esa asociación en el backend real, no solo en el store de cliente `onboardingStore`

### Requirement: Sincronización de identidad entre Supabase Auth y la tabla `User`
El sistema SHALL garantizar que todo registro exitoso en Supabase Auth (`auth.users`) produce, sin intervención manual, una fila correspondiente en la tabla `User` propia del backend con el mismo `id`, antes de que el usuario pueda asociar datos vía `/garments/upload` u `/outfits/recommend`.

#### Scenario: Registro exitoso crea la fila de backend automáticamente
- **WHEN** `supabase.auth.signUp` completa con éxito (`specs/06-landing-and-auth-flow` §3.1)
- **THEN** existe una fila en `User` con el mismo `id` antes de que el flujo redirija a `/onboarding`, mediante un trigger de base de datos sobre `auth.users` (`AFTER INSERT`) — opción preferida por compartir el mismo Postgres y no depender de una llamada adicional desde el frontend

#### Scenario: Ningún gap de este documento se resuelve inventando un contrato
- **WHEN** cualquiera de los cuatro gaps anteriores no está confirmado por el equipo backend
- **THEN** la spec de UI correspondiente sigue desarrollándose contra mocks MSW documentados como tales, y ninguna llamada real a un endpoint hipotético se implementa en `src/features/*/api/`
