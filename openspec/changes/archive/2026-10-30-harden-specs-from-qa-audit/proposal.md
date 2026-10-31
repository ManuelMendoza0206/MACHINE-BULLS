## Why

Una auditoría externa de QA/arquitectura sobre las specs 00-07 y los documentos base (`docs/context/plan-base.md`, `docs/context/frontend-plan.md`, `.speckit/.../constitution.md`) encontró que el frontend está especificado con rigor alto, pero identificó riesgos concretos que hoy no están registrados en ningún artefacto de gobierno del proyecto: (1) el pipeline VTON propuesto depende de modelos (IDM-VTON/OOTDiffusion) con licencia no comercial, sin mención en la matriz de riesgos; (2) cinco pantallas dependen de cuatro endpoints de backend que no existen en el contrato (`plan-base.md` §11), documentados de forma dispersa en cuatro specs distintas sin dueño ni fecha; (3) la mutación más costosa del sistema (`POST /vton/try-on`) no tiene la misma protección de doble-submit que ya exige la spec de auth; (4) la subida por lote (`useUploadGarment`) no declara techo de concurrencia pese a ser el caso de uso principal del onboarding; (5) dos requisitos de accesibilidad ya exigidos en `frontend-plan.md` §8 (alt-text real, `prefers-reduced-motion`) no se heredan como criterio de aceptación verificable en las specs de implementación; (6) el catálogo cápsula — el diferenciador de producto frente a la fricción de alta que hunde a la competencia (Whering, Acloset, Stylebook) — no tiene ningún criterio de calidad propio.

Este cambio cierra esas brechas en los artefactos de especificación, antes de que el equipo escriba la primera línea de código de dominio (`src/` no existe aún en este repositorio).

## What Changes

- Se agrega una nueva capacidad de especificación, `08-api-contract-gaps`, que consolida en un único documento con dueño y criterio de cierre los cuatro gaps de API hoy dispersos en specs 02 §6, 03 §6, 04 §6, 06 §6 y 07 §6.
- Se agrega un requisito de gestión de riesgo a `06-landing-and-auth-flow` (que ya posee la sección de gaps críticos de identidad) referenciando la reconciliación `auth.users` ↔ `User`, con la recomendación técnica explícita de la auditoría (trigger de base de datos sobre endpoint HTTP).
- Se agrega un requisito de límite de concurrencia a `02-wardrobe-flow` para la subida por lote de prendas.
- Se agrega un requisito de calidad de curación al catálogo cápsula en `02-wardrobe-flow`.
- Se agrega un requisito de protección contra doble-submit a `04-vton-flow`, espejando el ya existente en `06-landing-and-auth-flow`.
- Se agregan requisitos de accesibilidad verificables (alt-text real, `prefers-reduced-motion`) a `02-wardrobe-flow`, `03-outfits-flow` y `04-vton-flow`.
- Se documenta el riesgo legal de licenciamiento del pipeline VTON en `.speckit/.../constitution.md` §7 (Riesgos Conocidos a Vigilar) y en `docs/context/plan-base.md` §8 (Matriz de Riesgos), con tres rutas de resolución explícitas.
- **BREAKING**: ninguno — todos los cambios son adiciones a especificaciones sin código implementado aún; no hay comportamiento existente que romper.

## Capabilities

### New Capabilities
- `08-api-contract-gaps`: contrato consolidado de los endpoints de listado/sincronización pendientes de confirmación con el equipo backend (garments, outfits, VTON jobs, asociación de catálogo cápsula, sincronización de usuario), con dueño, fecha de corte por fase y criterio de cierre explícito por gap.

### Modified Capabilities
- `02-wardrobe-flow`: se agregan requisitos de límite de concurrencia en la subida por lote, criterios de curación del catálogo cápsula, y criterios de accesibilidad (alt-text, reduced motion) previamente solo mencionados en `frontend-plan.md`.
- `03-outfits-flow`: se agregan criterios de accesibilidad (alt-text, reduced motion) al grid de outfits.
- `04-vton-flow`: se agrega protección de doble-submit en la creación de `VTONJob`, y criterios de accesibilidad (alt-text, reduced motion) en las vistas de progreso/resultado.
- `06-landing-and-auth-flow`: se agrega la recomendación técnica explícita para el gap de reconciliación `auth.users` ↔ `User` (trigger de base de datos como opción preferida), cerrando la ambigüedad "ninguna alternativa implementada aún".

## Impact

- Artefactos afectados: `openspec/specs/frontend/wardrobe-flow/spec.md`, `03-outfits-flow.md`, `04-vton-flow.md`, `06-landing-and-auth-flow.md`, nuevo `08-api-contract-gaps.md`.
- Documentos de gobierno: `.speckit/.../constitution.md`, `docs/context/plan-base.md`.
- Sin impacto en código (no existe `src/` en este repositorio todavía) — el impacto es puramente sobre los contratos que gobernarán la implementación de las Fases 1-4 del cronograma.
- Ningún endpoint, dependencia o sistema externo se ve afectado directamente; el gap de licenciamiento VTON sí condiciona la elección futura de proveedor de inferencia (Fase 3).
