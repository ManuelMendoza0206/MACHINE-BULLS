# Spec 01 — API Client, Error Hierarchy & Zod Schemas

**Estado:** Draft para implementación · **Depende de:** ninguna · **Consumido por:** specs 02, 03, 04

Deriva de `docs/base-plan.MD` §11 (contratos REST), `docs/frontend-plan.md` §6 (mapeo de integraciones) y `CLAUDE.md` §2.1, §5. Es la única capa autorizada a hacer `fetch` en todo el proyecto — ningún componente o hook de las specs 02-04 debe importar `fetch` directamente.

---

## 1. Propósito y SLA

**Propósito:** encapsular toda comunicación HTTP con el backend en un cliente único y tipado, garantizar que ninguna respuesta cruza al código de aplicación sin pasar por su schema Zod, y traducir cualquier fallo (red, HTTP, validación) a una subclase de `StyleMeError`.

**SLA de rendimiento (timeouts cliente, `frontend-plan.md` §6):**

| Endpoint | Timeout cliente | Reintentos automáticos |
| :--- | :--- | :--- |
| `POST /garments/upload` | 20s | No (mutación, evitar duplicar side-effects) |
| `POST /outfits/recommend` | 10s | No |
| `POST /vton/try-on` | 10s | No |
| `GET /vton/status/{job_id}` | 5s por intento | Sí — vía polling controlado (spec 04), no vía retry del cliente HTTP |

---

## 2. Contratos

### 2.1 Jerarquía de errores (`src/lib/errors.ts`)

```ts
export abstract class StyleMeError extends Error {
  abstract readonly code: string;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApiError extends StyleMeError {
  readonly code = 'API_ERROR';
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
    cause?: unknown,
  ) { super(message, cause); }
}

export class ValidationError extends StyleMeError {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string, readonly issues: z.ZodIssue[], cause?: unknown) {
    super(message, cause);
  }
}

export class NetworkError extends StyleMeError {
  readonly code = 'NETWORK_ERROR';
}

export class VtonJobTimeoutError extends StyleMeError {
  readonly code = 'VTON_JOB_TIMEOUT';
  constructor(message: string, readonly jobId: string, cause?: unknown) {
    super(message, cause);
  }
}
```

Regla: `VtonJobTimeoutError` se define aquí (capa de errores compartida) pero solo se **lanza** desde el hook de polling en spec 04.

### 2.2 Cliente HTTP base (`src/lib/api/client.ts`)

```ts
interface RequestConfig {
  path: string;
  method: 'GET' | 'POST';
  body?: FormData | Record<string, unknown>;
  timeoutMs: number;
  signal?: AbortSignal;
}

async function apiRequest<T>(
  config: RequestConfig,
  schema: z.ZodType<T>,
): Promise<T>;
```

Comportamiento obligatorio:
1. Construye la URL desde `process.env.NEXT_PUBLIC_API_BASE_URL` + `config.path`. Falla en build/arranque (no en runtime silencioso) si la env var no está definida.
2. Aplica `AbortController` con `config.timeoutMs`; si el `signal` externo (ej. desmontaje de componente) se dispara primero, se respeta ese.
3. Si `body` es `Record<string, unknown>`, serializa como JSON con header `Content-Type: application/json`; si es `FormData`, la deja pasar sin header manual (el navegador fija el boundary).
4. Respuesta no-`2xx` → lanza `ApiError(message, response.status, parsedBodyIfJson)`.
5. Fallo de red (`fetch` rechaza, `TypeError`) → lanza `NetworkError`.
6. Timeout (`AbortError` por el controller propio) → lanza `NetworkError` con mensaje distinguible ("timeout").
7. Respuesta `2xx` → `schema.safeParse(json)`; si falla, lanza `ValidationError` con los `issues` de Zod — **nunca** se devuelve el dato sin validar.

### 2.3 Zod Schemas (`src/schemas/api/`)

Derivados campo por campo de `base-plan.MD` §11. Donde el documento base no fija un enum cerrado, se usa `z.string()` con comentario explícito — **no se inventan valores de enum no confirmados por el backend** (regla de `CLAUDE.md` §8).

