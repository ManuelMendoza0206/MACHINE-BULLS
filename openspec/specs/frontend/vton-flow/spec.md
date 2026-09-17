## Purpose
Captura/selecciona la foto del usuario, dispara el trabajo de generación VTON, comunica honestamente el progreso de un proceso asíncrono que puede tardar más de 15 segundos, y presenta el resultado o el fallo de forma accionable.

## Requirements

### Requirement: Polling con backoff y timeout local sin cancelar el job
El sistema SHALL consultar el estado de un `VTONJob` con backoff exponencial y un techo de tiempo, sin cancelar el job en backend al alcanzar el timeout.

#### Scenario: Timeout de UI alcanzado
- **WHEN** el polling alcanza el techo de tiempo configurado sin que el job llegue a un estado terminal
- **THEN** la UI muestra un estado de timeout local, y el job sigue activo en backend, consultable manualmente después

### Requirement: Protección contra doble-submit en la mutación más costosa
El sistema SHALL impedir que un doble click dispare dos trabajos VTON simultáneos para la misma solicitud.

#### Scenario: Doble click en el CTA de generación
- **WHEN** el usuario hace doble click en "Generar prueba virtual" antes de que la primera respuesta resuelva
- **THEN** solo se ejecuta una llamada a la creación del trabajo VTON

### Requirement: Reuso de resultados cacheados
El sistema SHALL evitar generar un nuevo trabajo VTON si ya existe un resultado completado para la misma combinación de outfit y foto en la sesión.

#### Scenario: Combinación ya generada
- **WHEN** el usuario solicita el mismo par (outfit, foto) que ya generó un resultado completado en esta sesión
- **THEN** se navega directo al resultado cacheado sin crear un nuevo trabajo

### Requirement: Soporte multicapa con orden por posición
El sistema SHALL permitir generar un VTON a partir de capas individuales por posición (top/bottom/footwear/outerwear) con orden definido, sin requerir un outfit pre-armado.

#### Scenario: Try-on multicapa
- **WHEN** el usuario selecciona prendas por posición y confirma el try-on
- **THEN** el sistema envía `garment_layers` en orden por posición y procesa el job con el mismo flujo de polling/timeout

---

# Spec 04 — Virtual Try-On (VTON) Flow

**Estado:** Draft para implementación · **Depende de:** spec 00, spec 01, spec 03 (recibe `outfitId`) · **Consumido por:** ninguna

Deriva de `docs/context/frontend-plan.md` §3.4 (Flujo D — el más crítico), §4.8, §7 (mapeo de riesgos), `CLAUDE.md` §5 (`VtonJobTimeoutError`). Cubre rutas `/try-on`, `/try-on/jobs/[jobId]`, `/try-on/history`.

---

## 1. Propósito y SLA

**Propósito:** capturar/seleccionar la foto del usuario, disparar el trabajo de generación VTON, comunicar honestamente el progreso de un proceso asíncrono que puede tardar >15s (§8 de `plan-base.md`), y presentar el resultado o el fallo de forma accionable.

**SLA de rendimiento y comportamiento asíncrono:**
- Validación de blur + guía de encuadre en cliente antes de habilitar el submit (reutiliza `detectBlur` de spec 02 §2.2).
- `POST /vton/try-on`: timeout cliente 10s (spec 01 §1) — solo crea el job, no espera el resultado.
- Polling de `GET /vton/status/{job_id}`: intervalo inicial 2s, backoff hasta techo de 8s, timeout duro total configurable (default 90s) → `VtonJobTimeoutError`.
- Polling se pausa cuando `document.visibilityState !== 'visible'` y se reanuda al volver (ahorro de batería/datos, `frontend-plan.md` §9).
- Reuso de cache: si ya existe un `VTONJob` completado para el par `(outfitId, userImageHash)` en la sesión actual, **no se dispara** un nuevo `POST /vton/try-on` — se navega directo al resultado cacheado.

---

## 2. Contratos

### 2.1 Hook de creación de job (`src/features/vton/hooks/useCreateVtonJob.ts`)

```ts
interface UseCreateVtonJobResult {
  createJob: (userImage: File, outfitId: string) => void;
  status: 'idle' | 'pending' | 'error' | 'success';
  data: VtonJobCreateResponse | undefined;
  error: StyleMeError | undefined;
}
export function useCreateVtonJob(): UseCreateVtonJobResult;
```
Antes de invocar `createVtonJob` (spec 01 §2.4), consulta `checkCachedVtonResult(outfitId, userImageHash)` (§2.4) — si hay HIT, no ejecuta la mutación, expone `data` sintético apuntando al job cacheado.

