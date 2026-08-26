## 1. Nueva capacidad de contrato de API

- [x] 1.1 Crear `openspec/specs/frontend/api-contract-gaps/spec.md` narrando los 5 gaps consolidados (garments, outfits, VTON jobs, catálogo cápsula, sync de identidad), con dueño/fase de corte y criterio de cierre por gap — verificar que el archivo existe y sigue el formato narrativo de las specs 00-07 (§ Propósito, tabla de gaps, criterios de aceptación)
- [x] 1.2 Referenciar `08-api-contract-gaps.md` desde `specs/02-wardrobe-flow.md` §6, `specs/03-outfits-flow.md` §6, `specs/04-vton-flow.md` §6 y `specs/06-landing-and-auth-flow.md` §6; `specs/07-profile-flow.md` §6 recibe nota aclaratoria de que sus gaps son distintos de G1-G5 — verificado con grep que las 5 specs contienen la referencia

## 2. Riesgo legal — pipeline VTON

- [x] 2.1 Añadir entrada de riesgo de licenciamiento (IDM-VTON/OOTDiffusion no comercial) a `.speckit/constitution.md` §7 y `openspec/.speckit/constitution.md` §7 (idénticos) "Riesgos Conocidos a Vigilar" — verificado que la sección lista el riesgo con sus 3 rutas de resolución
- [x] 2.2 Añadir la misma entrada a `docs/context/plan-base.md` §8 "Matriz de Riesgos y Mitigación", como fila nueva en el mismo formato tabular — verificado que la tabla mantiene su formato Markdown válido

## 3. Endurecimiento de `02-wardrobe-flow`

- [x] 3.1 Integrar el requisito de límite de concurrencia de subida por lote en §1 (SLA) y §2.3/§2.3.1 (`useUploadQueue`) de `specs/02-wardrobe-flow.md`, añadiendo el estado `queued` a la tabla de estados finitos de §3.3
- [x] 3.2 Añadir criterios de curación del catálogo cápsula como nueva subsección §2.4.1 (`CapsuleCatalogGrid`) — cobertura mínima por posición/estética y estándar visual consistente con `GarmentCard`
- [x] 3.3 Añadir alt-text, `prefers-reduced-motion`, concurrencia y curación como ítems nuevos en §5 "Criterios de Aceptación", cada uno con su caso de prueba correspondiente en §4; manifiesto de archivos (§7) actualizado con `uploadQueue.ts` y su test

## 4. Endurecimiento de `03-outfits-flow`

- [x] 4.1 Añadir alt-text y `prefers-reduced-motion` como ítems nuevos en §5 "Criterios de Aceptación" de `specs/03-outfits-flow.md`, con su caso de prueba correspondiente en §4

## 5. Endurecimiento de `04-vton-flow`

- [x] 5.1 Añadir el requisito de protección contra doble-submit al CTA "Generar prueba virtual" en §2.1/§2.5 y como ítem nuevo en §5 "Criterios de Aceptación" de `specs/04-vton-flow.md`, espejando el patrón ya usado en `specs/06-landing-and-auth-flow.md` §5
- [x] 5.2 Añadir alt-text (VtonResultView) y `prefers-reduced-motion` (VtonProgressView) como ítems nuevos en §5, con su caso de prueba correspondiente en §4

## 6. Endurecimiento de `06-landing-and-auth-flow`

- [x] 6.1 Actualizar §6 "Gap Explícito" de `specs/06-landing-and-auth-flow.md` para declarar el trigger de base de datos como ruta preferida (manteniendo el endpoint de sync como alternativa swappable), sin eliminar la naturaleza de "pendiente de confirmación con backend"; referenciado como G5 en spec 08 con fase de corte antes de Fase 1

## 7. Verificación cruzada

- [x] 7.1 Releídas las 5 specs modificadas y la nueva spec 08 de punta a punta — ningún criterio de aceptación nuevo queda sin su caso de prueba correspondiente en §4 de la misma spec
- [x] 7.2 `docs/context/frontend-plan.md` §6 actualizado para referenciar `openspec/specs/frontend/api-contract-gaps/spec.md` en vez de solo la prosa de gap original
