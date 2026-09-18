# Sprint 1 — Prompt de Inicialización | Asiento D (Manuel)

**Rol:** Infra / Release / Documentación + **coordinación de ClickUp** (Asiento D, rotación §1)  
**Ventana:** Sprint 1 features **2–8 sep 2026** (Sprint 0 cerró el 1 sep)  
**Epics:** Q2 (CI/CD), Q4 (Observabilidad), Q6 (Release Management)  
**6 tareas** | SP ~30-35 — ver `sprint-1-manifest.md` §6.

> **Ajustes post-scaffold** (`sprint-1-manifest.md` §6 — importante, este prompt es previo al scaffold):
> - El `ci.yml` **ya existe** (3 jobs `quality`/`build`/`e2e`, Node 20, `actions/*@v4`). Tarea `86e301e09` =
>   endurecerlo + **configurar branch protection en `main`** (require PR, ≥1 review CODEOWNERS, status
>   checks obligatorios, sin push directo — **hoy está OFF**) + añadir secreto `CODECOV_TOKEN`.
> - **Repo frontend-only** (§1): fuera de este repo el CI de backend, Prometheus/Grafana, métricas de
>   `/api/v1/vton/try-on`, `@sentry/react`→`@sentry/nextjs`, `structlog`/`sentry-sdk` (Python).
> - **Reconciliación ClickUp**: ejecutar el checklist de `sprint-1-manifest.md` §7 y exportar `SPRINT-1-MASTER.csv`.
> - Changelog `v0.1.0-alpha`: **5** componentes (Button, Card, Badge, Skeleton, Progress), no 8. Auth = Supabase (sin bcrypt propio).

---

## Objetivo de Sprint

Establecer **infraestructura de calidad y operaciones**, entregando:
- Pipeline CI/CD completo: lint → typecheck → test → build → deploy-staging
- Logging estructurado + error tracking (Sentry)
- SLOs formales y dashboards de observabilidad
- Changelog versionado (Keep a Changelog format)
- Security audit integrada al pipeline

**Success Criteria (DoD):**
- ✅ Todos los 6 tests pasan (cada tarea tiene aceptación clara)
- ✅ GitHub Actions workflow ejecuta en cada PR (< 10 min total)
- ✅ Staging deployment funciona (manual trigger o auto-deploy)
- ✅ Sentry recibe eventos de error desde ambos frontend + backend
- ✅ SLOs documentados y dashboards creados (grafana-like — puede ser local)
- ✅ Changelog inicializado para v0.1.0-alpha
- ✅ Dependency audit ejecuta y reporta vulnerabilidades

---

## Tareas por Orden de Ejecución

### Tarea 1: GitHub Actions Pipeline (días 1-5)

**ID:** `86e301e09`
- **Título:** Pipeline GitHub Actions: lint→typecheck→test→build en cada PR; +e2e+deploy a staging

**Descripción:**

Crear workflow `.github/workflows/ci.yml` que:

1. **Trigger:** On `push` a cualquier rama PR (no solo main)