```ts
// src/schemas/api/garments.ts
export const AestheticScoreSchema = z.object({
  aesthetic: z.string(),      // ej. "old_money", "streetwear" — valores exactos: TBD por backend
  confidence: z.number().min(0).max(1),
});

export const DominantColorSchema = z.object({
  h: z.number().min(0).max(360),
  s: z.number().min(0).max(100),
  v: z.number().min(0).max(100),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const GarmentUploadResponseSchema = z.object({
  garment_id: z.string().uuid(),
  category: z.string(), // categoría funcional cruda del backend — ver nota abajo
  top_aesthetics: z.array(AestheticScoreSchema).min(1),
  dominant_colors: z.array(DominantColorSchema).min(1),
  processed_image_url: z.string().url(),
});
export type GarmentUploadResponse = z.infer<typeof GarmentUploadResponseSchema>;
```

> **Nota [gap, ver `frontend-plan.md` §6]:** `category` se tipa como `z.string()` en vez de `z.enum([...])` deliberadamente. El documento base menciona ejemplos ("Camisa, Pantalón, Calzado") sin listar el enum completo. Cerrar este enum prematuramente rompería el parseo ante cualquier valor real del backend no anticipado. **Acción de seguimiento:** reemplazar por `z.enum` en cuanto el backend publique su schema/OpenAPI — issue explícito, no silencioso.

```ts
// src/schemas/api/outfits.ts
export const OutfitPositionSchema = z.enum(['top', 'bottom', 'footwear', 'outerwear']); // cerrado: enum explícito en base-plan.MD §10.1

export const OutfitGarmentRefSchema = z.object({
  garment_id: z.string().uuid(),
  position: OutfitPositionSchema,
});

export const OutfitSchema = z.object({
  outfit_id: z.string().uuid(),
  aesthetic: z.string(),
  garments: z.array(OutfitGarmentRefSchema).min(1),
  chromatic_score: z.number().min(0).max(1),
  embedding_score: z.number().min(0).max(1),
});

export const OutfitRecommendationResponseSchema = z.object({
  outfits: z.array(OutfitSchema),
});
export type OutfitRecommendationResponse = z.infer<typeof OutfitRecommendationResponseSchema>;

export const OutfitRecommendRequestSchema = z.object({
  user_id: z.string().uuid(),
  target_aesthetic: z.string().optional(),
  available_garment_ids: z.array(z.string().uuid()).optional(),
});
export type OutfitRecommendRequest = z.infer<typeof OutfitRecommendRequestSchema>;
```

```ts
// src/schemas/api/vton.ts
export const VtonJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']); // cerrado: enum explícito en base-plan.MD §10.1

export const VtonJobCreateResponseSchema = z.object({
  job_id: z.string().uuid(),
  status: z.literal('processing'),
  estimated_time_seconds: z.number().positive(),
});
export type VtonJobCreateResponse = z.infer<typeof VtonJobCreateResponseSchema>;

export const VtonJobStatusResponseSchema = z.object({
  job_id: z.string().uuid(),
  status: VtonJobStatusSchema,
  result_url: z.string().url().nullable().optional(),
  error_message: z.string().nullable().optional(),
});
export type VtonJobStatusResponse = z.infer<typeof VtonJobStatusResponseSchema>;
```

### 2.4 Funciones de API por dominio (consumidas por hooks en specs 02-04)

```ts
// src/features/garments/api/uploadGarment.ts
export function uploadGarment(file: File, signal?: AbortSignal): Promise<GarmentUploadResponse>;

// src/features/outfits/api/recommendOutfits.ts
export function recommendOutfits(req: OutfitRecommendRequest, signal?: AbortSignal): Promise<OutfitRecommendationResponse>;

// src/features/vton/api/createVtonJob.ts
export function createVtonJob(userImage: File, outfitId: string, signal?: AbortSignal): Promise<VtonJobCreateResponse>;

// src/features/vton/api/getVtonJobStatus.ts
export function getVtonJobStatus(jobId: string, signal?: AbortSignal): Promise<VtonJobStatusResponse>;
```

Cada función es un wrapper delgado sobre `apiRequest` + su schema — sin lógica de negocio (eso vive en los hooks de cada feature spec).

### 2.5 Ejemplos de Payload (JSON) — fixtures de referencia

