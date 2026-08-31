# Sprint 1 — Protocolo de Revisión Experta

**Responsable de Revisión:** Claude (experto)  
**Nivel de Rigor:** Máximo — Big Tech standards  
**Fecha de Revisión Planeada:** 8-9 septiembre 2026 (post-Sprint)  
**Proceso:** Rigorous iterative review — no merge sin cumplimiento 100% de spec

---

## Filosofía de Revisión

Cada tarea será validada contra:
1. **Spec escrita** (source of truth técnica)
2. **Acceptance Criteria** en ClickUp (checklist explícita)
3. **DoD (Definition of Done)** de Sprint 1 (standards mínimos)
4. **Big Tech practices** (code quality, testing, architecture)
5. **Integración** (cómo afecta al resto del proyecto)

**Resultado:** Pass (mergeable) o Fail (requiere cambios específicos, no genéricos).

---

## Matriz de Revisión por Asiento

### ASIENTO A — Leonardo (14 tareas, Cierre Sprint 1)

**Dueño de Revisión:** Claude (Design System & UX)  
**Artefactos a Validar:**
- `src/config/design-tokens.ts` (tokens derivados, sin hardcoding)
- `tailwind.config.ts` (importa tokens, estructura limpia)
- `src/components/ui/` (8 componentes: Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner)
- `src/lib/cn.ts` (merge de clases sin conflictos)
- `src/app/providers.ts` (tema sin parpadeo, instancia única)
- `src/components/shell/` (TopNav, BottomTabBar, GlobalError, SkipToLink)
- Tests: `.spec.ts` files (>= 80% coverage en shell, >= 90% en ui)

**Checklist de Revisión:**

#### Tokens & Config
- [ ] `design-tokens.ts` contiene todos los colores de spec §2.1 (no hay valores hardcoded en tailwind.config)
- [ ] `tailwind.config.ts` importa `design-tokens.ts`, no contiene literales de color
- [ ] Test: validar que `import { tokens }` funciona sin errores

#### Contraste & Accesibilidad
- [ ] Test de contraste cubre mínimo 12 pares (6 claro, 6 oscuro)
- [ ] CI ejecuta test de contraste automáticamente (usa axe-core o pa11y)
- [ ] Todos los pares pasan WCAG AA (ratio >= 4.5:1)
- [ ] Test: fallar si ratio < 4.5:1

#### cn() Function
- [ ] `cn('px-4', 'px-6')` retorna `'px-6'` (última gana, no conflicto)
- [ ] Maneja arrays, objetos, undefined sin crashes
- [ ] Mínimo 4 test cases, todos verdes
- [ ] Performance: < 50ms para 100 invocaciones

#### 8 Componentes UI
- [ ] Cada componente es función React pura (no state salvo props)
- [ ] Props tipadas (cero `any`)
- [ ] Cada componente tiene 1+ story en Storybook
- [ ] Stories cubren: normal, disabled, loading (si aplica), error (si aplica)
- [ ] Tests cubren happy path + edge cases
- [ ] Cobertura >= 80% por componente

#### Tema & Sin Parpadeo
- [ ] Script de tema inyectado en `<head>` ANTES de stylesheets
- [ ] `suppressHydrationWarning` en `<html>`
- [ ] E2E test: cambiar tema, screenshot antes/después, verificar cero parpadeo visual
- [ ] Lighthouse performance score >= 85 (no regresión)

#### App Shell
- [ ] TopNav/BottomTabBar alternan visibilidad solo por media queries CSS (cero JS breakpoint checks)
- [ ] E2E test: resize viewport → topnav/bottomtabbar alternan correctamente
- [ ] Navegación activa: `aria-current="page"` + 3 propiedades visuales (color, peso, underline)
- [ ] GlobalError cubre 5 tipos: NotFound, Unauthorized, ServerError, NetworkError, Fallback
- [ ] SkipToContentLink invisible por defecto, visible en `:focus`, clickea correctamente

#### Tests & Cobertura
- [ ] `npm run typecheck` → sin errores TypeScript strict
- [ ] `npm run lint` → sin warnings
- [ ] `npm run test -- src/components/shell src/components/ui` → todos pasan
- [ ] Coverage report: shell >= 80%, ui >= 80%
- [ ] Mínimo 1 test E2E por feature (tema, nav, error, accessibility)

#### Baselines Visuales
- [ ] 16 PNG files en `tests/visual-regression/baselines/` (8 components × 2 themes)
- [ ] Baselines committeados a git (tracking history)
- [ ] CI visual regression test ejecuta, compara, falla si > 2% diff