2. **Jobs paralelos:**

   a. **Frontend CI:**
   ```yaml
   name: Frontend
   runs-on: ubuntu-latest
   steps:
     - uses: actions/checkout@v3
     - uses: actions/setup-node@v3
       with:
         node-version: '18'
     - run: npm ci
     - run: npm run lint       # < 1 min
     - run: npm run typecheck  # < 2 min
     - run: npm run test       # < 3 min (coverage report also generated)
     - run: npm run build      # < 2 min
     - uses: actions/upload-artifact@v3
       with:
         name: frontend-build
         path: ./dist/
   ```

   b. **Backend CI:**
   ```yaml
   name: Backend
   runs-on: ubuntu-latest
   services:
     postgres:
       image: postgres:15
       env:
         POSTGRES_PASSWORD: postgres
       options: >-
         --health-cmd pg_isready
         --health-interval 10s
         --health-timeout 5s
         --health-retries 5
   steps:
     - uses: actions/checkout@v3
     - uses: actions/setup-python@v4
       with:
         python-version: '3.10'
     - run: pip install -r requirements-dev.txt
     - run: pytest tests/ -v --cov=src/core --cov=src/domain
     - uses: actions/upload-artifact@v3
       with:
         name: backend-coverage
         path: ./coverage/
   ```

   c. **E2E Tests (paralelo, después de frontend + backend builds):**
   ```yaml
   name: E2E
   runs-on: ubuntu-latest
   needs: [Frontend, Backend]
   steps:
     - uses: actions/checkout@v3
     - uses: actions/setup-node@v3
     - run: npm ci
     - run: npm run test:e2e  # Playwright tests against staging
   ```

   d. **Deploy to Staging (solo si todos pasan + PR title contiene "ready"):**
   ```yaml
   name: Deploy-Staging
   runs-on: ubuntu-latest
   needs: [Frontend, Backend, E2E]
   if: github.event.pull_request.draft == false
   steps:
     - uses: actions/checkout@v3
     - run: |
         echo "Deploying to staging..."
         # Deploy steps (Docker push, K8s apply, Vercel deploy, etc.)
   ```

3. **Timing targets:**
   - Frontend CI: < 5 min
   - Backend CI: < 3 min
   - E2E: < 3 min
   - **Total: < 10 min** (jobs in parallel)

4. **Artifacts:**
   - Frontend build (`dist/`) uploadado — reusable para E2E
   - Coverage reports guardados — inspeccionables en GitHub UI

**Acceptance Criteria:**

- [ ] Workflow archivo: `.github/workflows/ci.yml` existe
- [ ] Trigger: ejecuta en cada push a PR branch (visible en GitHub "Checks" tab)
- [ ] Nombre de jobs es claro: "Frontend", "Backend", "E2E", "Deploy-Staging"
- [ ] Logs son legibles (no mucho verbosity, pero errores claros)
- [ ] Test: crear dummy PR → workflow ejecuta → todos los jobs verde (pass)
- [ ] Test: introducir fallo (ej: `npm run lint` error) → workflow RED, PR bloqueado sin merge
- [ ] Artifacts uploadados (frontend build + backend coverage) accesibles en workflow summary
- [ ] Total time: < 10 min (no timeout de GitHub actions 6h)

**Dependencia de:** Leonardo (frontend tests), Jaicel (backend tests)  
**Bloqueador para:** Sprint 2 (CI debe estar estable antes de mergear más PRs)  
**Duración estimada:** 2-3 días (includes debugging GitHub Actions syntax)

---

### Tarea 2: Logging Estructurado + Sentry (días 4-7)

**ID:** `86e301e0m`
- **Título:** Logging estructurado + tracking de errores (Sentry tier gratuito) desde el inicio

**Descripción:**

Implementar logging que captura eventos en formato JSON (structured logging) y envía errores a Sentry.

1. **Frontend Logging:**
   - Librería: `pino` (no `console.log`)
   - Configuración: `src/lib/logging.ts`
   ```ts
   import pino from 'pino';
   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: {
       target: 'pino/file',
       options: { destination: '/tmp/app.log' }, // local dev
     },
   });
   // En producción: enviar a Sentry
   ```
   - Eventos: errores de API, componente mounts, auth events
   - Campos: timestamp, level (info/warn/error), message, context (user_id, path, etc)

2. **Backend Logging:**
   - Librería: `python-json-logger` o `structlog`
   - Similar estructura: timestamp, level, message, context

3. **Sentry Integration:**
   - Signup: crear cuenta Sentry (tier gratuito = 5k errors/month)
   - DSN: guardar en `.env.local` (Frontend) y `.env` (Backend)
   - Frontend: `npm install @sentry/react`
   ```ts
   import * as Sentry from '@sentry/react';
   Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN, environment: 'development' });
   // Todos los errores no atrapados van a Sentry
   ```
   - Backend: `pip install sentry-sdk`
   ```python
   import sentry_sdk
   sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'), environment='development')
   ```

