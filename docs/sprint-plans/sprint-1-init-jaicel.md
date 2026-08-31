# Sprint 1 — Prompt de Inicialización | Asiento B (Jaicel)

**Rol:** Feature Support — Frontend API Client + Backend Domain Layer (Parte 1)  
**Duración:** 26 ago - 8 sep 2026 (14 días)  
**Epics:** frontend/api-client-and-schemas (F3), frontend/landing-and-auth-flow (F4), backend/domain-and-database (B1)  
**16 tareas** | SP estimado: ~45-55  
**Contexto:** Contrato frontera entre frontend y backend. Sin esto, no hay comunicación de datos. Auth es la tarea de mayor riesgo de seguridad.

---

## Objetivo de Sprint

Establecer **contrato de datos robusto y autenticación segura**, entregando:
- Schemas Zod tipados al máximo (cero `any`)
- Cliente API con manejo de errores estandarizado
- Modelos de base de datos (6 tablas SQLAlchemy) y migraciones Alembic
- Trigger de sync de usuarios (Supabase auth → DB)
- Auth flow (sign up, sign in, sign out) con todos los edge cases de seguridad

**Success Criteria (DoD):**
- ✅ Todos los 16 tests de esta tarea pasan (green en `npm run test` + `pytest`)
- ✅ Schemas Zod exportan tipos sin `any`
- ✅ Modelos SQLAlchemy coinciden 1:1 con Zod schemas (sin columnas divergentes)
- ✅ Migraciones Alembic upgrade/downgrade simétricas
- ✅ Trigger `on_auth_user_created` ejecutado y validado
- ✅ Auth endpoints (`signUpWithEmail`, `signInWithEmail`, `signOut`) lanzan `ApiError` (nunca error crudo de Supabase)
- ✅ Cobertura ≥90% en api-client y domain layer
- ✅ E2E tests validan auth flow completo (signup → login → logout)

---

## Tareas por Orden de Ejecución

### Fase 1: Schemas & Tipos (días 1-3)

**1. Los 4 Schemas Zod (BLOCKER para frontend)**
- ID: `86e301dec`
- **Tarea:** Crear `src/schemas/index.ts` con 4 schemas según spec 2.3:
  - `GarmentSchema` (con `category: z.string()`)
  - `OutfitSchema` (con `aesthetic: z.string()`)
  - `VtonJobSchema` (con status enum, no string)
  - `UserSchema` (campos de Supabase + locales)
- **Aceptación:**
  - `z.infer<typeof GarmentSchema>` exporta tipo `Garment`
  - Cero `any` — todos los tipos son concretos
  - `npm run typecheck` sin errores
  - Cada schema tiene comentarios JSDoc explicando campos opcionales/requeridos
  - Test: import cada schema, `z.parse()` con fixture válida y esperar que no lance
- **Ref spec:** api-client-and-schemas/spec.md §2.3
- **Dependencia de:** Nada (inicio)
- **Duración estimada:** 1 día

**2. Enums Cerrados (OutfitPosition, VtonJobStatus) (días 1-2)**
- ID: `86e301dem`
- **Tarea:** `OutfitPositionSchema` y `VtonJobStatusSchema` son `z.enum()` (no `z.string()`). Valores: OutfitPosition = [body, legs, torso, accessory], VtonJobStatus = [pending, processing, completed, failed].
- **Aceptación:**
  - `z.enum(['pending', 'processing', 'completed', 'failed'])` — lista exhaustiva
  - Test: intentar parsear valor no en enum → should throw `ZodError`
  - TypeScript autocomplete funciona (enum values sugeridas)
  - Backend Pydantic tiene enums correspondientes con **idénticos valores**
- **Ref spec:** api-client-and-schemas/spec.md §2.3
- **Dependencia de:** Tarea 1
- **Duración estimada:** 1 día

