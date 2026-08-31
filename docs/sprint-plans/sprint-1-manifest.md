# Sprint 1 — Manifiesto canónico (repo ↔ ClickUp)

**Estado:** fuente de verdad de _estructura_ del Sprint 1. Derivado de las specs de
`openspec/specs/frontend/`, los `sprint-1-init-<name>.md` y `team-rotation-plan.md` §7.
**ClickUp debe reflejar esto**, no al revés. La reconciliación del tablero es tarea del
Asiento D (Manuel) — checklist al final.

> Por qué existe: `sprint-1-task-list.md` y varios docs quedaron con datos previos al scaffold
> (8 componentes/Storybook/`providers.ts`/"5 casos de error"/"6 requisitos §2.5"/fechas 26 ago).
> Este manifiesto es la versión corregida; `sprint-1-task-list.md` ya fue alineado con él.

---

## 1. Ventana y asientos

|                           |                                                                  |
| ------------------------- | ---------------------------------------------------------------- |
| Sprint 0 (scaffold)       | entregado 31 ago–1 sep 2026 (PR `chore/sprint-1-prep`, mergeado) |
| Sprint 1 (features)       | **2 – 8 sep 2026**                                               |
| Review + Sprint 2 kickoff | 9 sep 2026                                                       |

| Asiento             | Persona      | Epics Sprint 1                                                                                                                      |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| A — Feature Lead    | **Leonardo** | `frontend/design-system` (F1), `frontend/app-shell-and-navigation` (F2)                                                             |
| B — Feature Support | **Jaicel**   | `frontend/api-client-and-schemas` (F3), `frontend/landing-and-auth-flow` (F4), `backend/domain-and-database` (B1, **repo backend**) |
| C — QA & Validación | **Huascar**  | `Q1` (test automation), apoyo a F4 (auth)                                                                                           |
| D — Infra/Release   | **Manuel**   | `Q2` (CI/CD), `Q4` (observabilidad), `Q6` (release)                                                                                 |

## 2. Conteo

**Sprint 0 (entorno):** 9 tareas (S0-1 … S0-9), 7 `Done`, 2 `TODO` (branch protection,
reconciliación ClickUp) — todas de Manuel salvo scaffold/tokens/specs (Leonardo). Ver
`sprint-1-task-list.md` § "SPRINT 0". A crear en el tablero para trazabilidad (`constitution` §5).

**Sprint 1 (features):** **38 tareas + 3 epics = 41** para el _proyecto_ (cifra de
`sprint-1-task-list.md`). De esas, **4 son de Jaicel en el repo backend** (`86e3122fr/fv/fy/g5`).
En **este repo (frontend)**: 34 tareas + 3 epics.

> La cifra "44/47" de `SPRINT-1-KICKOFF-VALIDATION.md` incluía tareas de ML/Data que P0#3
> sacó del alcance frontend. Se descarta.

---

## 3. Asiento A — Leonardo (14 tareas ClickUp → 6 work-tareas)

Las 6 work-tareas del `sprint-1-init-leonardo.md` agrupan las 14 tareas de ClickUp:

| #   | Work-tarea (rama)                                                              | Tareas ClickUp que cierra                                       | Estado                      |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------- |
| 0   | Verificar scaffold                                                             | — (Tarea 0 del prompt)                                          | ✅ hecho (Sprint 0)         |
| 1   | `feat/tarea1-design-tokens` — `cn()`, `getContrastRatio()`, guard de contraste | `86e301dd8`, `86e301dda`, `86e301ddf`                           | ✅ implementado, PR abierto |
| 2   | `feat/tarea2-theme` — `ThemeToggle`, no-FOUC                                   | `86e301ddw`, `86e301dpm`                                        | ✅ implementado, PR abierto |
| 3   | `feat/tarea3-providers` — `defaultQueryClientConfig`, slots de layout          | `86e301dp5`                                                     | pendiente                   |
| 4   | `feat/tarea4-ui-components` — 5 componentes + tests + a11y                     | `86e301ddn`, `86e301de2`                                        | pendiente                   |
| 5   | `feat/tarea5-app-shell` — nav, `error.tsx`, `not-found`, `isNavItemActive`     | `86e301dp7`, `86e301dp8`, `86e301dpf`, `86e301dpk`, `86e301dpw` | pendiente                   |
| —   | verde global                                                                   | `86e301ddy` (rolling)                                           | —                           |

