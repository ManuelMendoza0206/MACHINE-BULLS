# ADR 201 (ADR-0003 ClickUp) — Tabla GarmentOwnership para Catálogo Cápsula Compartido

Estado: aceptado  
Fecha: 2026-09-18 (Sprint 2)  
Autor: Equipo Machine Bulls  
Tarea ClickUp: `86e301dxw`  

---

## Contexto

El modelo inicial de datos asociaba cada prenda directamente a un único usuario (`garments.owner_id = user_id`). Sin embargo, para resolver el problema de arranque en frío (*cold start*), el sistema ofrece un **catálogo cápsula curado de 50 prendas básicas** de alta calidad que todo usuario nuevo puede adoptar durante el onboarding o en cualquier momento posterior.

Si la relación fuera 1:1 directa (`Garment` pertenece exclusivamente a un `User`), cada vez que un usuario nuevo adoptara la cápsula habría que duplicar 50 registros completos en la tabla `garments`, duplicando vectores de embeddings HNSW (pgvector), recalculando metadatos cromáticos y multiplicando el espacio de almacenamiento.

---

## Decisión

Desacoplar la prenda física/digital de la propiedad del usuario introduciendo la entidad asociativa **`GarmentOwnership`**:

```
┌──────────────┐         1:N          ┌───────────────────┐         N:1          ┌──────────────┐
│    User      │ ──────────────────── │ GarmentOwnership  │ ──────────────────── │   Garment    │
└──────────────┘                      └───────────────────┘                      └──────────────┘
                                      - user_id                                  - id
                                      - garment_id                               - processed_url
                                      - source ('capsule'|'upload')              - embedding (128d)
                                      - is_active                                - category / aesthetic
```

1. **Prendas Cápsula Compartidas**: Las 50 prendas curadas del catálogo se insertan una única vez en la tabla `garments`.
2. **Adopción Multi-inquilino**: Cuando un usuario adopta la cápsula (vía `POST /api/v1/garments/capsule/{id}/adopt`), se crea una fila en `garment_ownerships` vinculando `(user_id, garment_id, source='capsule')`.
3. **Idempotencia y Eficiencia**:
   - Se evita duplicar imágenes y vectores en Postgres.
   - La restricción de unicidad compuesta `(user_id, garment_id)` previene adopciones duplicadas (respondiendo 409 Conflict si ya fue adoptada).
4. **Prendas Propias**: Cuando un usuario sube su propia prenda, se crea la fila en `garments` y automáticamente su correspondiente `garment_ownerships` con `source='upload'`.

---

## Alternativas Descartadas

- **Duplicar filas de `Garment` por cada usuario que adopte la cápsula**: Descartada por ineficiencia extrema de almacenamiento y fragmentación innecesaria de índices vectoriales HNSW.
- **Flag `is_capsule` en `Garment` con consulta global en recommendations**: Descartada porque impedía que un usuario pudiera "desactivar" o eliminar una prenda cápsula de su propio armario sin afectar a los demás usuarios.

---

## Consecuencias

- **Positivas**:
  - Ahorro masivo de cómputo y almacenamiento (1 solo embedding vectorial por prenda cápsula).
  - Flexibilidad para que cada usuario active o desactive prendas de su armario de forma independiente.
  - El catálogo cápsula es inmutable y compartido.
- **Compromiso**:
  - Las consultas de inventario del usuario (`GET /api/v1/garments`) deben hacer un `JOIN` entre `garments` y `garment_ownerships` filtrando por `user_id` y `is_active = true`.