**Criterio de Aprobación:** Todos los ✅ checados.

**Criterio de Rechazo:** Cualquier ❌ → especificar qué falta, ask for fix.

---

### ASIENTO B — Jaicel (16 tareas, Cierre Sprint 1)

**Dueño de Revisión:** Claude (API Client & Backend Contracts)  
**Artefactos a Validar:**
- `src/schemas/` (4 Zod schemas: Garment, Outfit, VtonJob, User)
- `src/lib/api/client.ts` (`apiRequest<T>()` con 7 requisitos)
- `src/lib/errors.ts` (jerarquía de errores)
- `tests/fixtures/` (JSON fixtures reutilizables)
- Frontend auth endpoints (sign up, sign in, sign out) — integración con Supabase
- `src/domain/models.py` (6 SQLAlchemy models)
- `src/domain/schemas.py` (Pydantic schemas, alineados con Zod)
- `alembic/versions/` (migrations upgrade/downgrade)
- Database trigger `on_auth_user_created`

**Checklist de Revisión:**

#### Zod Schemas (4 principales)
- [ ] `GarmentSchema`, `OutfitSchema`, `VtonJobSchema`, `UserSchema` existen
- [ ] Cero `any` — todos los tipos concretos
- [ ] `z.infer<typeof XSchema>` exporta tipos correctos
- [ ] `category` y `aesthetic` son `z.string()` (no enum), con .describe() documentando valores válidos
- [ ] `OutfitPositionSchema` es `z.enum(['body', 'legs', 'torso', 'accessory'])` (cerrado)
- [ ] `VtonJobStatusSchema` es `z.enum(['pending', 'processing', 'completed', 'failed'])` (cerrado)
- [ ] `VtonJobStatusResponseSchema` tiene `.refine()` validando: si status='completed' → result no nulo
- [ ] Test: parse fixture válida con cada schema → no error
- [ ] Test: parse fixture inválida → ZodError

#### apiRequest<T>() — 7 Requisitos
- [ ] Parámetros: `url, method, body?, options?` con timeout default 10s
- [ ] Valida respuesta contra schema Zod (caller pasa schema como tipo)
- [ ] Mapea status HTTP a ApiError subclass (422→DataValidationError, 404→ResourceNotFoundError, 500→ModelInferenceError, etc)
- [ ] Retry automático con exponential backoff (máx 3 intentos) en 5xx
- [ ] Abort si timeout (lanza ApiError con código timeout)
- [ ] Log (Sentry) errores 4xx/5xx automáticamente
- [ ] Headers: `Authorization: Bearer <token>` (si `getAuthToken()` retorna), `Content-Type: application/json`
- [ ] Test 1: request exitoso → retorna data tipada
- [ ] Test 2: 422 response → lanza DataValidationError (no error crudo)
- [ ] Test 3: timeout simulado → lanza ApiError timeout
- [ ] Test 4: 5xx → reintenta 3 veces, si sigue fallando → lanza
- [ ] Test 5: Authorization header presente si token disponible
- [ ] Cobertura >= 90%

#### Error Hierarchy
- [ ] `ApiError` (base class)
  - `DataValidationError` → 422
  - `ResourceNotFoundError` → 404
  - `ModelInferenceError` → 500
  - `AuthenticationError` → 401
  - `UnauthorizedError` → 403
- [ ] Cada error tiene `statusCode` property
- [ ] Constructor: `new DataValidationError('message', { context })`
- [ ] Test: lanzar cada error, capturar, verificar status correcto
- [ ] Test: `error instanceof ApiError` funciona

#### Fixtures JSON
- [ ] `tests/fixtures/garment.json` (2-3 variantes: válida, sin campos opcionales, edge cases)
- [ ] `tests/fixtures/outfit.json` (2 variantes)
- [ ] `tests/fixtures/vtonJob.json` (2 variantes)
- [ ] `tests/fixtures/user.json` (2 variantes)
- [ ] Importados en unit tests (no copy-paste de valores)
- [ ] MSW mock handlers en `tests/mocks/handlers.ts` usan mismos fixtures
- [ ] Test: fixture valida contra schema → parse exitoso

#### Auth Endpoints (Frontend)
- [ ] `POST /auth/signup`: email/password → Supabase → mapea errores a ApiError
  - Test 1: válido → 200, user en sesión
  - Test 2: email duplicado → DataValidationError
  - Test 3: password débil → DataValidationError con requisitos
- [ ] `POST /auth/signin`: email/password → Supabase → mapea errores
  - Test 1: válido → 200, token en sesión
  - Test 2: usuario no existe → AuthenticationError (401)
  - Test 3: password incorrecto → AuthenticationError (no leak "user exists")
