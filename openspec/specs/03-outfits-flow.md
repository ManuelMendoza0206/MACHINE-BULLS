# Spec 03 — Outfits Flow

**Estado:** Draft para implementación · **Depende de:** spec 00 (design system), spec 01 (api client/schemas) · **Consumido por:** spec 04 (VTON toma un `outfit_id` como input)

Deriva de `docs/frontend-plan.md` §3.3 (Flujo C), §4.7. Cubre rutas `/outfits` y `/outfits/[outfitId]`.

---

## 1. Propósito y SLA

**Propósito:** presentar combinaciones de outfits generadas por el motor de compatibilidad del backend, con su justificación (score cromático + score de embedding), permitiendo filtrar por estética y navegar al probador virtual.

**SLA de rendimiento:**
- `POST /outfits/recommend` es síncrono (spec 01 §1): timeout cliente 10s. Skeleton de 3-4 cards visible inmediatamente al montar/cambiar filtros, sin esperar la respuesta.
- Cambio de filtro no debe re-fetch mientras el usuario sigue interactuando con el chip selector — debounce de 300ms antes de disparar la query.
- Detalle de outfit (`/outfits/[outfitId]`) no requiere nueva llamada de red si el outfit ya está en caché de TanStack Query (navegación desde el grid) — solo re-fetch en acceso directo por URL.

---

## 2. Contratos

### 2.1 Hook de recomendación (`src/features/outfits/hooks/useRecommendOutfits.ts`)

```ts
interface UseRecommendOutfitsParams {
  userId: string;
  targetAesthetic?: string;
  onlyAvailableGarments?: boolean; // true => envía available_garment_ids con los ids del armario actual
}

interface UseRecommendOutfitsResult {
  outfits: Outfit[];                 // tipo inferido de OutfitSchema (spec 01)
  status: 'pending' | 'error' | 'success';
  error: StyleMeError | undefined;
  missingCategoryHint: OutfitPosition | null; // ver §3.3
}

export function useRecommendOutfits(params: UseRecommendOutfitsParams): UseRecommendOutfitsResult;
```

Internamente: `useQuery` con `queryKey: ['outfits', 'recommend', params]`, `queryFn` invoca `recommendOutfits` (spec 01 §2.4). `onlyAvailableGarments` resuelve `available_garment_ids` a partir del store/cache del armario (spec 02) — si esa lista está vacía, la query no se dispara (`enabled: false`) y se muestra el hint de categoría faltante directamente.

### 2.2 Store de filtros (`src/features/outfits/hooks/useOutfitFilters.ts`, estado local con `useState`, NO Zustand)

```ts
interface OutfitFilters {
  targetAesthetic: string | null;
  onlyAvailableGarments: boolean;
}
```
**[Decisión de diseño]** Filtros de `/outfits` son estado de URL (`useSearchParams`/`nuqs` o `URLSearchParams` manual), no Zustand — deben ser bookmarkeables/compartibles y no necesitan persistir entre sesiones. Esto se aparta deliberadamente del patrón Zustand usado en onboarding (spec 02), donde sí se requiere persistencia de sesión.

### 2.3 Componentes

```ts
// src/features/outfits/components/OutfitFilterBar.tsx
interface OutfitFilterBarProps {
  filters: OutfitFilters;
  onChange: (filters: OutfitFilters) => void;
  availableAesthetics: string[]; // derivado de las estéticas presentes en el armario del usuario
}

// src/features/outfits/components/OutfitCard.tsx
interface OutfitCardProps {
  outfit: Outfit;
  onClick: () => void;
}

// src/features/outfits/components/OutfitScoreBreakdown.tsx
interface OutfitScoreBreakdownProps {
  chromaticScore: number;
  embeddingScore: number;
  aesthetic: string;
}
// Renderiza expandible ("¿por qué este outfit?") — colapsado por defecto (progressive disclosure, frontend-plan.md §1.1)

// src/features/outfits/components/MissingCategoryHint.tsx
interface MissingCategoryHintProps {
  missingPosition: OutfitPosition; // 'top' | 'bottom' | 'footwear' | 'outerwear'
}
// CTA hacia /wardrobe/upload?category=X o /wardrobe/capsule?category=X
```

### 2.4 Accesibilidad del grid