4. **Error Handling Integration:**
   - ApiError (frontend) → log + Sentry
   - Excepciones backend → log + Sentry
   - Errores silenciosos (ej: failed retry) → log con level "warn"

5. **CI/CD:**
   - Logs escriben a stdout (CI capture)
   - Sentry events visible en Sentry dashboard

**Acceptance Criteria:**

- [ ] `src/lib/logging.ts` (frontend) + `src/core/logging.py` (backend) existen
- [ ] Logger instancia con nivel configurable (info/debug/warn/error)
- [ ] Sentry DSNs en `.env.local` y `.env` (no hardcoded)
- [ ] Test (frontend): importar logger → `logger.error('test')` → evento en Sentry
- [ ] Test (backend): log error → evento en Sentry con stacktrace
- [ ] CI: logs legibles en workflow output (no JSON dumps gigantes)
- [ ] Dashboard Sentry muestra eventos (al menos 1 test event)
- [ ] No hay "Sentry not initialized" warnings

**Dependencia de:** Nada (puede hacerse en paralelo)  
**Bloqueador para:** Sprint 2 (observabilidad debe estar setup antes de escribir ML pipelines)  
**Duración estimada:** 2-3 días (mostly Sentry setup + testing)

---

### Tarea 3: Dependency Audit (días 7-8)

**ID:** `86e301e0t`
- **Título:** Auditoría de dependencias (npm audit / pip-audit) integrada al pipeline CI

**Descripción:**

Garantizar que no hay vulnerabilidades conocidas en dependencias.

1. **Frontend:**
   - Script: `npm audit`
   - CI step ejecuta en cada PR
   - Opción: fail si vuln "high" o "critical" (warn en "moderate")
   - `.npmrc`: `audit-level=moderate` (fail si moderate+)

2. **Backend:**
   - Librería: `pip-audit` (o safety)
   - Script: `pip-audit` o `safety check`
   - CI step: similar setup

3. **Ignored Vulnerabilities:**
   - Algunos vulns pueden ser falsas alarmas o bajo-riesgo
   - Allowlist en archivo: `.dependabot-ignore.json` (frontend) + `pip-audit-ignore.json` (backend)
   - Formato: `{ "CVE-XXXX-XXXXX": "reason: ..." }`
   - Revisar quarterly (no ignorar forever)

4. **CI Integration:**
   - Step en workflow `.github/workflows/ci.yml`:
   ```yaml
   - name: Audit Dependencies
     run: npm audit --audit-level=moderate
   ```

5. **Manual Review:**
   - Monthly: revisar nuevas vulns, actualizar dependencias si es posible

**Acceptance Criteria:**

- [ ] `npm audit` ejecuta sin "high" vulns (can ignore "moderate" si no crítico)
- [ ] `pip-audit` similar (no vulns críticas)
- [ ] CI workflow incluye audit step (no timeout)
- [ ] Test: introducir dependencia con vuln conocida → CI FALLA
- [ ] Allowlist para excepciones documentado
- [ ] Documentación: cómo ignorar/resolver vulns

**Dependencia de:** Nada (puede hacerse en paralelo)  
**Bloqueador para:** Production launch (audit debe estar clean antes de go-live)  
**Duración estimada:** 1 día

---

### Tarea 4: SLOs & Dashboards (días 8-11)

**ID:** `86e302a5u` + `86e302a5f`
- **Título 1:** Definir y documentar SLOs formales: p95 de latencia VTON, uptime objetivo d[el proyecto]
- **Título 2:** Dashboards de latencia y tasa de error por endpoint, con foco en `/api/v1/vton/try-on`

**Descripción:**

Definir métricas observables y crear dashboards para monitoreabilidad.