**3. Validación Condicional (.refine()) (días 2-3)**
- ID: `86e301deq`
- **Tarea:** `VtonJobStatusResponseSchema` tiene `.refine()` que valida: si `status === 'completed'`, entonces `result` debe ser presente y no nulo.
- **Aceptación:**
  - Schema: `VtonJobResponseSchema.refine(data => data.status !== 'completed' || (data.result !== null && data.result !== undefined))`
  - Test 1: `{ status: 'completed', result: null }` → should throw
  - Test 2: `{ status: 'completed', result: { imageUrl: '...' } }` → should pass
  - Test 3: `{ status: 'pending', result: null }` → should pass (pending puede no tener result)
- **Ref spec:** api-client-and-schemas/spec.md §2.3
- **Dependencia de:** Tarea 1
- **Duración estimada:** 0.5 días

**4. Strings Abiertos con Documentación (días 2-3)**
- ID: `86e301dee`
- **Tarea:** `category` (Garment) y `aesthetic` (Outfit) permanecen como `z.string()` (no enum). Pero documentar valores válidos en spec o JSDoc.
- **Aceptación:**
  - Schema: `GarmentSchema.shape.category: z.string().describe('Valores válidos: "shirt", "pants", "jacket", ...')`
  - Test fixtures incluyen lista de valores válidos para referencia
  - Backend schema tiene `.description()` equivalente
  - No hay validación de lista (permite valores nuevos)
- **Ref spec:** api-client-and-schemas/spec.md §2.3
- **Dependencia de:** Tarea 1
- **Duración estimada:** 0.5 días

### Fase 2: Cliente API (días 3-5)

**5. Jerarquía de Errores (BLOCKER para auth)**
- ID: `86e301dea`
- **Tarea:** Implementar error hierarchy en `src/lib/errors.ts` según `CLAUDE.md` §3.3:
  - `ApiError` (base class)
  - `DataValidationError` → 422
  - `ResourceNotFoundError` → 404
  - `ModelInferenceError` → 500
  - `AuthenticationError` → 401
  - `UnauthorizedError` → 403
- **Aceptación:**
  - Cada error extiende `ApiError`
  - Constructor: `new DataValidationError('campos inválidos', { fields: [...] })`
  - Propiedad `statusCode` derivada automáticamente
  - Test: lanzar cada error, capturar, verificar status correcto
  - No hay `instanceof` crudo — usar `error instanceof ApiError`
- **Ref spec:** api-client-and-schemas/spec.md §2.1, CLAUDE.md §3.3
- **Dependencia de:** Nada
- **Duración estimada:** 1 día

**6. Cliente API Request (días 3-5)**
- ID: `86e301de7`
- **Tarea:** Implementar `apiRequest<T>()` en `src/lib/api/client.ts` cumpliendo los 7 puntos de §2.2:
  1. Parámetros: `url, method, body?, options?` con timeout por defecto 10s
  2. Valida respuesta contra schema Zod pasado
  3. Mapea status HTTP → subclase de ApiError (422→DataValidationError, 404→ResourceNotFoundError, etc)
  4. Retry automático con exponential backoff (máx 3 veces) en 5xx
  5. Aborta si timeout (lanza `ApiError` con código específico)
  6. Loguea (Sentry) errores 4xx/5xx automáticamente
  7. Agrega headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Aceptación:**
  - Función signature: `async function apiRequest<T>(url: string, method: 'GET'|'POST'|..., body?: object, options?: ApiRequestOptions): Promise<T>`
  - Test 1: request exitoso → retorna data parseada contra schema
  - Test 2: response con 422 → lanza `DataValidationError` (no error crudo del fetch)
  - Test 3: timeout (simular con fake timers) → lanza `ApiError` timeout
  - Test 4: 5xx → reintenta 3 veces, si sigue fallando → lanza
  - Test 5: header `Authorization` está presente si `window.getAuthToken()` retorna token
  - Cobertura ≥90%
- **Ref spec:** api-client-and-schemas/spec.md §2.2
- **Dependencia de:** Tareas 1, 5
- **Duración estimada:** 2 días

