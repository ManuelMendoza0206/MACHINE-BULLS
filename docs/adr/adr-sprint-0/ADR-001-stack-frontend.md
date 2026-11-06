# ADR 001 — Stack frontend: Next.js

Estado: aceptado (revisado — ver nota de corrección)
Fecha: 2026-08-26 · **Corregido:** 2026-09-24

> **Nota de corrección (24-sep):** esta ADR decía "Next.js 16" desde el origen, pero eso no
> es lo que realmente pasó. La decisión de Sprint 0 fue **Next.js 14.2 + React 18.3**,
> registrada como "decisión cerrada" (`CLAUDE.md` §2, P0#5) específicamente por estabilidad
> frente a Next 15/React 19. El PR #15 (17-sep-2026, Sprint 2) revirtió esa decisión y subió a
> Next 16.3 + React 19.3 — sin que exista una ADR que documente esa reversión. Ver
> `docs/adr/adr-sprint-2/` — es exactamente el tipo de decisión que le corresponde documentar
> a quien cierre Sprint 2 como QA. Esta ADR queda corregida para reflejar la secuencia real,
> no reescrita como si Next 16 hubiera sido la elección original.

## Contexto

El proyecto resuelve "qué me pongo" para hombres jóvenes. Necesitamos una interfaz ágil que muestre prendas, outfits y prueba virtual, con un catálogo público y páginas autenticadas. El plan conceptual preliminar (Feature 001) contemplaba una aplicación móvil desarrollada en React Native respaldada por microservicios en AWS (Cognito, S3, API Gateway). El equipo es de cuatro personas y el taller dura 18 semanas exactas.

## Decision (original, Sprint 0 — Pivote a Next.js Web)

Pivoteamos la arquitectura de aplicación móvil a plataforma web moderna: usamos Next.js **14.2** con App Router, React **18.3** y TypeScript en modo estricto, Tailwind CSS y Supabase para autenticación y base de datos (descartando el stack móvil React Native/AWS). El frontend consume contratos HTTP definidos en plan-base.md sección 11 y valida cada respuesta con Zod. Next 14.2/React 18.3 se fijó explícitamente sobre las versiones más nuevas disponibles en ese momento (Next 15/React 19) por estabilidad — el equipo no quería depender de un release candidate durante las 18 semanas del taller.

## Alternativas

Vite más React como SPA pura queda descartada. Obliga a configurar routing, code splitting y optimización de imágenes de forma manual y deja todo el renderizado en el cliente. 

React Native sobre AWS (plan preliminar de Feature 001) queda formalmente descartado porque duplicaba el esfuerzo en iOS y Android, exigía compilar y probar en dos plataformas móviles nativas dentro del mismo plazo, y añadía una sobrecarga excesiva en configuración de IAM, Cognito y Lambda. Con el pivote a Next.js web obtenemos renderizado híbrido, rutas por archivos y optimización de imágenes sin trabajo adicional, y podemos exponer la misma web como PWA en el móvil sin mantener dos bases de código ni lidiar con tiendas de aplicaciones.

## Consecuencias

El frontend comparte el mismo proyecto de Supabase que el backend. Ganamos tiempo en configuración y mantenemos una sola superficie de despliegue al cierre del taller. El costo es quedar acoplados al ecosistema de Next.js para futuras migraciones.

