# SPRINT 1 EXECUTION PLAN

> ⚠️ **Documento previo al scaffold.** Estructura canónica y correcciones (5 componentes no 8,
> sin Storybook, `providers.tsx`, 4 ramas de error, Tareas 0–5, fechas 2–8 sep, "Tarea 6" es de
> Jaicel): **`sprint-1-manifest.md`**. Este plan conserva ceremonias y timeline como referencia.


## Resumen Ejecutivo

**Sprint 1 es el cimiento.** Entrega simultáneamente en 4 tracks paralelos:
- **Track A (Leonardo):** Frontend design system + app shell (14 tareas, ~50 SP)
- **Track B (Jaicel):** Frontend API client + backend domain layer + auth (16 tareas, ~55 SP)
- **Track C (Huascar):** QA gates + visual regression + security pair (2 + pair, ~25 SP)
- **Track D (Manuel):** CI/CD + observability + changelog (6 tareas, ~35 SP)

**Total:** 38 tareas + 3 epics, **~165 SP distribuido** (41 tasks in ClickUp)

**Objetivo final:** Fin de día 14 (8 sep), proyecto listo para Sprint 2. Todos los componentes base, auth funcionando, CI/CD estable, observabilidad lista.

---

## Guía de Lectura: Cómo Usar Este Plan

### 1. Documento de Tareas de Sprint 1
**Archivo:** `sprint-1-task-list.md`
- **Qué es:** Lista completa de las 41 tareas en ClickUp con IDs
- **Cómo usarlo:** 
  - Buscar una tarea por ID: `86e301dd8` → abre en ClickUp
  - Ver qué tarea es responsabilidad de quién
  - Entender dependencias (qué task bloquea a cuál)
- **No es:** Instrucción detallada de cómo implementar. Es solo la agenda.

### 2. Prompts de Inicialización (1 por Rol)
**Archivos:** 
- `sprint-1-init-leonardo.md` (Asiento A)
- `sprint-1-init-jaicel.md` (Asiento B)
- `sprint-1-init-huascar.md` (Asiento C)
- `sprint-1-init-manuel.md` (Asiento D)

**Qué es:** Instrucción detallada para CADA rol. Qué hacer, en qué orden, cómo validar.
**Cómo usarlo:** 
- Leonardo: abre `sprint-1-init-leonardo.md` → lee secciones 1-4 (14 tareas mapeadas)
- Jaicel: abre `sprint-1-init-jaicel.md` → lee secciones 1-5 (16 tareas mapeadas)
- Huascar: abre `sprint-1-init-huascar.md` → lee secciones 1-2 + pair (2 tareas + pair)
- Manuel: abre `sprint-1-init-manuel.md` → lee secciones 1-5 (6 tareas mapeadas)

**Cada prompt:** Define éxito (acceptance criteria), dependencias, duración, riesgos, cómo entregar.

---

## Timeline de Sprint 1 (Caso Base)

```
26 ago (Lunes)    Sprint Planning (30 min) + Kick-off (1h)
27 ago            Asientos inician en paralelo
28 ago - 4 sep    Semana 1 (6 días laborales)
5 sep - 8 sep     Semana 2 (4 días)
8 sep (jueves)    Sprint Review + Retrospective
```

### Por Rol (Paralelo)

#### Leonardo (Asiento A) — Componentes de UI
- **Fase 1 (27-28 ago):** Tokens de diseño → TailwindCSS. Validación de contraste. Función `cn()`.
  - Blocker: nada
  - Output: tokens importables, `cn()` testeado
  
- **Fase 2 (29-31 ago):** 8 componentes de UI. Provider de tema sin parpadeo.
  - Blocker: Tarea 1 (tokens)
  - Output: 8 componentes en Storybook, 0 parpadeo en theme change
  
- **Fase 3 (1-4 sep):** App shell (TopNav/BottomTabBar), navegación activa, GlobalError, SkipToLink.
  - Blocker: Fase 2
  - Output: Navegación completa, accesible, responsive
  
- **Fase 4 (5-8 sep):** Tests + visual baselines + coverage.
  - Blocker: Fases 1-3 completas
  - Output: 14 tests verdes, ≥80% coverage, 16 baselines capturados

**Duración total:** 14 días (distribuido en sprints)  
**Entrega:** 14 tareas completadas, UI cimiento listo

#### Jaicel (Asiento B) — Schemas + Backend Domain
- **Fase 1 (27-29 ago):** Schemas Zod. Enums. Validación condicional. Strings abiertos.
  - Blocker: nada
  - Output: 4 schemas listos, cero `any`
  