**Protección contra doble-submit (hallazgo de auditoría, agosto 2026):** el CTA "Generar prueba virtual" (`UserPhotoCapture`, §2.5) SHALL deshabilitarse mientras `status === 'pending'`, evitando disparar dos `POST /vton/try-on` concurrentes por doble click. `POST /vton/try-on` es la mutación de mayor costo del sistema (inferencia GPU, `plan-base.md` §8) — recibe, como mínimo, la misma protección que ya es obligatoria para `AuthForm` (spec 06 §5).

### 2.2 Hook de polling (`src/features/vton/hooks/useVtonJobStatus.ts`) — núcleo de esta spec

```ts
interface UseVtonJobStatusOptions {
  jobId: string;
  timeoutMs?: number; // default 90_000
}

interface UseVtonJobStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  data: VtonJobStatusResponse | undefined;
  error: StyleMeError | undefined; // instancia de VtonJobTimeoutError cuando status === 'timeout'
}

export function useVtonJobStatus(opts: UseVtonJobStatusOptions): UseVtonJobStatusResult;
```

**Algoritmo de polling (obligatorio, cubierto por tests §4):**

```
intervalMs = 2000
elapsedMs = 0
attempt = 0

loop mientras status backend ∈ {pending, processing} Y elapsedMs < timeoutMs:
  si document.visibilityState !== 'visible': pausar (no incrementar elapsedMs)
  esperar intervalMs
  GET /vton/status/{jobId}
  elapsedMs += intervalMs
  attempt += 1
  intervalMs = min(intervalMs * 1.5, 8000)   // backoff exponencial suave, techo 8s

si elapsedMs >= timeoutMs Y status backend sigue en {pending, processing}:
  resultado local: status = 'timeout', error = VtonJobTimeoutError(jobId)
  (el job NO se cancela en backend — sigue corriendo; ver §2.3)

si status backend ∈ {completed, failed}:
  detener polling, exponer resultado final
```

Implementación técnica: `useQuery` de TanStack Query con `refetchInterval` calculado dinámicamente en cada tick (función, no valor fijo) que retorna `false` cuando el estado es terminal (`completed`/`failed`) o se alcanzó el timeout, deteniendo el polling nativamente.

### 2.3 Consulta manual post-timeout (`src/features/vton/hooks/useVtonJobStatus.ts`, mismo módulo)

```ts
export function useManualVtonStatusCheck(jobId: string): {
  check: () => void;
  data: VtonJobStatusResponse | undefined;
};
```
Usado en la UI de timeout (§3.2) para el botón "Verificar de nuevo" — un solo `GET`, sin reiniciar el loop automático.

### 2.4 Cache de reuso (`src/features/vton/lib/vtonResultCache.ts`)

```ts
export async function hashUserImage(file: File): Promise<string>; // SHA-256 vía SubtleCrypto sobre el contenido del archivo
export function checkCachedVtonResult(outfitId: string, userImageHash: string): VtonJobStatusResponse | undefined;
export function storeCachedVtonResult(outfitId: string, userImageHash: string, result: VtonJobStatusResponse): void;
```
Almacenamiento: `Map` en memoria respaldado por TanStack Query cache (clave `['vton', 'cache', outfitId, userImageHash]`) — vive solo durante la sesión del navegador, no se persiste (el backend es la fuente de verdad de caché a largo plazo, según `plan-base.md` §8).

### 2.5 Componentes

```ts
// src/features/vton/components/UserPhotoCapture.tsx
interface UserPhotoCaptureProps {
  onPhotoReady: (file: File) => void;
  isSubmitting: boolean; // true cuando useCreateVtonJob().status === 'pending' — deshabilita el CTA "Generar prueba virtual" (§2.1)
}
// Incluye: selector cámara/galería, overlay guía de encuadre (silueta), integra detectBlur

// src/features/vton/components/VtonProgressView.tsx
interface VtonProgressViewProps {
  jobId: string;
  estimatedTimeSeconds: number;
  onDismiss: () => void; // "seguir usando la app" — no cancela el polling, solo navega
}
// Accesibilidad: el contenedor del texto de fase ("Analizando tu pose...", etc.) lleva
// aria-live="polite" — cada cambio de fase debe anunciarse a lectores de pantalla sin
// requerir que el usuario esté enfocado en ese elemento (es contenido que cambia sin
// interacción directa del usuario, caso de uso canónico de aria-live)
// prefers-reduced-motion: la ilustración/animación decorativa de fase se omite cuando
// el sistema lo solicita — se conserva únicamente `Progress` (spec 00 §2.4) con
// aria-valuetext y el texto de fase, sin la animación (hallazgo de auditoría, agosto 2026)

// src/features/vton/components/VtonResultView.tsx
interface VtonResultViewProps {
  originalPhotoUrl: string;
  resultUrl: string;
}
// Slider comparación before/after. Accesibilidad: cada imagen expone un `alt` no vacío
// y distinguible entre sí (ej. "Foto original del usuario" / "Resultado con el outfit
// {estética} aplicado") — es la pantalla de mayor peso visual del producto, nunca alt=""

// src/features/vton/components/VtonFailedView.tsx
interface VtonFailedViewProps {
  errorMessage: string | null; // de VtonJobStatusResponse.error_message
  onRetry: () => void;
  onChangePhoto: () => void;
}

// src/features/vton/components/VtonTimeoutView.tsx
interface VtonTimeoutViewProps {
  jobId: string;
  onManualCheck: () => void;
}
```