El grid de `OutfitCard` es navegable con flechas (`↑↓←→`) además de `Tab`, siguiendo el patrón WAI-ARIA de `grid`/`listbox` — no basta con que cada card sea individualmente enfocable por `Tab` (sería impracticable con >20 outfits). `role="grid"` en el contenedor, `role="gridcell"` (o `option` si se modela como `listbox`) en cada `OutfitCard`, gestionado con un roving `tabIndex` (un solo elemento del grid tiene `tabIndex=0` a la vez).

---

## 3. Flujo de Datos Interno

### 3.1 Secuencia — `/outfits` (grid)

```
Usuario entra a /outfits (filtros desde URL, default: sin estética, onlyAvailable=false)
        │
        v
useRecommendOutfits({ userId, ...filtros })
        │
        ├─ status: 'pending' ──► 3-4 OutfitCard en modo skeleton
        │
        ├─ status: 'error' ──► banner de error + botón "Reintentar"
        │                       (distingue ApiError de NetworkError en el copy)
        │
        └─ status: 'success'
                │
                ├─ outfits.length === 0 ──► ¿causa? si onlyAvailableGarments=true y
                │                            falta una categoría del armario del usuario
                │                            ──► MissingCategoryHint con la posición faltante
                │                            si no ──► EmptyState genérico
                                                        ("no encontramos combinaciones,
                                                         prueba sin filtros")
                │
                └─ outfits.length > 0 ──► grid de OutfitCard
                                            (click ──► router.push(`/outfits/${id}`),
                                             precarga en cache de TanStack Query vía
                                             queryClient.setQueryData antes de navegar)
```

### 3.2 Secuencia — `/outfits/[outfitId]` (detalle)

```
Monta con outfitId de la URL
        │
        v
queryClient.getQueryData(['outfit', outfitId]) ──► HIT (venía del grid)
        │                                            └─► render inmediato, sin loading
        │ MISS (acceso directo por URL / refresh)
        v
Fallback: re-derivar del último useRecommendOutfits ejecutado, o
mostrar estado "outfit no encontrado en esta sesión" con CTA a /outfits
        │  (no existe GET /outfits/{id} individual en base-plan.MD §11 —
        │   ver gap §6)
        v
Render: imagen combinada, lista de prendas por posición,
OutfitScoreBreakdown (colapsado), CTA "Probar este outfit"
        │
        v
onClick CTA ──► router.push(`/try-on?outfitId=${outfitId}`)  [entrada a spec 04]
```

### 3.3 Tabla de Estados Finitos — `useRecommendOutfits`

| Estado (`status`) | Condición | UI renderizada |
| :--- | :--- | :--- |
| `pending` (query deshabilitada) | `onlyAvailableGarments=true` y armario sin categorías suficientes | `MissingCategoryHint` directo, sin llamar a la red (ver §2.1, `enabled: false`) |
| `pending` (query activa) | Filtros cambiaron, esperando respuesta | 3-4 `OutfitCard` skeleton |
| `error` | `ApiError`/`NetworkError`/`ValidationError` (spec 01) | Banner de error con `mapStatusToUserMessage` (spec 01 §2.6) + reintento |
| `success`, `outfits.length === 0`, sin filtros activos | Backend no encontró combinaciones viables | `EmptyState` genérico ("prueba ajustando tus filtros") |
| `success`, `outfits.length === 0`, `onlyAvailableGarments=true` | Falta una categoría (derivado client-side, §2.1) | `MissingCategoryHint` con la posición exacta |
| `success`, `outfits.length > 0` | Caso nominal | Grid de `OutfitCard` |

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- `useOutfitFilters`: serialización/deserialización correcta hacia/desde `URLSearchParams` (roundtrip test).
- Lógica de `missingCategoryHint`: dado un armario mock con categorías `['top', 'bottom']` (sin `footwear`), determina correctamente `'footwear'` como faltante cuando `outfits.length === 0` y `onlyAvailableGarments === true`.

