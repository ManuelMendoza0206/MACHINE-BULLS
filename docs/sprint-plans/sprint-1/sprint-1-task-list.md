# Sprint 1 — Tareas por Rol (mirror del tablero ClickUp)

**Ventana:** Sprint 0 (scaffold) 31 ago–1 sep · **Sprint 1 features 2–8 sep 2026**  
**Total:** 38 tareas + 3 epics = 41 (de las cuales 4 de Jaicel ejecutan en el repo backend)  
**Asientos:** Leonardo (A / Feature Lead), Jaicel (B / Feature Support), Huascar (C / QA), Manuel (D / Infra·Release)

> **Estructura canónica y correcciones:** `sprint-1-manifest.md`. Este documento refleja el
> tablero; el manifiesto refleja las specs. Ambos ya alineados (31 ago 2026).

---

## SPRINT 0 — Preparación del entorno (a crear en ClickUp, lista `Deploy` salvo indicado)

Trazabilidad del trabajo de scaffold/entorno ya ejecutado (`constitution.md` §5: si no está
registrado, no cuenta). Spec: `openspec/specs/frontend/project-scaffold/spec.md`. La mayoría
ya está **Done** (rama `chore/sprint-1-prep` mergeada + `chore/dev-environment`), salvo S0-8.

| #        | Tarea                                                                                                                                                                                           | Owner      | Estado   | Evidencia                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------- |
| S0-1     | Scaffold Next.js 14.2 + React 18.3 + Node 20; `npm ci` reproducible; `verify` en verde                                                                                                          | Leonardo   | Done     | `docs/sprint-plans/sprint-0/sprint-0-review.md`, commit `5333dd8` |
| S0-2     | Design tokens WCAG-AA + `tailwind.config` derivado + sync `globals.css`                                                                                                                         | Leonardo   | Done     | commit `f4f5a3a`, `CLAUDE.md` §10 D1                       |
| S0-3     | Specs `design-system` y `app-shell` migradas a formato OpenSpec nativo                                                                                                                          | Leonardo   | Done     | `openspec/specs/frontend/…`                                |
| S0-4     | CI `ci.yml` — 3 jobs (`quality`/`build`/`e2e`), Node 20, concurrency-cancel                                                                                                                     | Manuel     | Done     | `.github/workflows/ci.yml`                                 |
| S0-5     | Seguridad base: CSP enforced, headers, `poweredByHeader off`, imágenes acotadas                                                                                                                 | Manuel     | Done     | `next.config.js`, `CLAUDE.md` §10 D2                       |
| S0-6     | Gobernanza: `CODEOWNERS`, `pull_request_template.md`, `.gitattributes`                                                                                                                          | Manuel     | Done     | `.github/`                                                 |
| S0-7     | Entorno dev: `.editorconfig`, husky (`pre-commit`/`commit-msg`/`pre-push`), `lint-staged`, `commitlint`, `dependabot.yml`, issue templates, `.vscode/`, `CONTRIBUTING.md`, `docs/onboarding.md` | Manuel     | Done     | rama `chore/dev-environment`                               |
| **S0-8** | **Configurar branch protection en `main`** (require PR, review `CODEOWNERS`, status checks `quality`/`build`/`e2e`, sin push directo/force) + secreto `CODECOV_TOKEN`                           | **Manuel** | **TODO** | acción de admin en GitHub — **hoy OFF**                    |
| S0-9     | Reconciliar tablero ClickUp con la documentación (checklist `sprint-1-manifest.md` §7) + exportar `SPRINT-1-MASTER.csv`                                                                         | Manuel     | TODO     | —                                                          |

---

## ASIENTO A — Leonardo (14 tareas)

**Épics principales:** `frontend/design-system`, `frontend/app-shell-and-navigation`

### [EPIC] frontend/design-system

- **ID:** 86e301dd5 | **Due:** 07-09-2026

Tareas del epic:

1. **`tailwind.config.ts` deriva sus colores de `src/config/design-tokens.ts`, sin hardcoding**
   - ID: `86e301dd8` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

2. **Los 6 pares de texto cumplen contraste AA (≥ 4.5:1) en claro y oscuro + `globals.css` sincronizado con `design-tokens.ts`**
   - ID: `86e301dda` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

3. **`cn()` implementado y cubierto por tests unitarios (mínimo 4 casos: merge simple, conflicto, array, undefined)**
   - ID: `86e301ddf` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

4. **Los 5 componentes de §2.4 (Button, Card, Badge, Skeleton, Progress) existen en `src/components/ui/`, tipados sin `any`, usando `cn()`. Sin Storybook.**
   - ID: `86e301ddn` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

