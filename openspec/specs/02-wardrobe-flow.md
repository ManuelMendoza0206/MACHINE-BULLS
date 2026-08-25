# Spec 02 — Wardrobe Flow (Onboarding, Upload, Armario, Catálogo Cápsula)

**Estado:** Draft para implementación · **Depende de:** spec 00 (design system), spec 01 (api client/schemas) · **Consumido por:** ninguna

Deriva de `docs/frontend-plan.md` §3.1 (Flujo A), §3.2 (Flujo B), §4.2-4.6 (inventario de pantallas). Cubre rutas `/onboarding`, `/wardrobe`, `/wardrobe/upload`, `/wardrobe/[garmentId]`, `/wardrobe/capsule`.

---

## 1. Propósito y SLA

**Propósito:** permitir al usuario digitalizar su guardarropa con fricción mínima (subida propia y/o catálogo cápsula) y revisar/corregir el análisis automático de cada prenda antes de que alimente el motor de recomendación.

**SLA de rendimiento:**
- Feedback visual de "analizando" visible en < 100ms desde que el usuario suelta/selecciona un archivo (skeleton inmediato, no esperar respuesta de red para mostrar estado).
- Validación de blur en cliente (heurística de varianza Laplaciana sobre `<canvas>`) debe resolver en < 300ms para una imagen de hasta 8MB, para no percibirse como bloqueo antes del submit.
- Subida por lote: cada archivo procesa su propio ciclo upload→análisis de forma independiente y paralela (fallo de uno no bloquea a los demás), con un **techo de concurrencia de 4-6 subidas simultáneas** (configurable en `src/config/vision.ts`) — el resto se encola en orden FIFO y visible como estado `queued`, para no disparar decenas de `multipart/form-data` a la vez cuando el onboarding sube un armario completo (hallazgo de auditoría, agosto 2026).
- `/wardrobe` con grid de hasta 50 items debe alcanzar interactividad (TTI) en < 2s en conexión 4G simulada (Lighthouse).

---

## 2. Contratos

### 2.1 Store de onboarding (`src/stores/onboardingStore.ts`, Zustand)

```ts
interface OnboardingState {
  step: 1 | 2;
  targetAesthetic: string | null;       // selección opcional del paso 1
  pendingGarmentFiles: File[];          // archivos elegidos, aún no confirmados
  selectedCapsuleGarmentIds: string[];  // ids del catálogo cápsula elegidos
  setStep: (step: 1 | 2) => void;
  setTargetAesthetic: (aesthetic: string | null) => void;
  addPendingFiles: (files: File[]) => void;
  toggleCapsuleGarment: (id: string) => void;
  reset: () => void;
}
```
Persistencia: `sessionStorage` (vía middleware `persist` de Zustand) — sobrevive a recarga de página dentro de la misma sesión, se limpia al completar onboarding (`reset()`).

### 2.2 Hook de análisis de blur (`src/lib/vision/detectBlur.ts`)

```ts
interface BlurCheckResult {
  isBlurry: boolean;
  varianceScore: number; // valor crudo, para tuning de threshold en tests
}

export async function detectBlur(file: File, threshold?: number): Promise<BlurCheckResult>;
```
Implementación: dibuja la imagen en un `<canvas>` oculto, aplica un kernel Laplaciano simplificado sobre escala de grises, calcula varianza. `threshold` por defecto configurado en `src/config/vision.ts` (valor inicial documentado como ajustable — no bloquea el submit, solo informa).

### 2.3 Hook de subida (`src/features/garments/hooks/useUploadGarment.ts`)

```ts
interface UseUploadGarmentResult {
  upload: (file: File) => void;
  status: 'idle' | 'analyzing' | 'success' | 'error';
  data: GarmentUploadResponse | undefined;
  error: StyleMeError | undefined;
}
export function useUploadGarment(): UseUploadGarmentResult;
```
Internamente: `useMutation` de TanStack Query sobre `uploadGarment` (spec 01 §2.4). Un componente que sube N archivos instancia N veces este hook (uno por `GarmentCard` en estado de análisis) — no hay una mutación batch a nivel de red, el "batch" es paralelismo en el cliente, acotado por el gestor de cola de §2.3.1.