### Correcciones de título en ClickUp (Asiento A)

| ID          | Título actual (obsoleto)                               | Título correcto                                                                                                                                                               |
| ----------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `86e301ddn` | "Los **8** componentes de §2.4… con **Storybook**"     | "Los **5** componentes de §2.4 (Button, Card, Badge, Skeleton, Progress), tipados sin `any`, usando `cn()`. **Sin Storybook.**"                                               |
| `86e301dpf` | "`GlobalError` cubre los **5 casos**"                  | "`GlobalError` cubre las **4 ramas** (`ApiError`, `NetworkError`, `ValidationError`, `Error` genérico), cada una con copy y fallback UI"                                      |
| `86e301dpw` | "Cobertura ≥ 80% en `shell/` y `app/providers.**ts**`" | "Cobertura **medida** en `src/components/shell/` y `src/app/providers.**tsx**` (el **gate ≥ 80%** entra en Sprint 2 — P1#8)"                                                  |
| `86e301dda` | "pares de §2.1… test de contraste AA"                  | "Los **6 pares de texto** cumplen ≥ 4.5:1 en claro y oscuro **+** `globals.css` sincronizado con `design-tokens.ts`"                                                          |
| `86e301de2` | "Los **6 requisitos** de accesibilidad de **§2.5**"    | "Los requisitos de a11y de la Requirement _Accessibility compliance_ cubiertos por test (aria-disabled Button, aria-busy Skeleton, role Progress, texto-no-solo-color Badge)" |

**Tarea 6 (del init prompt anterior) — ELIMINAR de Asiento A.** El esqueleto de API client y
los tests de `errors.ts` son de **Jaicel**, tareas `86e301de7` / `86e301dea` (epic F3, Sprint 1).
`src/lib/errors.ts` ya existe (scaffold). Ver `CLAUDE.md` §10 D4.

---

## 4. Asiento B — Jaicel (16 tareas)

Sin cambios de alcance, con estas correcciones:

| ID                                                 | Corrección                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `86e301dea`                                        | Ref `CLAUDE.md §3.3` → **§5** (jerarquía de errores). `src/lib/errors.ts` **ya existe** (scaffold) → la tarea es _tests_ + verificar contra la spec, no crear de cero. |
| `86e3122fr`, `86e3122fv`, `86e3122fy`, `86e3122g5` | **Ejecutan en el repo backend**, no en `MACHINE-BULLS`. Etiquetar `repo:backend` en ClickUp para que no cuenten como avance de este repo.                              |
| `86e301de7`                                        | `apiRequest<T>` consume `NEXT_PUBLIC_API_BASE_URL` (D3), y `defaultQueryClientConfig` lo comparte con la Tarea 3 de Leonardo.                                          |

---

## 5. Asiento C — Huascar (2 + pair)

