# ADR 001 — Stack frontend: Next.js 16

Estado: aceptado
Fecha: 2026-08-26

## Contexto

El proyecto resuelve "qué me pongo" para hombres jóvenes. Necesitamos una web que muestre prendas, outfits y prueba virtual, con un catálogo público y páginas autenticadas. El equipo es de cuatro personas y el taller dura 18 semanas.

## Decision

Usamos Next.js 16 con App Router, React 19 y TypeScript en modo estricto, Tailwind CSS v4 y Supabase para autenticación y base de datos. El frontend consume contratos HTTP definidos en plan-base.md sección 11 y valida cada respuesta con Zod.

## Alternativas

Vite más React como SPA pura queda descartada. Obliga a configurar routing, code splitting y optimización de imágenes de forma manual y deja todo el renderizado en el cliente. React Native queda descartado porque duplica el esfuerzo en iOS y Android y exige compilar y probar en dos plataformas dentro del mismo plazo. Con Next.js obtenemos renderizado híbrido, rutas por archivos y optimización de imágenes sin trabajo adicional, y podemos exponer la misma web como PWA en el móvil sin mantener dos bases de código.

## Consecuencias

El frontend comparte el mismo proyecto de Supabase que el backend. Ganamos tiempo en configuración y mantenemos una sola superficie de despliegue al cierre del taller. El costo es quedar acoplados al ecosistema de Next.js para futuras migraciones.