- [ ] `POST /auth/signout`: limpia sesión, redirect, no falla si error
  - Test 1: logout → sesión vacía
  - Test 2: logout con error de API → sesión aún limpia (graceful)
- [ ] E2E test: signup → login → logout flujo completo
- [ ] Cobertura >= 90%

#### SQLAlchemy Models (6 tablas)
- [ ] `User` (id, email, name, created_at, updated_at)
- [ ] `Garment` (id, name, category, aesthetic_tags, color, compatibility_embedding, user_id FK)
- [ ] `GarmentOwnership` (user_id, garment_id, source, added_at) — tabla N:N
- [ ] `Outfit` (id, name, aesthetic, created_by FK, created_at)
- [ ] `OutfitGarment` (outfit_id, garment_id, position) — tabla N:N
- [ ] `VTONJob` (id, status, input_image_url, output_image_url, created_by FK, created_at, error_message)
- [ ] Cada modelo hereda de `declarative_base()`
- [ ] Primary keys, FKs, tipos coinciden exactamente con spec
- [ ] Test: instanciar cada modelo, `session.add()`, flush → sin errores

#### Pydantic Schemas (Alineadas con Zod)
- [ ] Para cada modelo, 1+ Pydantic schema (Create, Response, Update)
- [ ] Pydantic v2 con strict config
- [ ] Campos requeridos/opcionales coinciden EXACTAMENTE con Zod
- [ ] Test: fixture JSON valida en ambos Zod y Pydantic
- [ ] `from_orm=True` en read schemas
- [ ] Cobertura >= 90%

#### Alembic Migrations
- [ ] Migration file crea 6 tablas en orden correcto (respetar FKs)
- [ ] Migration file crea índices (PK, FK)
- [ ] Enum type si necesario (VtonJobStatus)
- [ ] Downgrade: drop tables en orden inverso
- [ ] Test: `alembic upgrade head` → 6 tablas presentes
- [ ] Test: `alembic downgrade base` → tablas removed, sin errores
- [ ] Test: upgrade → downgrade → upgrade → data persiste

#### Trigger on_auth_user_created
- [ ] SQL trigger escucha `auth.users` insert
- [ ] Automáticamente crea fila en `User` con email/id de Supabase
- [ ] Falla transaccional: si error en trigger → rollback, pero auth.users insert OK
- [ ] Test: signup con Supabase → User fila aparece automáticamente
- [ ] Test: trigger error simulado → auth.users insert aún OK
- [ ] Documentación en `docs/triggers/on_auth_user_created.sql`

**Criterio de Aprobación:** Todos los ✅ checados.

**Criterio de Rechazo:** Cualquier ❌ → especificar, ask for fix.

---

### ASIENTO C — Huascar (2 tareas + pair, Cierre Sprint 1)

**Dueño de Revisión:** Claude (QA & Security)  
**Artefactos a Validar:**
- `.github/workflows/coverage-gate.yml` (CI gate)
- `.github/workflows/visual-regression.yml` (visual tests)
- `tests/visual-regression/` (baselines + test suite)
- `docs/security/auth-threat-model.md` (threat model)
- `tests/security/auth.spec.ts` (8 edge case tests)

**Checklist de Revisión:**

#### Coverage Gate Workflow
- [ ] Workflow ejecuta en cada PR
- [ ] Frontend: `npm run test -- --coverage` genera JSON
  - Target paths: shell >=80%, ui >=80%, api >=90%, errors >=90%, schemas >=90%
- [ ] Backend: `pytest tests/ --cov=src/domain --cov-report=json`
  - Target: domain >= 90%
- [ ] Si algún path cae bajo target → job FALLA con mensaje claro (qué path, % actual, % required)
- [ ] Mensaje SUCCESS: "Coverage OK: X paths verified"
- [ ] Test: create PR sin tests → gate FALLA
- [ ] Test: add tests → gate PASA
- [ ] Workflow time < 5 min frontend + < 2 min backend
- [ ] Coverage reports guardados como artifacts

#### Visual Regression Workflow
- [ ] 16 PNG baselines en `tests/visual-regression/baselines/`
  - Button-light, button-dark, card-light, card-dark, ... (8 components × 2 themes)
- [ ] Baselines committeados a git (tracked history)
- [ ] Playwright test ejecuta en cada PR:
  - Re-captura screenshots
  - Compara contra baselines
  - Diff threshold: <= 2% pixel differences permitido