1. **SLOs Formales (documento):**
   - Archivo: `docs/operations/slos.md`
   - Estructura:
     ```markdown
     ## SLO: VTON Endpoint Latency
     - **Service:** Backend / VTON Pipeline
     - **Metric:** Response time (p95)
     - **Target:** ≤ 10 seconds (service time, not including client upload)
     - **Window:** Monthly
     - **Error Budget:** 0.1% (max 30 min/month of unavailability)
     
     ## SLO: API Uptime
     - **Target:** 99.5% (max 21.6 min/month downtime)
     - **Measurement:** Synthetic checks every 5 min to /health
     ```

2. **Métricas a Trackear:**
   - Response time (p50, p95, p99) por endpoint
   - Error rate (5xx, 4xx) por endpoint
   - Uptime (% of successful healthchecks)
   - Active users (concurrent)
   - Database query latency
   - ML inference latency (Replicate/RunPod call)

3. **Dashboard Local (dev):**
   - Opción A: Grafana (self-hosted, free tier) + Prometheus scraper
   - Opción B: Datadog free trial (simpler, but limited)
   - Opción C: Simple HTML dashboard que querys Prometheus / logs
   - **For Sprint 1:** Crear skeleton de dashboard (local only, no production yet)

4. **Prometheus Setup (local dev):**
   - `prometheus.yml` en repo root
   - Scrape targets: frontend (if exposed), backend `/metrics` endpoint
   - Backend: `pip install prometheus-client`
   ```python
   from prometheus_client import Counter, Histogram
   vton_latency = Histogram('vton_request_latency_seconds', 'VTON API latency')
   errors = Counter('vton_errors_total', 'VTON errors')
   ```

5. **Grafana Dashboard (local):**
   - Charts: latency over time, error rate, uptime
   - Reusable dashboard JSON (committable to repo)

**Acceptance Criteria:**

- [ ] `docs/operations/slos.md` documenta mínimo 3 SLOs (VTON latency, uptime, error rate)
- [ ] Prometheus config con 2+ scrape targets (backend + any frontend instrumentation)
- [ ] Backend expone `/metrics` endpoint con histogramas (vton_latency, api_errors, etc)
- [ ] Grafana dashboard visualiza las métricas (local development)
- [ ] Test: hacer request a `/api/v1/vton/try-on` → métrica se incrementa en Prometheus
- [ ] Dashboard shows SLO targets + actual values (visual: red if breached)
- [ ] Documentation: cómo ejecutar Prometheus + Grafana locally (docker-compose.yml)

**Dependencia de:** Jaicel (backend endpoints), Manuel (logging from Tarea 2)  
**Bloqueador para:** Sprint 2 / Production (observabilidad debe estar setup para MLOps tuning)  
**Duración estimada:** 3 días

---

### Tarea 5: Changelog Versionado (días 12-13)

**ID:** `86e302a7u`
- **Título:** Changelog versionado (formato Keep a Changelog) mantenido desde el primer release

**Descripción:**

Mantener changelog que documenta todos los cambios entre releases.

1. **Archivo:** `CHANGELOG.md` (root)
2. **Formato:** Keep a Changelog v1.1.0
   ```markdown
   # Changelog
   
   ## [0.1.0-alpha] - 2026-09-08
   
   ### Added
   - Design system with 8 base components (Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner)
   - App shell with theme switching (dark/light)
   - Authentication flow (sign up, sign in, sign out)
   - Backend domain models (6 SQLAlchemy tables)
   - CI/CD pipeline (GitHub Actions)
   - Observability: SLOs, dashboards, Sentry logging
   
   ### Fixed
   - Theme switching no longer causes FOUC (Flash of Unstyled Content)
   
   ### Security
   - Password hashing with bcrypt
   - Email verification required for account activation
   
   ## [Unreleased]
   - (Para próximos sprints)
   ```