---

## 3. Flujo de Datos Interno

### 3.1 Secuencia — Setup y creación de job

```
/try-on?outfitId=X monta
        │
        v
UserPhotoCapture: usuario toma/selecciona foto
        │
        v
detectBlur(file) ──► warning inline si aplica (no bloqueante, spec 02 §2.2)
        │
        v  onPhotoReady(file)
        v
hashUserImage(file) ──► checkCachedVtonResult(outfitId, hash)
        │
        ├─ HIT ──► router.push(`/try-on/jobs/${cachedJobId}`)  [salta Etapa 2, va directo a 3a]
        │
        └─ MISS
                v
        useCreateVtonJob().createJob(file, outfitId)
                │
                ├─ error ──► banner de error inline, permite reintentar sin perder la foto
                │
                └─ success: { job_id, estimated_time_seconds }
                        └─► router.push(`/try-on/jobs/${job_id}`)
```

### 3.2 Secuencia — Polling y resolución (Etapa 2 y 3)

```
/try-on/jobs/[jobId] monta
        │
        v
useVtonJobStatus({ jobId })
        │
        ├─ status: 'pending' | 'processing'
        │       └─► VtonProgressView (texto dinámico por fase estimada,
        │            ProgressBar indeterminado, botón "seguir usando la app")
        │            onDismiss ──► router.push('/wardrobe' o última ruta) —
        │            el hook sigue montado/activo vía QueryClient en background
        │            si el componente se desmonta, TanStack Query mantiene el
        │            refetch programado mientras el queryKey siga "observado"
        │            (se resuelve manteniendo una suscripción ligera a nivel
        │            de layout/provider, no solo en el componente de la página)
        │
        ├─ status: 'completed'
        │       └─► storeCachedVtonResult(...) ──► VtonResultView
        │
        ├─ status: 'failed'
        │       └─► VtonFailedView (error_message del backend si existe,
        │            fallback a copy genérico si es null)
        │
        └─ status: 'timeout' (local, ver §2.2)
                └─► VtonTimeoutView ──► botón "Verificar de nuevo"
                     ──► useManualVtonStatusCheck(jobId).check()
                          ├─ ahora completed/failed ──► render correspondiente
                          └─ sigue pending/processing ──► mensaje "aún procesando,
                             puedes revisar más tarde en tu historial"
                             + link a /try-on/history
```

### 3.3 Tabla de Estados Finitos — Flujo VTON completo

Formaliza §3.1 y §3.2 como una única máquina de estados de extremo a extremo (implementación de referencia, no solo prosa):

| Estado | Entrada que dispara la transición | Siguiente estado | Notas |
| :--- | :--- | :--- | :--- |
| `setup` | Montaje de `/try-on` con `outfitId` válido en query params | `photo-ready` (tras `onPhotoReady`) | Si `outfitId` falta/inválido → redirect a `/outfits` |
| `photo-ready` | Foto capturada, `detectBlur` evaluado | `checking-cache` | Blur warning no bloquea la transición (spec 02 §2.2) |
| `checking-cache` | `hashUserImage` + `checkCachedVtonResult` resuelven | `cache-hit` \| `creating-job` | Síncrono, sin estado visible propio (transición inmediata) |
| `cache-hit` | Resultado ya existente para `(outfitId, hash)` | `resolved-completed` | Salta directo a Etapa 3, sin `POST /vton/try-on` |
| `creating-job` | `useCreateVtonJob().createJob` invocado | `polling` \| `create-error` | `POST /vton/try-on` (spec 01) |
| `create-error` | Mutación de creación falla | `photo-ready` (tras reintento) | La foto ya capturada NO se pierde al reintentar |
| `polling` | Job creado, `useVtonJobStatus` activo | `resolved-completed` \| `resolved-failed` \| `polling-timeout` | Ver algoritmo de backoff en §2.2 |
| `polling-timeout` | `elapsedMs >= timeoutMs` sin estado terminal | `polling` (tras verificación manual exitosa) \| permanece | El job sigue vivo en backend — este estado es puramente de presentación |
| `resolved-completed` | `status: 'completed'` recibido | Terminal | Se cachea vía `storeCachedVtonResult` |
| `resolved-failed` | `status: 'failed'` recibido | `photo-ready` (tras "Reintentar") \| `setup` (tras "Elegir otra foto") | — |

