# ADR 007 — Almacenamiento: Supabase Storage

Estado: aceptado
Fecha: 2026-08-26

## Contexto

El sistema guarda imagen original, imagen con fondo removido y resultado de prueba virtual. Estas imágenes se consultan desde el frontend y desde el pipeline de visión.

## Decision

Usamos Supabase Storage para todos los objetos. Las tablas Garment y VTONJob guardan la URL pública y el backend aplica normalización de tamaño antes de la inferencia.

## Alternativas

Guardar blobs dentro de la base relacional queda descartado por degradación de consultas y tamaño de respaldos. Guardar archivos en el disco local del servidor queda descartado porque rompe la reproducibilidad en contenedores y no funciona con múltiples instancias.

## Consecuencias

Un solo servicio cubre autenticación, base de datos y objetos. El equipo evita un proveedor adicional por ahora. Si en el cierre del taller se requiere CDN o transformaciones al vuelo, se evalúa esa evolución sin cambiar el contrato de URLs.

