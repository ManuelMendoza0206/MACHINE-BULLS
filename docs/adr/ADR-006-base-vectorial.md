# ADR 006 — Base vectorial: PostgreSQL con pgvector e índice HNSW

Estado: aceptado
Fecha: 2026-08-26

## Contexto

Cada prenda se representa con un vector de compatibilidad de dimensión 128 entrenado con triplet loss. Las consultas buscan vecinos cercanos por similitud coseno dentro del armario del usuario.

## Decision

Usamos PostgreSQL con la extensión pgvector en el mismo proyecto de Supabase. Los vectores se indexan con HNSW bajo operación de coseno.

## Alternativas

Un servicio vectorial externo como Pinecone o Milvus queda descartado porque obliga a mantener dos bases sincronizadas y añade costo y configuración fuera del alcance del taller. La búsqueda exacta sin índice queda descartada por costo lineal sobre catálogos que crecen por inserción constante.

## Consecuencias

Metadatos y vectores viven en una sola base de datos. HNSW ofrece búsqueda sublineal sin reconstrucción completa del índice ante nuevas prendas, a diferencia de IVFFlat. El documento oficial no exige un índice concreto, esta elección es técnica y se justifica por crecimiento incremental.