- **Fase 2 (30 ago-4 sep):** Cliente API. Error hierarchy. Fixtures JSON. Auth endpoints.
  - Blocker: Fase 1
  - Output: `apiRequest<T>()` robusto, 3 auth endpoints (sign up/in/out)
  
- **Fase 3 (5-7 sep):** Backend models, Pydantic schemas, migraciones, trigger.
  - Blocker: Fase 2 (alineación de schemas)
  - Output: 6 modelos SQLAlchemy + Alembic migrations + trigger funcionando
  
- **Fase 4 (8 sep):** E2E auth tests, cobertura ≥90%.
  - Blocker: Fases 1-3 completas
  - Output: 16 tareas verdes, auth flow end-to-end validado

**Duración total:** 14 días  
**Entrega:** 16 tareas completadas, contrato frontend↔backend sólido

#### Huascar (Asiento C) — QA & Security
- **Semana 1 (27-31 ago):** Coverage gate setup. Visual regression baselines.
  - Paralelo a Leonardo + Jaicel (espera sus tests)
  - Output: GitHub Actions gate + 16 baselines listos
  
- **Semana 2 (1-8 sep):** Pair con Jaicel en auth security. 8 tests de edge cases.
  - Paralelo a Jaicel auth (refuerzo defensivo)
  - Output: Threat model documentado, 8 security tests verdes

**Duración total:** 14 días (menos "busy work", más validación)  
**Entrega:** 2 tareas completadas + pair security, calidad gates en CI

#### Manuel (Asiento D) — Infra & Observability
- **Semana 1 (27-31 ago):** CI/CD pipeline. Logging + Sentry. Dependency audit.
  - Paralelo a otros (no bloqueado)
  - Output: GitHub Actions workflow < 10 min, Sentry recibiendo eventos
  
- **Semana 2 (1-8 sep):** SLOs + dashboards. Changelog.
  - Espera que otros tengan builds + metrics
  - Output: SLOs documentados, Grafana local operacional, CHANGELOG.md v0.1.0-alpha

**Duración total:** 14 días  
**Entrega:** 6 tareas completadas, infraestructura operacional lista

---

## Cómo Leer la Lista de Tareas por ClickUp

Cada tarea en ClickUp tiene:
- **ID:** Referencia única (ej: `86e301dd8`)
- **Epic:** Dueño feature (ej: `[EPIC] frontend/design-system`)
- **Due Date:** 07-09-2026 (fin de Sprint 1)
- **Assignee:** Leonardo, Jaicel, Huascar, o Manuel
- **Tags:** `sprint:1`, `role:frontend` o `role:backend`, `type:build`
- **Description:** Goal, AC, Ref spec

**Para navegar de esta guía a ClickUp:**
1. Abre ClickUp → Proyecto → Build list
2. Busca tarea por ID o nombre
3. Lee descripción + acceptance criteria
4. Abre spec referenciada en descripción

**Ejemplo:**
- Este doc: "Tarea 1 (Leonardo): `tailwind.config.ts` deriva sus colores..."
- ID: `86e301dd8`
- ClickUp search: `86e301dd8` → abre tarea
- Description dice: "Ref spec: frontend/design-system/spec.md §2.1, 2.2"
- Abre spec en `docs/specs/frontend/design-system/spec.md`

---

## Dependencias Clave (Bloqueadores)

```
Sprint 1 Startup
    ↓
Leonardo (Tarea 1: Tokens) → Jaicel (Tarea 1-4: Schemas)
    ↓                           ↓
Leonardo (Tareas 2-4)      Jaicel (Tareas 5-10, 15-16)
    ↓                           ↓
Leonardo (Tareas 5-6)  +   Huascar (Pair Auth) [CONCURRENT]
    ↓                           ↓
Leonardo (Tareas 7-14)     Jaicel (Tareas 11-14: Backend)
    ↓                           ↓
Huascar (Visual Regression) [NEEDS Leonardo components]
    ↓
Huascar + Leonardo (Tareas 13-14: Baselines + Coverage)
    ↓
Sprint 1 Complete
```

**Camino crítico:** Jaicel Domain + Leonardo UI (~12-13 días) + Huascar validation (días 13-14).

**Paralelización máxima:**
- Leonardo + Jaicel + Manuel: COMPLETAMENTE independientes primeros 3-4 días
- Huascar: comienza capturando, puede avanzar en paralelo

---

## Cómo Ejecutar Cada Track

