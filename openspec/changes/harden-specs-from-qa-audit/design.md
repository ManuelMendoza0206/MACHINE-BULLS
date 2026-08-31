## Context

Ver `proposal.md` — motivación. Este documento cubre cómo se materializan los deltas de especificación en los artefactos reales del repositorio (`openspec/specs/`, `docs/context/`, `.speckit/.../constitution.md`), dado que ningún código de `src/` existe todavía.

## Goals / Non-Goals

**Goals:**
- Que cada gap identificado en la auditoría tenga un dueño claro dentro de una capacidad de spec existente (o una nueva, `08-api-contract-gaps`) — nunca solo una nota suelta.
- Que los requisitos nuevos sean verificables por test (siguiendo el patrón WHEN/THEN ya usado por las 8 specs originales), no aspiracionales.
- Mantener consistencia de estilo con las specs narrativas existentes (§ numerados, criterios de aceptación, manifiesto de archivos) al momento de fusionar estos deltas en `openspec/specs/*.md`.

**Non-Goals:**
- No se resuelve aquí la decisión de producto/legal sobre el proveedor de inferencia VTON (licencia comercial vs. alcance académico) — solo se documenta el riesgo para que el equipo lo decida explícitamente. Esa decisión no es de arquitectura frontend.
- No se implementa código: `src/` no existe en este repositorio; este cambio es puramente de especificación.
- No se resuelve el contrato exacto de los 4 endpoints de `08-api-contract-gaps` (forma de payload, paginación) — eso requiere al equipo backend; aquí solo se consolida el pendiente con criterio de cierre.

## Decisions

**D1 — Nueva capacidad `08-api-contract-gaps` en vez de repetir el gap en cada spec.**
Alternativa considerada: dejar los gaps donde están (specs 02/03/04/06/07 §6), solo añadiendo una referencia cruzada. Se descarta porque el problema observado en la auditoría no es que los gaps no estén documentados — es que están *dispersos*, sin dueño único ni fecha de corte visible en un solo lugar para planificación de sprint. Consolidar no elimina las referencias locales (se mantienen, apuntando a la nueva capacidad); añade un punto único de verdad.

**D2 — Requisitos de accesibilidad como ADDED Requirements en cada spec de UI, no como una capacidad `09-accessibility` separada.**
Alternativa considerada: una capacidad transversal única de accesibilidad. Se descarta porque el patrón que ya funcionó en `spec 00` (contraste, foco) fue precisamente heredar el requisito directamente en el criterio de aceptación de cada componente — una capacidad separada repetiría el mismo error que causó que alt-text/reduced-motion se diluyeran: quedar en un documento que nadie revisita al implementar la feature concreta.

**D3 — Preferencia explícita por trigger de base de datos sobre endpoint HTTP para la reconciliación de identidad.**
Alternativa considerada: dejar ambas opciones abiertas sin preferencia (estado actual de spec 06 §6). Se descarta mantener la ambigüedad porque bloquea la Fase 1 sin necesidad — ambos sistemas ya comparten Postgres, y un trigger no requiere ningún cambio en `AuthForm` ni en el frontend en absoluto. Es una recomendación, no una decisión unilateral: el criterio de aceptación exige que ambas rutas sigan siendo *swappable* sin tocar el componente.

**D4 — Límite de concurrencia como requisito de spec, no como detalle de implementación.**
Alternativa considerada: dejarlo como nota de implementación para cuando se escriba `useUploadGarment`. Se descarta porque el caso de uso principal del onboarding (`frontend-plan.md` §3.1) es exactamente la carga masiva sin límite — es comportamiento observable (cola visible al usuario), no un detalle interno, por lo que pertenece al contrato de spec.

## Risks / Trade-offs

- **[Riesgo]** Los deltas de este cambio usan el formato `### Requirement` / `#### Scenario` del schema `spec-driven` de OpenSpec, mientras que las 8 specs originales (00-07) usan un formato narrativo distinto (§ numerados, tablas, sin bloques `### Requirement`) heredado de la migración inicial del repositorio `styleme-webapp`. → **Mitigación**: al fusionar (`openspec archive` o edición manual), estos requisitos se integran como nuevas subsecciones dentro del formato narrativo existente de cada spec (ej. nueva entrada en "Criterios de Aceptación" + su tabla de estados si aplica), preservando la consistencia visual del documento en vez de mezclar dos convenciones dentro del mismo archivo.
- **[Riesgo]** La recomendación D3 (trigger de base de datos) es una opinión técnica de este equipo frontend sobre una decisión que pertenece, en última instancia, al equipo backend. → **Mitigación**: se documenta como preferencia justificada y reversible (criterio de aceptación exige swappability), no como decisión cerrada — el gap sigue marcado como pendiente de confirmación en `06-landing-and-auth-flow` §6 original.
- **[Riesgo]** El riesgo de licenciamiento VTON afecta un documento (`plan-base.md`) que describe el sistema full-stack completo, fuera del alcance exclusivo de este repositorio frontend. → **Mitigación**: se añade únicamente como entrada de riesgo documentada (constitution.md §7 y plan-base.md §8), sin prescribir la solución — la resolución queda para el equipo completo, no solo frontend.

## Migration Plan

1. Aplicar los deltas de `specs/02, 03, 04, 06, 08` a sus archivos correspondientes en `openspec/specs/`, integrados en el formato narrativo existente.
2. Añadir la entrada de riesgo de licenciamiento VTON a `.speckit/.../constitution.md` §7 y a `docs/context/plan-base.md` §8.
3. Actualizar las referencias cruzadas de gap en specs 02 §6, 03 §6, 04 §6, 06 §6, 07 §6 para apuntar a `08-api-contract-gaps` como fuente única.
4. Commit en la rama `audit/qa-hardening-improvements`; no se hace push ni merge a `main` — la constitución del proyecto (§3) exige PR con al menos 1 revisor, por lo que este cambio se entrega como rama lista para PR, no como cambio directo a `main`.

No aplica rollback más allá de revertir el commit — son artefactos de documentación, sin efecto en runtime.