- [ ] Si diff > 2%: test FALLA, artifacts con diff marked (expected/actual/overlay)
- [ ] Mensaje claro: qué component falló, cuánto diff
- [ ] Test: modificar Button CSS → visual test FALLA, diff generado
- [ ] `npm run test:visual -- --update` permite re-capturar (manual only)
- [ ] Workflow time < 3 min

#### Threat Model Document
- [ ] `docs/security/auth-threat-model.md` contiene 8 escenarios:
  1. Session Hijacking / Token Theft
  2. CSRF (Cross-Site Request Forgery)
  3. Timing Attack en Login
  4. Rate Limiting en Auth
  5. Password Requirements Validation
  6. Email Verification Flow
  7. Logout Completeness
  8. OWASP Top 10 Quick Scan
- [ ] Cada escenario tiene: descripción, mitigación, test asociado
- [ ] Documento es source of truth para security testing

#### Security Tests (8 edge cases)
- [ ] Test 1: Session hijacking — token robo via XSS → debe fallar (httpOnly cookie OK)
- [ ] Test 2: CSRF — POST sin CSRF token → 403 Forbidden
- [ ] Test 3: Timing attack — "user exists" vs "user not exists" latencia similar
- [ ] Test 4: Rate limiting — 10 requests/1s → 11° falla con 429
- [ ] Test 5: Password weak → error genérico (no leak cuál requisito)
- [ ] Test 6: Verify email — signup → can't login until verified → 403 Unverified
- [ ] Test 7: Logout — token + sesión cleaned, user data no accessible
- [ ] Test 8: OWASP scan — `npm audit`, `npm run lint -- --security` → sin findings críticas
- [ ] Todos los 8 tests pasan (green in CI)

**Criterio de Aprobación:** Coverage gate operacional + Visual regression setup + 8 security tests verdes.

**Criterio de Rechazo:** Cualquier componente falla → ask for fix.

---

### ASIENTO D — Manuel (6 tareas, Cierre Sprint 1)

**Dueño de Revisión:** Claude (Infrastructure & Observability)  
**Artefactos a Validar:**
- `.github/workflows/ci.yml` (frontend + backend CI, E2E, staging deploy)
- `src/lib/logging.ts` + `src/core/logging.py` (structured logging)
- Sentry setup + integration (both frontend + backend)
- `npm audit`, `pip-audit` integrados en CI
- `docs/operations/slos.md` (SLOs formales)
- Prometheus config + Grafana dashboard (local)
- `CHANGELOG.md` versionado (Keep a Changelog)

**Checklist de Revisión:**

#### GitHub Actions CI/CD
- [ ] Workflow `.github/workflows/ci.yml` ejecuta en cada PR
- [ ] Jobs paralelos:
  - Frontend: lint (< 1 min) + typecheck (< 2 min) + test (< 3 min) + build (< 2 min)
  - Backend: pytest (< 3 min) con database service
  - E2E: runs after frontend+backend builds
  - Deploy-Staging: conditional, después de todos pasan
- [ ] Total time: < 10 min
- [ ] Artifacts: frontend build + backend coverage
- [ ] Test: dummy PR → workflow ejecuta verde
- [ ] Test: lint fallo → workflow RED, PR bloqueado
- [ ] Logs legibles (no verbosity bloat, pero errores claros)

#### Structured Logging
- [ ] `src/lib/logging.ts` (frontend) usa pino
  ```ts
  import pino from 'pino';
  export const logger = pino({ level: 'info', ... });
  ```
- [ ] `src/core/logging.py` (backend) usa python-json-logger o structlog
- [ ] Logging eventos: API errors, component mounts, auth events
- [ ] Campos: timestamp, level, message, context (user_id, path, etc)
- [ ] Test: `logger.error('test')` → evento logged correctamente
- [ ] CI: logs visible en workflow output

#### Sentry Integration
- [ ] Sentry account creado (free tier)
- [ ] DSN en `.env.local` (frontend) + `.env` (backend)
- [ ] Frontend: `@sentry/react` installed, `init()` called
  ```ts
  import * as Sentry from '@sentry/react';
  Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN, ... });
  ```
- [ ] Backend: `sentry-sdk` installed, init() called
- [ ] ApiError (frontend) → log + Sentry
- [ ] Excepciones backend → log + Sentry
- [ ] Test: make request → error lanzado → Sentry recibe evento
- [ ] Dashboard Sentry visible con mínimo 1 test event

#### Dependency Audit
- [ ] `npm audit` ejecuta en CI (fail si high+ vulns)
- [ ] `.npmrc`: `audit-level=moderate` (fail si moderate+)
- [ ] `pip-audit` o `safety` ejecuta en CI
- [ ] Allowlist `.dependabot-ignore.json` para false positives (documentado)
- [ ] CI: audit step integrado en workflow
- [ ] Test: introduce vuln conocida → audit FALLA