| ID          | Corrección                                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `86e302a2b` | "visual regression sobre los **8** componentes" → **5** (Button, Card, Badge, Skeleton, Progress). Requiere render determinista (Docker/`ubuntu` runner) o los baselines divergen por fuentes del SO. |
| `86e302a2n` | Gate de cobertura: **setup** en Sprint 1, **enforcement como merge-gate** en Sprint 2 (P1#8). En Sprint 1 sube el reporte a Codecov (requiere `CODECOV_TOKEN`, ver §6).                               |

---

## 6. Asiento D — Manuel (6 tareas) — mayores correcciones

| ID                       | Corrección                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `86e301e09`              | El `ci.yml` **ya existe** (Sprint 0: 3 jobs `quality`/`build`/`e2e`, Node 20, `actions/*@v4`). La tarea pasa a: **(a)** endurecerlo (audit step, cache de Playwright), **(b)** **configurar branch protection en `main`** — require PR, ≥1 review vía `CODEOWNERS`, status checks obligatorios (`quality`/`build`/`e2e`), bloquear push directo y force-push (hoy está **OFF**), **(c)** añadir el secreto `CODECOV_TOKEN`. **Quitar** del alcance: CI de backend en este repo (§1 frontend-only), `./dist/` (Next usa `.next/`), deploy a staging (Sprint 2+). |
| `86e301e0m`              | Repo frontend → `@sentry/nextjs` (no `@sentry/react`), logging con `pino`. La parte backend (`structlog`, `sentry-sdk` Python) va en el repo backend.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `86e301e0t`              | Fold del `npm audit` dentro del job `quality` del `ci.yml` existente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `86e302a5f`, `86e302a5u` | Prometheus `/metrics`, Grafana, `docker-compose`, métricas de `/api/v1/vton/try-on` → **repo backend**. En Sprint 1 este repo: reporte de **Web Vitals** (`next/web-vitals`) + el **documento** `docs/operations/slos.md` (targets, sin instrumentación todavía).                                                                                                                                                                                                                                                                                               |
| `86e302a7u`              | La entrada `v0.1.0-alpha` del changelog en el prompt dice "**8** base components (Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner)" → **5** (Button, Card, Badge, Skeleton, Progress). "Password hashing with bcrypt" → **auth es Supabase**, sin bcrypt propio.                                                                                                                                                                                                                                                                                    |

---

## 7. Checklist de reconciliación ClickUp (dueño: Manuel / Asiento D)

Aplicar en el tablero **MachineBulls⚙️🐂**, lista `Build` salvo indicado:

- [ ] **Crear las 9 tareas de Sprint 0** (S0-1 … S0-9, `sprint-1-task-list.md` § "SPRINT 0"),
      7 en estado `complete` con enlace al commit/rama, S0-8 y S0-9 en `to do` (Manuel).
- [ ] Retitular `86e301ddn`, `86e301dpf`, `86e301dpw`, `86e301dda`, `86e301de2` (§3 de este doc).
- [ ] Retitular `86e302a2b` (5 componentes), `86e301dea` (ref §5 + "ya existe").
- [ ] Eliminar la tarea "Tarea 6 / API skeleton" del Asiento A si se creó como duplicado (los originales son `86e301de7`/`86e301dea` de Jaicel).
- [ ] Etiquetar `86e3122fr/fv/fy/g5` con `repo:backend`.
- [ ] `86e301e09`: reescribir descripción (§6) + añadir sub-checklist de branch protection.
- [ ] Mover fechas: si el tablero tiene `due 07-09-2026` para todo, mantener; el arranque real de features es 2 sep (Sprint 0 cerró 1 sep).
- [ ] Verificar: 0 tareas sin `Assignee`, 0 sin `Due`, 0 sin AC (regla `constitution.md` §5).
- [ ] Estado: las tareas de Leonardo `86e301dd8/dda/ddf` (Tarea 1) y `86e301ddw/dpm` (Tarea 2) → `update required` / `in review` (PRs abiertos, sin mergear).
- [ ] Confirmar conteo final del tablero contra §2 de este doc y anotar la cifra en `CLAUDE.md` §10 P1#4.
- [ ] Exportar `SPRINT-1-MASTER.csv` a `docs/clickup/` como evidencia del estado alineado.

Cuando todo lo anterior esté hecho: **ClickUp = verde y alineado con la documentación.**

---

## 8. Integración ClickUp ↔ repo (futuro, sin secretos en prompts)

Para automatizar la sincronización: servidor MCP de ClickUp con el token en un secreto local
(`.env` fuera de git, o secret del runner), **nunca** pegado en un prompt. Hasta entonces la
sincronización es manual y la hace el Asiento D.