#### 2.3.1 Límite de concurrencia (`src/features/garments/lib/uploadQueue.ts`)

```ts
interface UploadQueueOptions {
  maxConcurrent?: number; // default: config.vision.maxConcurrentUploads (4-6)
}

export function useUploadQueue(files: File[], options?: UploadQueueOptions): {
  active: File[];   // archivos actualmente en estado 'uploading'
  queued: File[];   // archivos en espera, orden FIFO
};
```
Cuando un archivo activo resuelve (éxito o error), el siguiente en la cola FIFO inicia su propio ciclo `detectBlur → useUploadGarment` sin esperar a que el usuario reintente el fallido — preserva el invariante existente de "un fallo no bloquea ni cancela a los demás" (§3.1) y añade uno nuevo: **la cola nunca se detiene por un fallo individual**.

### 2.4 Componentes (props mínimas)

```ts
// src/features/garments/components/GarmentDropzone.tsx
interface GarmentDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean; // default true
  disabled?: boolean;
}

// src/features/garments/components/GarmentCard.tsx
interface GarmentCardProps {
  garment: GarmentUploadResponse | GarmentSummary; // GarmentSummary: ver §6 (gap de listado)
  editable?: boolean;   // true en resultado recién subido, false en grid de solo lectura
  onCategoryChange?: (newCategory: string) => void;
  onDelete?: () => void;
}

// src/features/garments/components/GarmentAnalysisResult.tsx
interface GarmentAnalysisResultProps {
  file: File;
  onConfirmed: (garment: GarmentUploadResponse) => void;
}
// Orquesta: detectBlur -> (warning si aplica) -> useUploadGarment().upload -> render GarmentCard editable

// src/features/garments/components/CapsuleCatalogGrid.tsx
interface CapsuleCatalogGridProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}
```

#### 2.4.1 Criterio de calidad de curación del catálogo cápsula