**7. Fixtures JSON Reutilizables (días 3-5)**
- ID: `86e301dex`
- **Tarea:** Crear `tests/fixtures/` con 1 JSON por schema (garment.json, outfit.json, vtonJob.json, user.json). Usar en unit tests + E2E tests (MSW mocks usan estos mismos fixtures).
- **Aceptación:**
  - `tests/fixtures/garment.json` contiene 3 variantes (válida, sin campo opcional, valores edge)
  - `tests/fixtures/outfit.json` contiene 2 variantes
  - No hay fixtures duplicados en unit tests (import desde fixtures/, no copia-pega)
  - MSW mock handlers en `tests/mocks/handlers.ts` importan los mismos fixtures
  - Test: `import fixture from '../fixtures/garment.json'` → parse contra schema → no error
- **Ref spec:** api-client-and-schemas/spec.md §2.5
- **Dependencia de:** Tareas 1-4
- **Duración estimada:** 1 día

### Fase 3: Auth Flow (días 6-10)

**8. Sign Up Endpoint (días 6-7)**
- ID: `86e301dnp`
- **Tarea:** Endpoint frontend `POST /auth/signup` que:
  - Valida email/password contra schema
  - Llama a Supabase `auth.signUp()`
  - **Si error:** mapea código Supabase a `ApiError` subclase (ej: `auth/user-already-registered` → `DataValidationError` con mensaje legible)
  - **Si éxito:** user object en sesión local + redirect a `/verify-email` (confirmación pendiente)
- **Aceptación:**
  - Test 1: signup válido → status 200, user en sesión
  - Test 2: email duplicado (Supabase error) → lanza `DataValidationError` (no error crudo)
  - Test 3: password débil → lanza `DataValidationError` con lista de requisitos
  - Test 4: red timeout → lanza `ApiError` timeout
  - E2E test: llenar form → click signup → verificar redirect y user logueado
- **Ref spec:** frontend/landing-and-auth-flow/spec.md (implícito)
- **Dependencia de:** Tareas 5, 6
- **Duración estimada:** 1.5 días

**9. Sign In Endpoint (días 7-8)**
- ID: `86e301dnp` (part 2) — o nueva tarea no listada en esta salida, pero parte de F4
- **Tarea:** Endpoint frontend `POST /auth/signin` que:
  - Valida email/password
  - Llama a Supabase `auth.signIn()`
  - Mapea errores: `invalid-login-credentials` → `AuthenticationError`
  - Guarda token en sesión segura (no localStorage)
  - Redirect a `/wardrobe` (home)
- **Aceptación:**
  - Test 1: login válido → token en sesión, redirect
  - Test 2: usuario no existe → `AuthenticationError` (401)
  - Test 3: password incorrecto → `AuthenticationError` (401), sin leak de "user exists"
  - E2E test: login → verificar protected route `/wardrobe` accesible
- **Ref spec:** frontend/landing-and-auth-flow/spec.md
- **Dependencia de:** Tareas 5, 6, 8
- **Duración estimada:** 1 día

**10. Sign Out (días 8-9)**
- ID: (parte de F4 landing-and-auth-flow)
- **Tarea:** Endpoint `POST /auth/signout` que:
  - Llama a Supabase `auth.signOut()`
  - Limpia sesión local
  - Redirect a `/landing`
  - Si error: loguea pero no rompe (logout siempre "succeeds")
- **Aceptación:**
  - Test 1: logout exitoso → sesión vacía, redirect
  - Test 2: logout con error de API → sesión aún se limpia (graceful degradation)
  - E2E test: estar logueado → click logout → landing accesible, wardrobe protegido
- **Ref spec:** frontend/landing-and-auth-flow/spec.md
- **Dependencia de:** Tareas 5, 6
- **Duración estimada:** 0.5 días

### Fase 4: Backend — Domain Layer (días 6-12)

**11. 6 Modelos SQLAlchemy (BLOCKER para backend)**
- ID: `86e3122fr`
- **Tarea:** Crear 6 modelos en `src/domain/models.py`:
  1. `User` (id, email, name, created_at, updated_at)
  2. `Garment` (id, name, category, aesthetic_tags, color, compatibility_embedding, user_id FK)
  3. `GarmentOwnership` (user_id, garment_id, source, added_at) — tabla de join para N:N
  4. `Outfit` (id, name, aesthetic, created_by FK, created_at)
  5. `OutfitGarment` (outfit_id, garment_id, position) — tabla de join
  6. `VTONJob` (id, status, input_image_url, output_image_url, created_by FK, created_at, error_message)