#### SLOs Document
- [ ] `docs/operations/slos.md` contiene mínimo 3 SLOs:
  1. VTON latency: p95 < 10s
  2. Uptime: 99.5% (max 21.6 min/month downtime)
  3. Error rate: < X% por endpoint
- [ ] Estructura: Metric, Target, Window, Error Budget
- [ ] Documento es source of truth para observabilidad

#### Prometheus + Grafana (Local)
- [ ] `prometheus.yml` config con 2+ scrape targets
- [ ] Backend expone `/metrics` endpoint
  ```python
  from prometheus_client import Counter, Histogram
  vton_latency = Histogram('vton_request_latency_seconds', '...')
  ```
- [ ] Metrics: latency, error rate, uptime checks
- [ ] Grafana dashboard visualiza métricas
- [ ] Test: request → métrica incrementa en Prometheus
- [ ] Dashboard shows SLO targets + actual values
- [ ] Documentación: `docker-compose.yml` para Prometheus + Grafana local

#### Changelog
- [ ] `CHANGELOG.md` existe (root)
- [ ] Formato: Keep a Changelog v1.1.0
- [ ] v0.1.0-alpha entry documenta Sprint 1 deliverables (design-system, auth, CI/CD, observability)
- [ ] `[Unreleased]` section presente (empty para Sprint 1)
- [ ] Git tag `v0.1.0-alpha` points to Sprint 1 commit
- [ ] No formato inconsistencies (YYYY-MM-DD dates, consistent sections)

**Criterio de Aprobación:** CI/CD operacional + Logging + Sentry + SLOs + Changelog.

**Criterio de Rechazo:** Cualquier componente infrastructure missing → ask for fix.

---

## Proceso de Revisión (Timeline)

### Fase 1: Notificación (Día 1 — Sprint 1 Fin)
Leonardo, Jaicel, Huascar, Manuel notifican: "Sprint 1 work complete, ready for review"

### Fase 2: Initial Triage (Día 2)
Claude ejecuta:
```bash
# Para cada rol
git log --oneline -20  # Verificar commits
npm run test          # Verificar tests pasan
npm run typecheck
npm run lint
# etc per role
```

### Fase 3: Detailed Review (Días 3-4)
Claude revisa cada artefacto contra checklist.
- Aprobado (✅ PASS): Marco en GitHub como "approved"
- Rechazado (❌ FAIL): Comenta exactamente qué falta, no genérico

### Fase 4: Iteration (Días 5-6, si necesario)
Developer arregla specific issues, pushea, Claude re-revisa.

### Fase 5: Final Approval (Día 7)
Todos los artefactos PASS → Sprint 1 complete.

---

## Estándares de Rechazo (Causa de NO Merge)

**BLOCKER (rechazo inmediato):**
- Spec requirement não cumplida (spec es source of truth)
- Test suite incompleta o con failures
- Cobertura por debajo del target
- Seguridad issue identificada (rechazo + fix obligatorio antes de merge)
- Code that doesn't compile/run

**CRITICAL (requiere fix antes de merge):**
- TypeScript errors
- Linting warnings
- Documentación faltando (specs linked)
- Migraciones no reversibles

**MINOR (can merge but note tech debt):**
- JSDoc faltando (puede agregarse Sprint 2)
- Optimizaciones de performance (no critícas)
- Tests pendientes que no bloquean AC

---

## Notificación a Usuarios

Una vez completo cada asiento, Claude enviará:

```
Subject: Sprint 1 Review — Asiento A (Leonardo)

Status: ✅ APPROVED / ❌ CHANGES REQUIRED

Approved Items:
- design-tokens.ts ✅
- tailwind.config.ts ✅
- 8 UI components ✅
- ...

Changes Required:
- TopNav accessibility test incomplete → add keyboard navigation test
- ...

Next Steps: [Merge to main / Apply changes and re-submit]
```

---

## Criterio Final de Éxito

**Sprint 1 Cierre = APPROVED cuando:**
- ✅ Leonardo: 14/14 tareas PASS
- ✅ Jaicel: 16/16 tareas PASS
- ✅ Huascar: 2/2 tareas + pair PASS
- ✅ Manuel: 6/6 tareas PASS
- ✅ Todas las specs implementadas 100%
- ✅ Cobertura >= 80-90% por path
- ✅ Tests 100% passing
- ✅ CI/CD operacional
- ✅ Cero security issues críticas
- ✅ Documentación completa

**Result: Project ready for Sprint 2**