Usados como fixtures literales en los tests de §4 y en los handlers MSW de todas las specs consumidoras. Cualquier fixture de test debe derivar de estos, no inventar shapes alternativos.

```json
// GarmentUploadResponseSchema — POST /api/v1/garments/upload
{
  "garment_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "category": "shirt",
  "top_aesthetics": [
    { "aesthetic": "old_money", "confidence": 0.81 },
    { "aesthetic": "quiet_luxury", "confidence": 0.64 },
    { "aesthetic": "starboy", "confidence": 0.22 }
  ],
  "dominant_colors": [
    { "h": 210, "s": 15, "v": 92, "hex": "#E8ECF1" }
  ],
  "processed_image_url": "https://cdn.styleme.app/garments/3fa85f64.../processed.webp"
}
```

```json
// OutfitRecommendationResponseSchema — POST /api/v1/outfits/recommend
{
  "outfits": [
    {
      "outfit_id": "8c7f8b1a-...",
      "aesthetic": "old_money",
      "chromatic_score": 0.92,
      "embedding_score": 0.87,
      "garments": [
        { "garment_id": "3fa85f64-...", "position": "top" },
        { "garment_id": "9b1deb4d-...", "position": "bottom" },
        { "garment_id": "1a2b3c4d-...", "position": "footwear" }
      ]
    }
  ]
}
```

```json
// VtonJobCreateResponseSchema — POST /api/v1/vton/try-on
{ "job_id": "5d8f1e2a-...", "status": "processing", "estimated_time_seconds": 12 }
```

```json
// VtonJobStatusResponseSchema — GET /api/v1/vton/status/{job_id}
// Estado en curso:
{ "job_id": "5d8f1e2a-...", "status": "processing", "result_url": null, "error_message": null }
// Estado completado:
{ "job_id": "5d8f1e2a-...", "status": "completed", "result_url": "https://cdn.styleme.app/vton/5d8f1e2a.../result.webp", "error_message": null }
// Estado fallido:
{ "job_id": "5d8f1e2a-...", "status": "failed", "result_url": null, "error_message": "No se detectó una pose corporal válida en la imagen." }
```

### 2.6 Mapeo de Códigos de Estado HTTP → `ApiError`

| Status | Escenario típico | Tratamiento esperado en el hook consumidor |
| :--- | :--- | :--- |
| `400` | Payload malformado (no debería ocurrir si el frontend valida antes de enviar, pero se maneja igual) | Mensaje genérico "Solicitud inválida", log en desarrollo |
| `401`/`403` | Sesión expirada o sin permiso (relevante una vez integrada spec 06) | Redirección a `/login`, no un toast de error genérico |
| `404` | Recurso no encontrado (ej. `job_id` inexistente) | Mensaje específico por contexto (spec 04: "No encontramos ese trabajo") |
| `422` | Validación de negocio del backend (ej. imagen rechazada por baja calidad) | Mensaje del `responseBody` si el backend provee uno legible, fallback genérico si no |
| `429` | Rate limiting | "Demasiadas solicitudes, espera un momento" — sin reintento automático (fuera de alcance de esta spec) |
| `500`/`502`/`503` | Error de servidor | Mensaje genérico + opción de reintento manual, nunca se expone el detalle técnico al usuario final |

---

## 3. Flujo de Datos Interno

```
Componente/Hook (feature/*)
        │  llama función de dominio (ej. uploadGarment(file))
        v
apiRequest<T>({ path, method, body, timeoutMs }, Schema)
        │
        ├─ construye Request + AbortController(timeoutMs)
        v
     fetch()
        │
        ├── network fail / TypeError ──────────────► NetworkError ──► throw
        ├── AbortError (timeout) ───────────────────► NetworkError ──► throw
        ├── status no-2xx ──────────────────────────► ApiError ──────► throw
        └── status 2xx
                │
                v
        Schema.safeParse(json)
                │
                ├── success: false ─────────────────► ValidationError ──► throw
                └── success: true ──► return data (tipado T, garantizado válido)
```

