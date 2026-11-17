# ADR 202 (ADR-0004 ClickUp) — Estrategia de Almacenamiento de Objetos: Azure Blob Storage y Cloudinary

Estado: aceptado  
Fecha: 2026-09-20 · **Actualizado:** 2026-11-05 (PR #59 consolidación Azure Blob Storage)  
Autor: Equipo Machine Bulls  
Tarea ClickUp: `86e301dyn`  

---

## Contexto

El sistema StyleMe requiere almacenar y servir tres tipos de activos visuales:
1. Fotografías originales subidas por usuarios (prendas y fotos de cuerpo entero).
2. Imágenes de prendas procesadas con fondo transparente (`rembg / u2net_cloth_seg`).
3. Renders generados por el pipeline de prueba virtual VTON (CatVTON / Replicate).

En el diseño inicial (Sprint 0, ADR-007), se contempló Supabase Storage. Posteriormente, en la planificación del backlog se evaluó Cloudinary debido a sus capacidades nativas de optimización y transformación al vuelo (*on-the-fly*). Con la consolidación de la infraestructura en el entorno productivo universitario y de nube, se determinó el proveedor y la arquitectura de almacenamiento definitiva.

---

## Decisión

Adoptar una arquitectura de **Almacenamiento Desacoplado mediante el patrón Provider (`StorageProvider`)**, estandarizando como backend principal **Azure Blob Storage** (con un solo contenedor privado `styleme`), manteniendo compatibilidad y fallback con Cloudinary y almacenamiento local para entornos offline de desarrollo:

1. **Patrón Provider Swappable**:
   - La interfaz abstracta `StorageProvider` define las operaciones `upload_file`, `get_url` y `delete_file`.
   - Ningún servicio de dominio ni endpoint interactúa directamente con el SDK de Azure ni de Cloudinary; consumen exclusivamente la interfaz inyectada.
2. **Azure Blob Storage como Almacenamiento Primario**:
   - Contenedor unificado: `styleme`.
   - Jerarquía interna organizada por prefijos:
     - `garments/{user_id}/{filename}`
     - `vton/inputs/{user_id}/{job_id}.png`
     - `vton/results/{user_id}/{job_id}.png`
3. **Cloudinary / Local como Estrategia de Respaldo**:
   - En entornos locales o de demostración sin conexión a Azure, el sistema conmuta automáticamente a almacenamiento local montado en volumen o a Cloudinary mediante variables de entorno (`STORAGE_BACKEND=azure|cloudinary|local`).
4. **Seguridad y URLs de Entrega**:
   - Las imágenes privadas se sirven mediante URLs firmadas con expiración temporal o a través del proxy seguro del gateway.

---

## Alternativas Descartadas

- **Acoplamiento exclusivo a Cloudinary**: Descartada por limitaciones de cuotas de transferencia en la capa gratuita durante pruebas intensivas de VTON y costo por transformación.
- **Guardar imágenes directamente en base de datos (Postgres BYTEA)**: Descartada de inmediato por degradación severa del rendimiento de la base de datos y saturación de memoria en consultas de catálogo.

---

## Consecuencias

- **Positivas**:
  - Flexibilidad total: cambiar de proveedor de almacenamiento en la nube no requiere alterar ninguna línea de lógica de negocio.
  - Almacenamiento económico, escalable y con políticas de ciclo de vida automáticas en Azure (expiración de fotos temporales a las 24 horas).
  - Portabilidad total para desarrollo offline con `STORAGE_BACKEND=local`.