El catálogo "Básicos StyleMe" (`base-plan.md` §5.2) es el diferenciador de producto frente a la fricción de alta que hunde a la competencia directa (Whering, Acloset, Stylebook — ver auditoría de agosto 2026: la queja #1 en reseñas de esas apps es exigir un armario mínimo antes de dar valor). Por eso no basta con el rótulo genérico "curado" — debe cumplir un checklist verificable antes de publicarse o actualizarse:

- **Cobertura mínima por posición:** al menos una prenda por cada posición de outfit (`top`, `bottom`, `footwear`, `outerwear`, `base-plan.md` §10.1), de forma que ningún filtro de `/outfits` quede sin combinaciones posibles usando solo prendas cápsula.
- **Cobertura mínima por estética:** al menos una prenda etiquetada por cada estética objetivo listada en `base-plan.md` (Old Money, Streetwear, Soft Boy, Starboy, Gorpcore).
- **Estándar visual consistente:** cada fotografía del catálogo cumple el mismo estándar de fondo removido y encuadre que `processed_image_url` de `POST /garments/upload` (spec 01 §2.5) — el catálogo no debe percibirse visualmente distinto de una prenda subida por el usuario.

### 2.5 Componente de onboarding

```ts
// src/app/onboarding/page.tsx (Client Component, orquesta OnboardingWizard)
// src/features/onboarding/components/OnboardingWizard.tsx — sin props externas, lee/escribe onboardingStore
```

---

## 3. Flujo de Datos Interno

### 3.1 Secuencia — Subida de una prenda (Flujo B completo)

```
Usuario suelta archivo en GarmentDropzone
        │
        v
GarmentAnalysisResult monta con status local "checking-blur"
        │
        v
detectBlur(file) ──► isBlurry: true ──► Badge de warning inline
        │                               (no bloqueante — el usuario decide)
        │ isBlurry: false ó usuario insiste
        v
useUploadGarment().upload(file)
        │
        ├─ status: 'analyzing' ──► GarmentCard renderiza skeleton + shimmer
        │
        ├─ error (ApiError/NetworkError/ValidationError)
        │       └─► GarmentCard renderiza estado de error + botón "Reintentar"
        │            (reintento = vuelve a llamar upload(file), mismo archivo)
        │
        └─ success: GarmentUploadResponse
                └─► GarmentCard renderiza resultado editable:
                     imagen procesada, categoría (dropdown editable),
                     top_aesthetics (barras de confianza), swatches de color
                        │
                        v
                onConfirmed(garment) ──► agrega a lista de "prendas confirmadas
                                          en esta sesión de subida"
```

### 3.2 Secuencia — Onboarding completo

```
/onboarding monta ──► onboardingStore.step === 1
        │
Usuario selecciona estética objetivo (opcional) ──► setTargetAesthetic()
        │
        v  "Siguiente" ──► setStep(2)
        │
step === 2 ──► usuario elige una o ambas ramas:
        │
        ├─ Rama A: GarmentDropzone (multiple) ──► por cada archivo,
        │          instancia GarmentAnalysisResult (paralelo, ver §3.1)
        │
        └─ Rama B: CapsuleCatalogGrid ──► toggleCapsuleGarment(id) por cada selección
        │
        v  "Ver mis primeros outfits"
        │
Confirma: prendas subidas confirmadas + selectedCapsuleGarmentIds
        │  (asociación de prendas cápsula al usuario: ver gap §6)
        v
onboardingStore.reset() ──► router.push('/outfits')
```

### 3.3 Tabla de Estados Finitos — `GarmentAnalysisResult`

Formaliza el diagrama de §3.1 como máquina de estados explícita — implementación de referencia para el reducer/hook interno, no solo prosa:

| Estado | Entrada que dispara la transición | Siguiente estado | UI renderizada |
| :--- | :--- | :--- | :--- |
| `idle` | Archivo aún no procesado (no debería ser visible — se monta ya en `checking-blur`) | — | — |
| `queued` | El archivo excede el techo de concurrencia activo (§2.3.1) al momento de soltarse | Un slot de subida se libera (otro archivo activo resuelve) → pasa a `checking-blur` | Card en estado de espera, sin skeleton de análisis — indica posición en cola |
| `checking-blur` | Montaje del componente con un `File`, o liberación desde `queued` | `detectBlur` resuelve | Skeleton neutro |
| `blur-warning` | `detectBlur` retorna `isBlurry: true` | Usuario confirma envío o descarta el archivo | Badge de warning + preview + botón "Subir de todas formas" / "Elegir otra" |
| `uploading` | `detectBlur` retorna `isBlurry: false`, o usuario confirma pese al warning | Respuesta de `useUploadGarment` | Skeleton + shimmer, texto "Analizando tu prenda..." |
| `error` | `useUploadGarment` resuelve con `status: 'error'` | Usuario click "Reintentar" → vuelve a `uploading` | Card de error tipada por clase de `StyleMeError` (mensaje distinto para `ApiError` vs `NetworkError` vs `ValidationError`, reutilizando `mapStatusToUserMessage` de spec 01 §2.6) |
| `review` | `useUploadGarment` resuelve con `status: 'success'` | Usuario confirma (`onConfirmed`) o descarta | Resultado editable completo (categoría, estéticas, colores) |
| `confirmed` | Usuario confirma en `review` | Terminal — el componente se desmonta/colapsa a un `GarmentCard` de solo lectura en la lista de confirmados | — |

Invariante a testear: **nunca** existe una transición directa de `checking-blur` a `review` sin pasar por `uploading` — el análisis del backend es siempre requerido, el blur-check es solo un gate informativo del cliente.

### 3.4 Estado vacío de `/wardrobe`

```
GET (listado de garments, ver gap §6)
        │
        ├─ length === 0 ──► EmptyState con CTA dual
        │                   (idéntico visualmente al paso 2 de onboarding,
        │                    reutiliza GarmentDropzone + link a /wardrobe/capsule)
        │
        └─ length > 0 ──► grid de GarmentCard (editable=false) + Tabs
                            (Mis prendas / filtros por categoría)
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- `detectBlur`: fixture de imagen nítida → `isBlurry: false`; fixture de imagen borrosa (generada con blur gaussiano en el fixture) → `isBlurry: true`. Caso borde: imagen de 1x1 px (no debe crashear, debe resolver a algún resultado determinista).
- `onboardingStore`: transiciones de step, `reset()` limpia todo el estado incluyendo `sessionStorage`.

**Integración (Vitest + RTL + MSW):**
- `GarmentAnalysisResult`: flujo feliz completo (mock de `detectBlur` resolviendo `isBlurry: false`, MSW respondiendo 200) — verifica que se renderizan categoría, estéticas y colores del fixture.
- `GarmentAnalysisResult`: MSW respondiendo 500 → verifica botón "Reintentar" visible y funcional (segundo click, MSW ahora responde 200 → resultado se muestra).
- `GarmentAnalysisResult`: `detectBlur` resuelve `isBlurry: true` → verifica warning visible Y que el botón de submit sigue habilitado (no bloqueante).
- `GarmentDropzone`: `onFilesSelected` se llama con el array correcto al soltar múltiples archivos (simulado vía evento `drop` con `DataTransfer` mockeado).
- `OnboardingWizard`: navegación paso 1 → paso 2 → confirmación → `router.push` a `/outfits` (mock de `next/navigation`).
- `CapsuleCatalogGrid`: toggle de selección, contador de seleccionados refleja el estado.
- Estado vacío de `/wardrobe`: sin datos → EmptyState visible con ambos CTAs.
- `useUploadQueue`: con `maxConcurrent: 2` y 5 archivos soltados a la vez, verifica que solo 2 entran en `uploading` de inmediato y 3 quedan en `queued`; al resolver uno de los activos (éxito o error vía MSW), el siguiente en la cola FIFO pasa a `checking-blur` automáticamente.
- `GarmentCard`: con datos de categoría/estética conocidos, el `alt` de la imagen sigue el patrón `"{categoría}, estética {estética_dominante}"` (no vacío, no genérico).
- `GarmentAnalysisResult` con `prefers-reduced-motion: reduce` simulado (mock de `matchMedia`): el shimmer de carga se reemplaza por un estado estático con el mismo texto informativo.
- `CapsuleCatalogGrid`: fixture del catálogo cumple cobertura mínima por posición y por estética (test de datos, no de componente — valida el fixture usado en MSW contra el checklist de §2.4.1).

**E2E (Playwright):**
- Flujo completo: signup mock → onboarding paso 1 (skip estética) → paso 2 (subir 1 archivo fixture) → esperar resultado → confirmar → landing en `/outfits`.
- Flujo alterno: onboarding usando solo catálogo cápsula (sin subir ningún archivo).

**Casos borde explícitos:**
- Subida de 2 archivos simultáneos donde uno falla (500) y otro tiene éxito (200): ambos `GarmentCard` reflejan su estado independientemente.
- Usuario recarga la página en medio del paso 2 del onboarding: `pendingGarmentFiles` NO sobrevive (los `File` objects no son serializables en `sessionStorage` — documentar esta limitación: solo `targetAesthetic`, `step` y `selectedCapsuleGarmentIds` persisten; archivos ya subidos con éxito si se confirmaron antes de recargar).

---

## 5. Criterios de Aceptación

- [ ] `detectBlur` implementado y retorna resultado consistente para fixtures nítidos/borrosos, sin bloquear el hilo principal más de 300ms.
- [ ] `useUploadGarment` expone los 4 estados (`idle|analyzing|success|error`) y nunca deja al consumidor con un error no tipado (`StyleMeError` siempre).
- [ ] `GarmentDropzone` soporta selección múltiple y drag&drop, con targets táctiles ≥44px (accesibilidad, `frontend-plan.md` §8).
- [ ] Subida de N archivos procesa cada uno de forma independiente — un fallo no cancela ni bloquea a los demás.
- [ ] Categoría y estética del resultado son editables inline antes de "confirmar" (según `frontend-plan.md` §3.2).
- [ ] `OnboardingWizard` permite completar el flujo usando SOLO subida propia, SOLO catálogo cápsula, o ambas combinadas.
- [ ] Estado vacío de `/wardrobe` presenta el mismo doble CTA que el onboarding paso 2 (consistencia de patrón).
- [ ] Subida por lote respeta el techo de concurrencia configurado (§2.3.1); el excedente se refleja en estado `queued` visible y procesa en orden FIFO sin detenerse ante fallos individuales.
- [ ] El catálogo cápsula cumple el checklist de curación de §2.4.1 (cobertura por posición, por estética, estándar visual consistente con `GarmentCard`).
- [ ] `GarmentCard` expone `alt` no vacío derivado de categoría/estética real (nunca `alt=""` ni genérico), verificado por test.
- [ ] Los estados de shimmer/skeleton respetan `prefers-reduced-motion`, cayendo a un estado estático con el mismo texto informativo, verificado por test.
- [ ] Cobertura de tests ≥ 80% en `src/features/garments/` y `src/features/onboarding/`.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Gap Explícito (bloqueante parcial)

Como se documentó en `frontend-plan.md` §6, no existe en `base-plan.MD` §11 un endpoint de **listado** de prendas del usuario ni de **asociación** de prendas del catálogo cápsula a un usuario. Esta spec define `GarmentSummary` como un tipo placeholder mínimo (`{ id, processed_image_url, category, dominant_aesthetic }`) para permitir desarrollar `/wardrobe` contra mocks MSW (Fase 1 de `frontend-plan.md` §10), pero **la conexión real queda bloqueada** hasta que el backend confirme:
1. `GET /api/v1/garments?user_id=` (o equivalente) para el grid de `/wardrobe`.
2. El mecanismo para "agregar" prendas del catálogo cápsula al armario del usuario (¿es un `POST` separado, o el `user_id` se asigna directamente al seleccionar?).

No se debe implementar ninguna llamada real a estos endpoints hipotéticos en `src/features/garments/api/` hasta confirmarlo — solo mocks MSW documentados como tales.

**Ver `specs/08-api-contract-gaps.md` (G1, G4)** para el estado consolidado de estos gaps, su fase de corte recomendada y el proceso de cierre — este documento mantiene la nota local, esa spec es la fuente única de verdad sobre su estado.

---

## 7. Manifiesto de Archivos

```
src/stores/onboardingStore.ts
src/lib/vision/detectBlur.ts
src/config/vision.ts
src/features/garments/hooks/useUploadGarment.ts
src/features/garments/lib/uploadQueue.ts
src/features/garments/components/GarmentDropzone.tsx
src/features/garments/components/GarmentCard.tsx
src/features/garments/components/GarmentAnalysisResult.tsx
src/features/garments/components/CapsuleCatalogGrid.tsx
src/features/onboarding/components/OnboardingWizard.tsx
src/app/onboarding/page.tsx
src/app/wardrobe/page.tsx
src/app/wardrobe/upload/page.tsx
src/app/wardrobe/[garmentId]/page.tsx
src/app/wardrobe/capsule/page.tsx
tests/fixtures/images/sharp.jpg
tests/fixtures/images/blurry.jpg
tests/unit/lib/vision/detectBlur.test.ts
tests/unit/stores/onboardingStore.test.ts
tests/unit/features/garments/uploadQueue.test.ts
tests/integration/garments/GarmentAnalysisResult.test.tsx
tests/integration/garments/GarmentDropzone.test.tsx
tests/integration/garments/CapsuleCatalogGrid.test.tsx
tests/integration/onboarding/OnboardingWizard.test.tsx
tests/integration/wardrobe/EmptyState.test.tsx
tests/e2e/onboarding.spec.ts
```