5. **Cambio de tema claro/oscuro no produce parpadeo visible (`suppressHydrationWarning` en `<html>`)**
   - ID: `86e301ddw` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

6. **`npm run typecheck && npm run lint && npm run test` pasan en verde para todo el design-system**
   - ID: `86e301ddy` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

7. **Los requisitos de a11y de la Requirement "Accessibility compliance" cubiertos por test (aria-disabled Button, aria-busy Skeleton, role Progress, texto-no-solo-color Badge)**
   - ID: `86e301de2` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

### [EPIC] frontend/app-shell-and-navigation

- Epic contenido (sin ID separado en este dump)

Tareas del epic:

8. **`AppProviders` instancia cada provider exactamente una vez por sesión**
   - ID: `86e301dp5` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

9. **`TopNav`/`BottomTabBar` alternan visibilidad solo por CSS — cero JS de detección de breakpoint**
   - ID: `86e301dp7` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

10. **Navegación activa usa `aria-current="page"` y señal visual no solo de color**
    - ID: `86e301dp8` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

11. **`GlobalError` cubre las 4 ramas (`ApiError`, `NetworkError`, `ValidationError`, `Error` genérico), cada una con copy y fallback UI**
    - ID: `86e301dpf` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

12. **`SkipToContentLink` funcional por teclado, primer elemento enfocable**
    - ID: `86e301dpk` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

13. **Cambiar de tema no produce parpadeo visible a nivel de layout completo**
    - ID: `86e301dpm` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