**Integración (Vitest + RTL + MSW):**
- Grid: navegación por flechas del teclado mueve el `tabIndex` roving entre `OutfitCard` (§2.4), `Enter`/`Space` activa la card enfocada igual que un click.
- `OutfitFilterBar`: cambiar filtro dispara `onChange` con el shape correcto; debounce verificado con fake timers (no dispara antes de 300ms de inactividad).
- Grid `/outfits`: MSW responde con 3 outfits válidos (fixture derivado de `OutfitRecommendationResponseSchema`) → 3 `OutfitCard` renderizados con score y estética visibles.
- Grid `/outfits`: MSW responde `{ outfits: [] }` con `onlyAvailableGarments=true` y armario mock incompleto → `MissingCategoryHint` visible con la posición correcta.
- Grid `/outfits`: MSW responde 500 → banner de error + reintento funcional.
- `OutfitScoreBreakdown`: colapsado por defecto, expande al click, valores numéricos formateados como porcentaje (ej. `0.92` → `"92%"`).
- Detalle: navegación desde grid (cache HIT) no dispara nueva request de red (aserción sobre contador de llamadas MSW).
- Detalle: acceso directo por URL sin cache (MISS) → muestra fallback "no encontrado en esta sesión" (dado el gap de §6).
- `OutfitCard`: con estética y prendas conocidas, el `alt` describe el outfit (ej. "Outfit estética old_money: camisa, pantalón, calzado"), no vacío ni genérico.
- Grid `/outfits` con `prefers-reduced-motion: reduce` simulado: la transición skeleton → resultado no anima, el contenido informativo es el mismo.

**E2E (Playwright):**
- Flujo: `/outfits` con armario precargado (fixture) → aplicar filtro de estética → click en primer outfit → detalle visible → click "Probar este outfit" → navega a `/try-on` con `outfitId` en query param.

---

## 5. Criterios de Aceptación

- [ ] `useRecommendOutfits` implementado, con `enabled: false` cuando `onlyAvailableGarments=true` y el armario no tiene prendas suficientes (evita llamada de red innecesaria).
- [ ] Filtros persisten en la URL (bookmarkeable/compartible), no en estado de componente ni Zustand.
- [ ] Debounce de 300ms verificado en tests con fake timers.
- [ ] Estado vacío distingue explícitamente "sin resultados por filtro" de "falta una categoría en el armario" (dos mensajes/CTAs distintos).
- [ ] `OutfitScoreBreakdown` implementa progressive disclosure (colapsado por defecto).
- [ ] Navegación grid→detalle reutiliza cache de TanStack Query sin re-fetch cuando el dato ya existe.
- [ ] CTA de detalle navega a `/try-on` pasando el `outfitId` correctamente.
- [ ] `OutfitCard` y el detalle exponen `alt` no vacío derivado de estética/prendas reales, verificado por test.
- [ ] Las transiciones del grid respetan `prefers-reduced-motion`, verificado por test.
- [ ] Cobertura de tests ≥ 80% en `src/features/outfits/`.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Gap Explícito

`base-plan.MD` §11 no define un endpoint `GET /api/v1/outfits/{outfit_id}` para recuperar un outfit individual de forma independiente al listado de recomendaciones — solo `POST /outfits/recommend` (que devuelve un array). Esta spec asume que el detalle se sirve **desde el cache del cliente** (outfit ya visto en un grid previo) y define un fallback explícito de "no encontrado en esta sesión" para accesos directos por URL. **Acción de seguimiento:** confirmar con backend si se agregará un endpoint de detalle individual o si el frontend debe siempre re-derivar del último `recommend` — esto determina si el fallback de esta spec es permanente o temporal.

**Ver `specs/08-api-contract-gaps.md` (G2)** para el estado consolidado de este gap.

---

## 7. Manifiesto de Archivos

```
src/features/outfits/hooks/useRecommendOutfits.ts
src/features/outfits/hooks/useOutfitFilters.ts
src/features/outfits/components/OutfitFilterBar.tsx
src/features/outfits/components/OutfitCard.tsx
src/features/outfits/components/OutfitScoreBreakdown.tsx
src/features/outfits/components/MissingCategoryHint.tsx
src/app/outfits/page.tsx
src/app/outfits/[outfitId]/page.tsx
tests/unit/features/outfits/useOutfitFilters.test.ts
tests/unit/features/outfits/missingCategoryHint.test.ts
tests/integration/outfits/OutfitFilterBar.test.tsx
tests/integration/outfits/OutfitGrid.test.tsx
tests/integration/outfits/OutfitScoreBreakdown.test.tsx
tests/integration/outfits/OutfitDetail.test.tsx
tests/e2e/outfits.spec.ts
```