Todo caller (hooks de TanStack Query en specs 02-04) recibe siempre **o bien** un valor ya validado y tipado, **o bien** una excepción que es instancia de `StyleMeError` — nunca un tercer caso ambiguo.

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest) — Schemas:**
- Cada schema: caso nominal (payload válido completo) → `safeParse` exitoso.
- Cada schema: caso de campo faltante requerido → `safeParse` falla con `issues` no vacío.
- Cada schema: caso de tipo incorrecto (ej. `confidence: "alta"` en vez de número) → falla.
- `VtonJobStatusResponseSchema`: `result_url` ausente cuando `status: "processing"` → válido (es `optional`); `status: "completed"` sin `result_url` → **este caso debe documentarse como válido a nivel schema** (Zod no puede expresar "requerido condicionalmente" sin `.refine`) — se agrega `.refine()` que exige `result_url` no nulo cuando `status === 'completed'`, con test explícito para ese refine.

**Unitarias (Vitest) — Cliente HTTP (con `msw` interceptando `fetch`):**
- 200 con body válido → resuelve con dato tipado.
- 200 con body inválido (falta campo) → rechaza con `ValidationError`.
- 404/500 → rechaza con `ApiError` y `status` correcto.
- Servidor no responde dentro de `timeoutMs` (MSW con delay artificial) → rechaza con `NetworkError`.
- Handler de MSW que simula `fetch` rechazando (offline) → rechaza con `NetworkError`.
- `FormData` como body → verificar que el header `Content-Type` NO se fija manualmente (regresión: fijarlo manualmente rompe el `boundary` de multipart).

**Integración:**
- Las 4 funciones de dominio (§2.4) contra sus respectivos handlers MSW (`tests/fixtures/msw/handlers.ts`), verificando que la forma exacta de §11 del documento base se acepta.

---

## 5. Criterios de Aceptación

- [ ] `apiRequest<T>` implementado en `src/lib/api/client.ts` cumpliendo los 7 puntos de comportamiento de §2.2.
- [ ] Jerarquía de errores de §2.1 implementada exactamente como en `CLAUDE.md` §5 (mismas 5 clases, mismos nombres).
- [ ] Los 4 schemas de §2.3 existen, tipados sin `any`, exportando su `z.infer` correspondiente.
- [ ] `category` (Garment) y `aesthetic` (Outfit) permanecen como `z.string()` con el comentario de gap explícito — no se cierra el enum sin confirmación backend.
- [ ] `OutfitPositionSchema` y `VtonJobStatusSchema` son `z.enum` cerrados (estos sí están explícitos en `base-plan.MD` §10.1).
- [ ] `VtonJobStatusResponseSchema` tiene un `.refine()` probado que exige `result_url` cuando `status === 'completed'`.
- [ ] Las 4 funciones de dominio de §2.4 implementadas, sin lógica más allá de invocar `apiRequest`.
- [ ] Cobertura de tests ≥ 90% para `src/lib/api/`, `src/lib/errors.ts` y `src/schemas/api/` (módulos críticos de integridad de datos).
- [ ] Los fixtures JSON de §2.5 son la única fuente de datos de prueba reutilizada entre specs (sin duplicados divergentes en `tests/fixtures/` de otras specs).
- [ ] El mapeo de §2.6 está implementado como una función pura testeable (`mapStatusToUserMessage(status, body)`), no como `if/else` disperso en componentes.
- [ ] `npm run typecheck && npm run lint && npm run test` pasan en verde.

---

## 6. Manifiesto de Archivos

```
src/lib/errors.ts
src/lib/api/client.ts
src/lib/api/mapStatusToUserMessage.ts
src/schemas/api/garments.ts
src/schemas/api/outfits.ts
src/schemas/api/vton.ts
src/features/garments/api/uploadGarment.ts
src/features/outfits/api/recommendOutfits.ts
src/features/vton/api/createVtonJob.ts
src/features/vton/api/getVtonJobStatus.ts
tests/fixtures/api/garmentUploadResponse.json
tests/fixtures/api/outfitRecommendationResponse.json
tests/fixtures/api/vtonJobCreateResponse.json
tests/fixtures/api/vtonJobStatusResponse.json
tests/fixtures/msw/handlers.ts
tests/unit/schemas/garments.test.ts
tests/unit/schemas/outfits.test.ts
tests/unit/schemas/vton.test.ts
tests/unit/lib/api/client.test.ts
tests/unit/lib/api/mapStatusToUserMessage.test.ts
tests/unit/lib/errors.test.ts
```