Invariante a testear: desde `polling-timeout`, el único camino de regreso a `polling` es una verificación manual (§2.3) que confirma que el job sigue activo — nunca se reinicia el timer de 90s automáticamente sin acción explícita del usuario.

### 3.4 `/try-on/history`

```
GET (listado de VTONJob del usuario, ver gap §6)
        │
        ├─ vacío ──► EmptyState ("aún no has probado ningún outfit")
        └─ con items ──► grid de resultados completed, cada uno con
                          "Probar otro outfit con esta foto"
                          ──► precarga userImage (de la referencia guardada)
                          y navega a /outfits con acción contextual
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest, fake timers obligatorio para todo lo relacionado a polling):**
- Algoritmo de backoff: dado una secuencia de respuestas `processing`, verificar que los intervalos entre llamadas siguen `2000 → 3000 → 4500 → 6750 → 8000 (techo) → 8000...` (tolerancia de test sobre el redondeo).
- Timeout: con `timeoutMs: 10000` y el mock respondiendo siempre `processing`, verificar que tras 10s el hook expone `status: 'timeout'` y `error instanceof VtonJobTimeoutError`, y que **no** se realiza ninguna llamada adicional después de eso salvo `useManualVtonStatusCheck`.
- Pausa por visibilidad: simular `visibilitychange` a `hidden` a mitad de un intervalo → verificar que no se cuenta tiempo transcurrido hasta volver a `visible`.
- `hashUserImage`: mismo archivo (mismos bytes) produce el mismo hash en dos invocaciones; archivos distintos producen hashes distintos.
- `checkCachedVtonResult`/`storeCachedVtonResult`: roundtrip correcto, y aislamiento por combinación `(outfitId, hash)` — no hay colisión cruzada entre outfits distintos con la misma foto.

**Integración (Vitest + RTL + MSW):**
- Flujo feliz: MSW responde `processing` una vez, luego `completed` con `result_url` → `VtonProgressView` seguido de `VtonResultView`, sin pasos manuales del usuario.
- Flujo fallido: MSW responde `failed` con `error_message` → `VtonFailedView` muestra ese mensaje textual exacto.
- Flujo fallido sin `error_message` (null): `VtonFailedView` muestra copy genérico de fallback, no `"null"` ni `undefined` en pantalla.
- Flujo timeout: MSW responde `processing` indefinidamente, `timeoutMs` reducido en el test (ej. 3s) → `VtonTimeoutView` aparece, click en "Verificar de nuevo" dispara exactamente un `GET` adicional.
- Reuso de cache: crear job para `(outfitId=A, foto=F)`, completarlo; segunda invocación con el mismo par → `useCreateVtonJob` NO llama a `createVtonJob` (aserción sobre contador de llamadas MSW = 0 para ese endpoint en la segunda pasada), navega directo con los datos cacheados.
- `UserPhotoCapture`: integra `detectBlur` igual que `GarmentAnalysisResult` (spec 02) — mismo comportamiento no bloqueante verificado aquí en el contexto de VTON.
- Doble-submit: doble click en "Generar prueba virtual" antes de que la primera respuesta resuelva → exactamente una llamada a `createVtonJob` (aserción de contador MSW = 1), CTA deshabilitado mientras `status === 'pending'`.
- `VtonResultView`: `originalPhotoUrl` y `resultUrl` renderizan con `alt` no vacío y distinguible entre sí.
- `VtonProgressView` con `prefers-reduced-motion: reduce` simulado: la ilustración/animación decorativa no se renderiza, `Progress` y el texto de fase permanecen.

**E2E (Playwright):**
- Flujo completo feliz: desde `/outfits/[id]` → "Probar este outfit" → captura de foto (fixture) → progreso → resultado, con MSW o backend de staging mockeado a nivel de red de Playwright.
- Verificar que navegar fuera de `/try-on/jobs/[jobId]` durante `processing` y volver a entrar (o revisar `/try-on/history`) refleja el estado actualizado sin perder el `job_id`.

---

## 5. Criterios de Aceptación

- [ ] `useVtonJobStatus` implementa exactamente el algoritmo de backoff/timeout de §2.2, cubierto por tests con fake timers.
- [ ] `VtonJobTimeoutError` se lanza únicamente tras alcanzar `timeoutMs` con el job aún no terminal, y **nunca** cancela el job en backend (no se llama a ningún endpoint de cancelación — no existe en `plan-base.md` §11).
- [ ] Polling se pausa/reanuda correctamente según `document.visibilityState`.
- [ ] `checkCachedVtonResult` evita una llamada de red duplicada para el mismo par `(outfit, foto)` en la misma sesión — verificado con aserción de contador de llamadas MSW.
- [ ] `VtonFailedView` maneja tanto `error_message` presente como `null` sin mostrar texto roto.
- [ ] `VtonTimeoutView` ofrece verificación manual sin reiniciar el loop automático de polling.
- [ ] `UserPhotoCapture` reutiliza `detectBlur` de spec 02 (sin duplicar la heurística de blur en dos lugares del código).
- [ ] Botón "seguir usando la app" navega sin interrumpir el polling en curso (verificado en integración: el resultado sigue resolviéndose y se refleja al volver a `/try-on/jobs/[jobId]` o notificarse).
- [ ] El CTA "Generar prueba virtual" se deshabilita durante `status === 'pending'` de `useCreateVtonJob`, evitando doble-submit — verificado por test con aserción de contador de llamadas MSW.
- [ ] `VtonResultView` expone `alt` no vacío y distinguible en ambas imágenes (original/resultado), verificado por test.
- [ ] `VtonProgressView` respeta `prefers-reduced-motion`, verificado por test.
- [ ] Cobertura de tests ≥ 85% en `src/features/vton/` (es el módulo de mayor riesgo de UX del producto).
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Gap Explícito

`plan-base.md` §11 no define un endpoint de **listado** de `VTONJob` por usuario, necesario para `/try-on/history` (mismo tipo de gap que en spec 02 §6 y spec 03 §6). Se desarrolla contra mocks MSW documentados como tales; la conexión real queda bloqueada hasta confirmación de `GET /api/v1/vton/jobs?user_id=` (o equivalente) con el backend.

Adicionalmente: el documento base no define un endpoint de **cancelación** de `VTONJob`. Por diseño, esta spec asume que un job iniciado no puede cancelarse desde el frontend — el timeout de UI (§2.2) es puramente una decisión de presentación local, nunca una operación de backend.

**Ver `specs/08-api-contract-gaps.md` (G3)** para el estado consolidado del gap de listado. El gap de licenciamiento del proveedor de inferencia VTON (IDM-VTON/OOTDiffusion vía Replicate — modelos con licencia no comercial, hallazgo de auditoría agosto 2026) está documentado como riesgo de producto en `.speckit/.../constitution.md` §7 y `docs/context/plan-base.md` §8 — no es un gap de contrato de API, pero condiciona si `/try-on` es una feature permanente o un prototipo con alcance no comercial; se referencia aquí porque toda esta spec depende de la resolución de ese riesgo antes de Fase 3.

---

## 7. Manifiesto de Archivos

```
src/features/vton/hooks/useCreateVtonJob.ts
src/features/vton/hooks/useVtonJobStatus.ts
src/features/vton/hooks/useManualVtonStatusCheck.ts
src/features/vton/lib/vtonResultCache.ts
src/features/vton/lib/vtonPollingBackoff.ts
src/features/vton/components/UserPhotoCapture.tsx
src/features/vton/components/VtonProgressView.tsx
src/features/vton/components/VtonResultView.tsx
src/features/vton/components/VtonFailedView.tsx
src/features/vton/components/VtonTimeoutView.tsx
src/app/try-on/page.tsx
src/app/try-on/jobs/[jobId]/page.tsx
src/app/try-on/history/page.tsx
tests/unit/features/vton/vtonPollingBackoff.test.ts
tests/unit/features/vton/vtonResultCache.test.ts
tests/integration/vton/useVtonJobStatus.test.tsx
tests/integration/vton/UserPhotoCapture.test.tsx
tests/integration/vton/VtonResultView.test.tsx
tests/integration/vton/VtonFailedView.test.tsx
tests/integration/vton/VtonTimeoutView.test.tsx
tests/e2e/vton.spec.ts
```