3. **Maintenance:**
   - Cada tarea completada → add línea a `[Unreleased]`
   - Sprint review: mueve `[Unreleased]` a versionado (ej: `[0.1.0-alpha]`)
   - Tags git: `git tag v0.1.0-alpha`

4. **Automation (bonus):**
   - Script: `scripts/release.sh` que:
     - Bumps version en `package.json` + `pyproject.toml`
     - Movs `[Unreleased]` a `[X.Y.Z] - YYYY-MM-DD`
     - Commits + tags
     - No merge a main sin changelog update

**Acceptance Criteria:**

- [ ] `CHANGELOG.md` existe con estructura Keep a Changelog
- [ ] v0.1.0-alpha entry documenta Sprint 1 deliverables (design-system, auth, CI/CD, observability)
- [ ] `[Unreleased]` section presente (empty para Sprint 1)
- [ ] Git tags: `v0.1.0-alpha` points to Sprint 1 release commit
- [ ] Readme references CHANGELOG.md
- [ ] No formato inconsistencies (all dates YYYY-MM-DD, all sections consistent)

**Dependencia de:** Todos (cada tarea contribuye a changelog)  
**Bloqueador para:** Release announcement (changelog must be public-ready)  
**Duración estimada:** 0.5-1 día

---

## Hito: Infrastructure Ready

**Fin de Sprint 1 (día 14):**

Manuel entrega:
- ✅ CI/CD pipeline ejecutando (< 10 min per PR)
- ✅ Logging + Sentry funcionando
- ✅ Dependency audit integrado
- ✅ SLOs documentados, dashboards creados
- ✅ Changelog inicializado

**Siguiente:** Sprint 2, Manuel refuerza CI/CD (E2E improvements), MLOps (Replicate setup), Rate limiting, y alerting SRE.

---

## Handoff (fin de Sprint 1)

**Comentario en epics:**
- [EPIC] Q2 — CI/CD: "GitHub Actions workflow operacional. Frontend + backend CI en paralelo. Deploy-staging ready (manual trigger). No deuda — ready for daily use."
- [EPIC] Q4 — Observabilidad: "SLOs documentados (3 targets: VTON latency, uptime, error rate). Prometheus + Grafana setup locally. Sentry logging funcional. Metrics colecionados pero no monitoreados (waiting for production setup)."
- [EPIC] Q6 — Release Management: "Changelog initialized, v0.1.0-alpha tagged. Process documented. Deuda: automated release script — agregar Sprint 2."

---

## Reference: Deployment Flow (Staging)

```
Developer creates PR
         ↓
GitHub Actions triggers CI workflow
         ↓
Parallel: Frontend CI, Backend CI
         ↓
E2E tests run (against built artifacts)
         ↓
All checks pass? YES → Deploy-Staging job triggered
                 NO → PR blocked, developer fixes
         ↓
Deploy-Staging:
  - Docker build (frontend + backend)
  - Push to registry
  - Deploy to staging cluster (k8s apply / docker-compose / vercel / etc)
  - Run smoke tests
  - Notify team (Slack message)
         ↓
QA / Product reviews staging
         ↓
Merge to main
         ↓
Production deployment (manual or automated)
```

---

## Reference: Metrics to Expose

| Metric | Type | Labels | SLO Target |
| --- | --- | --- | --- |
| `http_request_latency_seconds` | Histogram | endpoint, method, status | p95 < 2s (most) |
| `http_requests_total` | Counter | endpoint, method, status | N/A |
| `vton_job_latency_seconds` | Histogram | status | p95 < 10s |
| `db_query_latency_seconds` | Histogram | query_type | p95 < 100ms |
| `auth_signups_total` | Counter | status | N/A |
| `auth_logins_total` | Counter | status | N/A |
| `sentry_events_total` | Counter | level | N/A (track errors) |
| `uptime_checks_total` | Counter | status | 99.5% success rate |