- **Aceptación:**
  - Cada modelo hereda de `declarative_base()`
  - Primary keys, FKs, tipos de columna coinciden con spec backend/domain-and-database/spec.md
  - No hay columnas extra no autorizadas (audit fields OK si están en spec)
  - `__tablename__` explícito
  - Test: crear instancia de cada modelo, `session.add()`, flush, verificar que no hay errores
- **Ref spec:** backend/domain-and-database/spec.md §2.1
- **Dependencia de:** Nada
- **Duración estimada:** 1.5 días

**12. Schemas Pydantic Alineados (días 7-8)**
- ID: `86e3122fv`
- **Tarea:** Crear schemas Pydantic en `src/domain/schemas.py` que replican exactamente los Zod de Asiento B tareas 1-4. **Cero divergencia.**
- **Aceptación:**
  - Para cada modelo SQLAlchemy, 1+ Pydantic schema (ej: `GarmentCreate`, `GarmentResponse`, `GarmentUpdate`)
  - Pydantic v2 con strict config
  - Campos requeridos/opcionales coinciden con Zod
  - Test: importar tanto Zod como Pydantic, fixture JSON valida en ambos
  - `from_orm=True` para read schemas (convertir SQLAlchemy rows a Pydantic)
- **Ref spec:** backend/domain-and-database/spec.md §2.2
- **Dependencia de:** Tareas 1-4 (frontend) + Tarea 11
- **Duración estimada:** 1.5 días

**13. Migraciones Alembic (días 8-10)**
- ID: `86e3122fy`
- **Tarea:** Crear migration `upgrade/downgrade` simétrica en `alembic/versions/` que:
  - Crea las 6 tablas
  - Añade índices (PK, FK)
  - Crea enum type en PostgreSQL si es necesario (VtonJobStatus enum)
  - Downgrade: drop tables en orden inverso (respetando FKs)
- **Aceptación:**
  - `alembic upgrade head` → base de datos con 6 tablas
  - `alembic downgrade base` → tables removed, no errores
  - Migración ejecuta sin warnings
  - Test: correr upgrade, crear row test, downgrade, upgrade de nuevo → row existe
  - CI verifica que downgrade/upgrade son simétricos
- **Ref spec:** backend/domain-and-database/spec.md §2.3
- **Dependencia de:** Tareas 11, 12
- **Duración estimada:** 2 días

**14. Trigger on_auth_user_created (días 10-12)**
- ID: `86e3122g5`
- **Tarea:** Crear trigger SQL en PostgreSQL (en migration o startup script) que:
  - Escucha `auth.users` table (Supabase)
  - Cuando nuevo user creado → crea fila en `User` table con email/id de Supabase
  - Falla transaccional: si error creando User → rollback (auth.users no afectado)
- **Aceptación:**
  - Trigger ejecuta automáticamente en insert a `auth.users`
  - Test: usar `supabase.auth.signUp()` → verificar que User fila aparece automáticamente en DB
  - Test fallo: simular error en trigger (ej: constraint violado) → auth.users insert aún éxito (trigger no rompe signup)
  - Documentación en `docs/triggers/on_auth_user_created.sql`
- **Ref spec:** backend/domain-and-database/spec.md §2.4
- **Dependencia de:** Tareas 11, 13
- **Duración estimada:** 2 días

### Fase 5: Validación & Coverage (días 11-14)

**15. Frontend E2E Auth Tests (días 11-13)**
- ID: `86e301dnp` (part 3) o derivada
- **Tarea:** Playwright E2E tests que cubren auth flow completo:
  1. Navegar a `/landing`
  2. Click sign up → llenar form → submit
  3. Ver mensaje "check your email" o redirect a `/verify-email`
  4. Simular click en link de confirmation (o mock email provider)
  5. Redirect a `/wardrobe` (logged in)
  6. Click sign out
  7. Verificar redirect a `/landing` y `/wardrobe` protected (401)
