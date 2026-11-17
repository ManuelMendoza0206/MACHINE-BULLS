# ADRs — Sprint 2 (9 – 22 sep 2026)

Decisiones de arquitectura de persistencia, multi-tenancy y almacenamiento tomadas durante la consolidación del Sprint 2 y regularizadas formalmente en el ciclo de gobernanza.

| ADR | Decisión | Tarea ClickUp | Estado |
|---|---|---|---|
| [201](./ADR-201-garment-ownership-capsule.md) | Tabla GarmentOwnership para catálogo cápsula compartido entre usuarios | `86e301dxw` | Vigente |
| [202](./ADR-202-almacenamiento-azure-cloudinary.md) | Estrategia de almacenamiento de objetos: Azure Blob Storage y Cloudinary | `86e301dyn` | Vigente |

---

## Decisiones Documentadas

1. **Tabla GarmentOwnership (`ADR-201`)**:
   - Resuelve el cold start del catálogo cápsula sin duplicar 50 filas de prendas ni índices vectoriales HNSW por cada nuevo usuario.
   - Provee relación N:M limpia entre usuarios y prendas mediante `(user_id, garment_id, source)`.

2. **Estrategia de Almacenamiento de Objetos (`ADR-202`)**:
   - Define el patrón `StorageProvider` desacoplado.
   - Estandariza Azure Blob Storage como backend primario en producción con contenedor único `styleme`.
   - Mantiene compatibilidad con Cloudinary y almacenamiento local para desarrollo offline.