### Leonardo (14 tareas, ~50 SP, 14 días)

**Kickoff:** Lunes 27 ago, 09:00  
**Prompt:** `sprint-1-init-leonardo.md` (completo)  
**Primer paso:** Crear `src/config/design-tokens.ts` basándose en spec §2.1

```bash
# Día 1 (27 ago)
npm init
npm install tailwindcss@latest typescript react
# Implement: design-tokens.ts
# Write: tailwind.config.ts (derivado)
# Write: test "tokens import correctly"
npm run test  # debe pasar

# Día 2-3
# Implement: cn() function
# Implement: 8 UI components
# Write: Storybook config
npm run storybook  # debe abrir sin errores

# ... (sigue spec en init-leonardo.md)

# Día 14 (8 sep)
npm run typecheck
npm run lint
npm run test
npm run test:visual
# Commit + Push
```

**Entrega (fin 8 sep):**
- 14 tareas en ClickUp = Done
- Tasa de avance: 1 tarea/día (es realista)

### Jaicel (16 tareas, ~55 SP, 14 días)

**Kickoff:** Lunes 27 ago, 09:00  
**Prompt:** `sprint-1-init-jaicel.md` (completo)  
**Primer paso:** Crear `src/schemas/index.ts` con 4 schemas Zod

```bash
# Día 1
npm install zod@latest pydantic
# Implement: frontend/api-client-and-schemas specs
# Write: schemas/index.ts (4 schemas)
npm run typecheck  # debe pasar sin `any`

# Día 2-5
# Implement: apiRequest<T>()
# Implement: auth endpoints (sign up, in, out)
# Write: fixtures JSON

# Día 6-10
# Implement: SQLAlchemy models (6 tables)
# Implement: Pydantic schemas (sync con Zod)
# Implement: Alembic migrations
# Implement: trigger on_auth_user_created

# Día 11-14
# Write: E2E auth tests
# Coverage: ≥90%

pytest tests/ -v --cov=src/domain
npm run test -- --coverage
# Commit + Push
```

**Entrega (fin 8 sep):**
- 16 tareas en ClickUp = Done
- Tasa de avance: ~1.1 tareas/día

### Huascar (2 tareas + pair, ~25 SP, 14 días)

**Kickoff:** Lunes 27 ago, 09:00  
**Prompt:** `sprint-1-init-huascar.md` (completo)  
**Primer paso:** Diseñar GitHub Actions `.coverage-gate.yml`

```bash
# Día 1-3
# Implement: GitHub Actions coverage gate
# Implement: Visual regression test suite (Playwright)

# Día 4-14 [Paralelo]
# Pair con Jaicel (2-3h/día):
#   - Review auth code (security mindset)
#   - Write edge case tests (session hijacking, CSRF, timing attacks, etc.)
#   - Document threat model

# Día 10-14
# Capture 16 baselines (componentes Leonardo)
# Commit baselines

npm run test:visual
# Verify CI gate blocking PRs

# Fin Sprint
```

**Entrega (fin 8 sep):**
- 2 tareas + pair = Done
- Tasa: menos "puro coding", más "validación crítica"

### Manuel (6 tareas, ~35 SP, 14 días)

**Kickoff:** Lunes 27 ago, 09:00  
**Prompt:** `sprint-1-init-manuel.md` (completo)  
**Primer paso:** Crear `.github/workflows/ci.yml`

```bash
# Día 1-3
# Implement: GitHub Actions CI workflow
# Implement: frontend lint→typecheck→test→build
# Implement: backend pytest

# Día 4-6
# Implement: Sentry setup (frontend + backend)
# Implement: structured logging (pino + structlog)

# Día 7-8
# Implement: npm audit + pip-audit

# Día 8-11
# Implement: SLOs documento
# Implement: Prometheus metrics
# Implement: Grafana dashboard (local)

# Día 12-13
# Implement: CHANGELOG.md (Keep a Changelog)
# Tag git v0.1.0-alpha

# Test CI
npm run audit
pytest tests/ --cov
# Commit + Push
```

**Entrega (fin 8 sep):**
- 6 tareas en ClickUp = Done
- Tasa: ~0.4 tareas/día (cada tarea es infraestructura compleja)

---

## Sprint Ceremony Schedule