14. **Cobertura medida en `src/components/shell/` y `src/app/providers.tsx` (el gate ≥ 80% entra en Sprint 2 — P1#8)**
    - ID: `86e301dpw` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

---

## ASIENTO B — Jaicel (16 tareas)

**Épics principales:** `frontend/landing-and-auth-flow`, `backend/domain-and-database` (parte 1)

### [EPIC] frontend/api-client-and-schemas (soporte)

- **ID:** 86e301de4 | **Due:** 07-09-2026
- Nota: Jaicel lidera este epic en Sprint 1 por la importancia de tener schemas alineados desde el inicio

Tareas del epic:

1. **`apiRequest<T>` implementado en `src/lib/api/client.ts` cumpliendo los 7 puntos de §2.2**
   - ID: `86e301de7` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

2. **Tests de la jerarquía de errores (`src/lib/errors.ts` ya existe desde el scaffold) — verificar que coincide con la spec `CLAUDE.md` §5**
   - ID: `86e301dea` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

3. **Los 4 schemas de §2.3 existen, tipados sin `any`, exportando su `z.infer` como tipos**
   - ID: `86e301dec` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

4. **`category` (Garment) y `aesthetic` (Outfit) permanecen como `z.string()` con documentación de valores**
   - ID: `86e301dee` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

5. **`OutfitPositionSchema` y `VtonJobStatusSchema` son `z.enum` cerrados**
   - ID: `86e301dem` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

6. **`VtonJobStatusResponseSchema` tiene un `.refine()` probado que exige `result` cuando status=success**
   - ID: `86e301deq` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

7. **Las 4 funciones de dominio de §2.4 implementadas, sin lógica más allá de int** [data transformation]
   - ID: `86e301det` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

8. **Cobertura de tests ≥ 90% para `src/lib/api/`, `src/lib/errors.ts` y `src/schemas/`**
   - ID: `86e301dev` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

9. **Los fixtures JSON de §2.5 son la única fuente de datos de prueba reutilizado en unit + e2e**
   - ID: `86e301dex` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

10. **`npm run typecheck && npm run lint && npm run test` pasan en verde**
    - ID: `86e301dfb` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

### [EPIC] frontend/landing-and-auth-flow

- Tareas de auth (mayor riesgo de seguridad - ver abajo con Huascar)

11. **`npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde**
    - ID: `86e301dnp` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

### [EPIC] backend/domain-and-database (parte 1)

- **Nota:** Jaicel lidera las historias de Sprint 1 de este epic

> **Nota (§1 alcance):** las 4 tareas siguientes ejecutan en el **repo backend**, no en `MACHINE-BULLS`. Etiquetar `repo:backend` en ClickUp.

12. **Los 6 modelos SQLAlchemy (User, Garment, GarmentOwnership, Outfit, OutfitGarment, VTONJob) existen con exactamente los campos definidos, sin columnas no autorizadas**
    - ID: `86e3122fr` | Due: 07-09-2026
    - List: Build | Owner: Jaicel | `repo:backend`

13. **Los schemas Pydantic coinciden campo a campo con los Zod de api-client-and-schemas/spec.md**
    - ID: `86e3122fv` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

14. **Migración Alembic upgrade/downgrade simétrica, verificada en CI**
    - ID: `86e3122fy` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

15. **Trigger on_auth_user_created implementado y verificado (éxito y fallo transaccional)**
    - ID: `86e3122g5` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

---

## ASIENTO C — Huascar (2 tareas principales + apoyo a B en auth)

**Función:** QA & Validación (validar Sprint 0) + Refuerzo en seguridad (landing-and-auth-flow)

### [EPIC] Q1 — Test Automation (cobertura mínima)

1. **Gate de cobertura mínima por spec (80-90% según corresponda) enforced en CI**
   - ID: `86e302a2n` | Due: 07-09-2026
   - List: QA | Owner: Huascar

2. **Visual regression sobre los 5 componentes base (Button, Card, Badge, Skeleton, Progress), claro + oscuro; baselines en runner determinista (Docker/ubuntu)**
   - ID: `86e302a2b` | Due: 07-09-2026
   - List: QA | Owner: Huascar

### Apoyo a Jaicel — landing-and-auth-flow (par programador de seguridad)

**Nota:** Huascar actúa como tercer par en la tarea de mayor riesgo del sprint (autenticación). No valida Sprint 0 en este ciclo (ver §4.3 de team-rotation-plan.md). El enfoque es pair programming defensivo en auth.

---

## ASIENTO D — Manuel (6 tareas)

**Función:** Infra/MLOps/Release/Documentación

### [EPIC] Deploy / CI-CD — Sprint 0-1

- **ID:** 86e301e00 | **Due:** 07-09-2026

Tareas del epic:

1. **Endurecer el `ci.yml` existente (ya trae quality/build/e2e, Node 20) + CONFIGURAR BRANCH PROTECTION en `main` (require PR, ≥1 review CODEOWNERS, status checks obligatorios, sin push directo) + secreto `CODECOV_TOKEN`. Sin CI de backend en este repo, sin deploy a staging (Sprint 2+).**
   - ID: `86e301e09` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

2. **Logging estructurado + tracking de errores (Sentry tier gratuito) desde el inicio**
   - ID: `86e301e0m` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

3. **Auditoría de dependencias (npm audit / pip-audit) integrada al pipeline CI**
   - ID: `86e301e0t` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

### [EPIC] Q4 — Observabilidad (SLOs, Dashboards, Alerting)

4. **Dashboards de latencia y tasa de error por endpoint, con foco en `/api/v1/vton/try-on`**
   - ID: `86e302a5f` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

5. **Definir y documentar SLOs formales: p95 de latencia VTON, uptime objetivo d**[el proyecto]
   - ID: `86e302a5u` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

### [EPIC] Q6 — Release Management & Documentación

6. **Changelog versionado (formato Keep a Changelog) mantenido desde el primer release**
   - ID: `86e302a7u` | Due: 07-09-2026
   - List: Reportes | Owner: Manuel

---

## Verificación de Completitud

| Rol                      | Count                                          | Nota                                                                              |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| **Asiento A (Leonardo)** | 14 tareas ClickUp / 6 work-tareas (Tareas 0–5) | Tarea 1 y 2 implementadas (PRs abiertos). "Tarea 6" era duplicado → es de Jaicel. |
| **Asiento B (Jaicel)**   | 16 (4 de ellas `repo:backend`)                 | —                                                                                 |
| **Asiento C (Huascar)**  | 2 + pair                                       | Gate de cobertura: setup Sprint 1, enforcement Sprint 2 (P1#8)                    |
| **Asiento D (Manuel)**   | 6                                              | `86e301e09` incluye branch protection (hoy OFF)                                   |
| **Epics**                | 3                                              | F1, F2 (Leonardo), F3 (Jaicel)                                                    |
| **TOTAL proyecto**       | **41** (38 + 3)                                | **34 en este repo** + 4 en repo backend                                           |

---

## Notas de Implementación

- Correcciones de título y de alcance: **`sprint-1-manifest.md` §3–§7** (checklist de reconciliación para Manuel).
- Fechas: el tablero puede mantener `due 07-09-2026`; el arranque real de _features_ es **2 sep** (Sprint 0 cerró el 1 sep).
- **Épics en bloques:** Leonardo lidera F1+F2; Jaicel lidera F3+F4 (+B1 en repo backend); Huascar refuerza seguridad + Q1; Manuel Q2/Q4/Q6.
- Huascar **no** valida Sprint 0 en este ciclo (rezago no aplica en Sprint 1 — refuerza auth + monta gates).
- La reconciliación del tablero ClickUp la ejecuta el **Asiento D (Manuel)** — ver `sprint-1-manifest.md` §7.