- **Aceptación:**
  - Test ejecuta sin flakiness (fixtures MSW, no APIs reales)
  - Todos los errores de API mostraron correctamente (no console errors)
  - Screenshots capturados en cada step para debugging
- **Ref spec:** api-client-and-schemas/spec.md (integración)
- **Dependencia de:** Tareas 6-10
- **Duración estimada:** 1.5 días

**16. Cobertura ≥90% (días 13-14)**
- ID: (derivada de coverage gates)
- **Tarea:** `npm run test -- src/lib/api src/lib/errors src/schemas --coverage` y `pytest tests/domain --cov=src/domain ≥90%`
- **Aceptación:**
  - Frontend: statements ≥90%, branches ≥90%, lines ≥90%, functions ≥90%
  - Backend: statements ≥90% en domain/
  - No líneas uncovered sin comentario `// tested via E2E` o similar
  - CI falla si coverage cae
- **Ref spec:** api-client-and-schemas/spec.md §2.6, domain-and-database/spec.md §2.6
- **Dependencia de:** Todas anteriores
- **Duración estimada:** 1 día

---

## Dependencias Críticas

| Tarea | Dependencia | Riesgo | Mitigación |
| --- | --- | --- | --- |
| 1-4 | Nada | Spec ambigua en campos opcionales | Validar contra fixtures reales antes de commitear |
| 5 | Nada | Error mapping incompleto (faltan códigos Supabase) | Usar tabla de referencia de Supabase error codes |
| 6 | 1,5 | Retry logic causa rate limiting | Implementar jitter en exponential backoff |
| 7 | 1-6 | Fixtures no sincronizadas con backend | Fixtures bajo `tests/fixtures/` — source of truth compartida |
| 8-10 | 5,6 | Errores de Supabase no mapeados | Test cada código de error Supabase real (no asumir) |
| 11 | Nada | Modelos divergen de Zod | Schema validation: crear modelos, parsear fixture Zod → columnas deben estar presentes |
| 12 | 11, 1-4 | Pydantic no syncronizado con SQLAlchemy | Use Pydantic `ConfigDict(from_attributes=True)` — validar que todos los campos mapean |
| 13 | 11,12 | Downgrade rompe si falta constraint | Test downgrade/upgrade 5 veces seguidas (cyclic) |
| 14 | 11,13 | Trigger no se ejecuta (permission issues) | Verificar rol de usuario Supabase tiene permisos en auth.users |
| 15 | 6,8-10 | E2E flaky si MSW handlers timing off | Añadir delays explícitos en MSW, usar `waitFor()` en Playwright |
| 16 | 1-15 | Coverage report falso (no cubre E2E) | Integrar Playwright coverage reports en nyc/istanbul |

---

## Hito: Auth Ready

**Fin de Sprint 1 (día 14):**

Jaicel entrega:
- ✅ Frontend schemas, client, auth endpoints
- ✅ Backend models, migrations, trigger
- ✅ E2E auth flow validado
- ✅ 16 tests passing, ≥90% coverage

**Siguiente:** Leonardo (Asiento A) ha entregado design-system + app-shell en paralelo. Sprint 2, Jaicel refuerza B1 (domain-and-database cierre) + Huascar (Asiento C) valida que auth y design-system no conflictúan.

---

## Handoff (fin de Sprint 1)

**Comentario en epics:**
- [EPIC] frontend/api-client-and-schemas: "16 tareas completadas. Schemas Zod finalizados, client API robusto. Decisión: usamos `zod` v3 (no v2) porque refine() más potente. No hay deuda."
- [EPIC] frontend/landing-and-auth-flow: "Auth endpoints 3/3 (signup, signin, signout). Todos los errores de Supabase mapeados. E2E tests cover flow completo. Deuda: JSDoc en error mappers — agregar Sprint 2."
- [EPIC] backend/domain-and-database: "6 modelos + migraciones + trigger completados. Pydantic schemas alineados 1:1 con Zod. Trigger validado — no edge cases pendientes."