| Ceremonia | Día | Hora | Duración | Participantes |
| --- | --- | --- | --- | --- |
| **Sprint Kickoff** | Lun 26 ago | 09:00 | 90 min | Todos (4) + PM |
| **Daily Standup** | Mar-Vie 27-31 ago | 09:30 | 15 min | Todos (4) |
| **Daily Standup** | Lun-Jue 1-4 sep | 09:30 | 15 min | Todos (4) |
| **Pair Review (Auth)** | Mié 29 ago | 14:00 | 60 min | Jaicel + Huascar + Leonardo |
| **Mid-Sprint Check** | Mié 29 ago | 15:30 | 30 min | Todos (4) + PM |
| **Pair Review (Auth 2)** | Mié 5 sep | 14:00 | 60 min | Jaicel + Huascar + Leonardo |
| **Sprint Review** | Jue 8 sep | 10:00 | 60 min | Todos (4) + PM + Stakeholders |
| **Retrospective** | Jue 8 sep | 11:15 | 45 min | Todos (4) + PM |

---

## Definición de Done (DoD) — Sprint 1

Cada tarea es DONE cuando:
- ✅ Código escrito según spec
- ✅ Tests pasan (unit + E2E donde aplicable)
- ✅ TypeScript strict mode sin errores
- ✅ Cobertura ≥80-90% (según path)
- ✅ Linting sin warnings
- ✅ Documentación actualizada (si aplica)
- ✅ Comentario en Epic de ClickUp con qué quedó completo + decisiones técnicas
- ✅ PR merged a `main` (o `develop` si existe)

---

## Riesgos Conocidos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Leonardo tokens divergen (Jaicel schemas no syncan) | Medium | High | Daily sync (15 min) en standups |
| Supabase auth errors no están documentados | Medium | High | Test cada error code Supabase real en Sprint 1 |
| CI timeout (< 10 min target breaks) | Low | Medium | Presupuestar tiempo: build 2min, test 5min, margen 3min |
| Visual baselines no se sync entre devs (OS differences) | Low | Medium | Run baselines in Docker (ubuntu), commit |
| Trigger SQL no se ejecuta (permission issue) | Low | High | Test early (día 10), no dejar para fin de sprint |
| Pair time gets deprioritized (solo Jaicel avanzando) | Medium | Medium | Schedule pair bloques en calendar (30min x 3, por semana) |
| Scope creep (agregar features que no están en spec) | High | High | Code review strict — solo spec, nada extra |

---

## Success Metrics (Fin de Sprint 1)

| Métrica | Target | Actual | Status |
| --- | --- | --- | --- |
| Tareas completadas | 41 | ? | TBD |
| Cobertura promedio | ≥85% | ? | TBD |
| Tests pasando | 100% | ? | TBD |
| Specs implementadas | 14/14 | ? | TBD |
| CI/CD deployment | ≥1x | ? | TBD |
| Accesibilidad (axe violations) | 0 | ? | TBD |
| Security issues (OWASP) | 0 critical | ? | TBD |
| Team satisfaction (retrospective) | ≥3/5 | ? | TBD |

---

## Entrega Final (8 sep, 17:00)

**En ClickUp:**
- [ ] Todas las 41 tareas en estado "Done"
- [ ] Todos los Epics comentados (handoff notes)

**En Git:**
- [ ] Tag `v0.1.0-alpha` en main
- [ ] Tag `sprint-1-complete` para referencia

**En Documentación:**
- [ ] CHANGELOG.md con v0.1.0-alpha
- [ ] `docs/operations/slos.md` finalizado
- [ ] Threat model documentado
- [ ] Specs todas linkedadas desde README

**Artefactos Entregados:**
- Frontend: design-system + app-shell, 100% funcional, zero parpadeo
- Backend: domain models + migrations + trigger, all working
- Auth: sign up/in/out, todos los edge cases cubiertos
- CI/CD: GitHub Actions < 10min
- Observability: SLOs, Prometheus, Grafana, Sentry

**Equipo Listo para Sprint 2:**
- ✅ Leonardo: avanza a frontend/wardrobe-flow (F5)
- ✅ Jaicel: cierra backend/domain-and-database + inicia backend/api-gateway
- ✅ Huascar: valida Sprint 1 output
- ✅ Manuel: refuerza CI/CD con E2E improvements + MLOps

---

## Próximos Pasos (Después de Sprint 1)

**Sprint 2 (9-22 sep):** Wardrobe management + Garment analysis  
**Sprint 3 (23 sep - 6 oct):** Recommendation engine + pagination  
**Sprint 4 (7-20 oct):** Outfit management + promotions  
**Sprint 5-8:** VTON, profile, performance, release hardening  
**Sprint 9 (2-15 dic):** Buffer + final demo  
**Go-Live:** 15 dic 2026

