## ADDED Requirements

### Requirement: Límite de concurrencia en la subida por lote
El sistema SHALL limitar el número de subidas de prendas (`useUploadGarment`) ejecutándose en paralelo a un techo configurable, encolando el resto en orden FIFO, para evitar disparar decenas de solicitudes `multipart/form-data` simultáneas cuando el usuario sube un armario completo durante el onboarding.

#### Scenario: Onboarding con carga masiva
- **WHEN** el usuario suelta más archivos que el techo de concurrencia configurado (valor por defecto: 4-6 simultáneos) en `GarmentDropzone`
- **THEN** los primeros N archivos entran en estado `uploading` de inmediato y el resto permanece en un estado `queued` visible, iniciando su propio ciclo de análisis a medida que se liberan slots

#### Scenario: Un fallo no bloquea la cola
- **WHEN** una subida en curso falla (`ApiError`/`NetworkError`)
- **THEN** el siguiente archivo en la cola FIFO inicia su subida sin esperar a que el usuario reintente el fallido, preservando el invariante existente de "un fallo no bloquea ni cancela a los demás"

### Requirement: Criterio de calidad de curación del catálogo cápsula
El catálogo "Básicos StyleMe" SHALL cumplir un criterio de curación verificable por checklist antes de publicarse, no solo un rótulo genérico de "curado".

#### Scenario: Cobertura de categorías mínima
- **WHEN** se publica o actualiza el catálogo cápsula
- **THEN** contiene al menos una prenda por cada posición de outfit definida en `plan-base.md` §10.1 (`top`, `bottom`, `footwear`, `outerwear`) y por cada estética objetivo listada en el documento base, de forma que ningún filtro de `/outfits` quede sin combinaciones posibles usando solo prendas cápsula

#### Scenario: Consistencia visual con la identidad de marca
- **WHEN** se revisa una prenda candidata para el catálogo cápsula
- **THEN** su fotografía cumple el mismo estándar de fondo removido y encuadre que el resultado esperado de `POST /garments/upload` (`specs/01-api-client-and-schemas`), de modo que el catálogo no se perciba visualmente distinto de una prenda subida por el usuario

### Requirement: Alt text generado desde metadata real
Toda imagen de prenda u outfit renderizada en `/wardrobe`, `/wardrobe/upload` y `/wardrobe/capsule` SHALL tener un `alt` no vacío derivado de metadata real (categoría, estética dominante), nunca `alt=""` ni un valor genérico como "imagen".

#### Scenario: GarmentCard con análisis completo
- **WHEN** `GarmentCard` renderiza una prenda con categoría y estética conocidas
- **THEN** el `alt` de la imagen sigue el patrón `"{categoría}, estética {estética_dominante}"` definido en `frontend-plan.md` §8, verificado por un test de integración dedicado (no heredado implícitamente)

### Requirement: Animaciones de carga respetan `prefers-reduced-motion`
Los estados de shimmer/skeleton de `GarmentAnalysisResult` y `GarmentCard` SHALL respetar `prefers-reduced-motion`, cayendo a un estado estático con el mismo texto informativo cuando el usuario lo solicita a nivel de sistema.

#### Scenario: Usuario con reduced motion activado
- **WHEN** `prefers-reduced-motion: reduce` está activo en el sistema del usuario
- **THEN** el shimmer de carga se reemplaza por un estado estático equivalente (mismo texto "Analizando tu prenda...", sin animación), verificado por un test de integración
