# CLAUDE.md — StyleMe Frontend

Memoria persistente del agente para el repositorio **`MACHINE-BULLS`** (frontend de StyleMe/StyleSync IA — proyecto de equipo, Taller de Sistemas Inteligentes). Este documento es la fuente de verdad operativa: toda sesión futura de Claude Code en este repo debe leerlo y respetarlo antes de escribir código.

> **Alcance de este repositorio:** SOLO frontend (Next.js). El backend Python/FastAPI/ML descrito en `docs/context/plan-base.md` (clasificador CLIP, motor de compatibilidad, pipeline VTON) vive en un repositorio/servicio separado y se consume aquí exclusivamente vía HTTP/JSON, según los contratos de la Sección 11 de `docs/context/plan-base.md`.
>
> **Decisión de plataforma vigente [registrada retroactivamente]:** el frontend es una **aplicación web Next.js**, no la app móvil React Native descrita en el plan técnico anterior (`.speckit/features/001-probador-virtual/plan.md`, superseded — ver nota en ese archivo). Toda spec en `openspec/specs/` asume web.
>
> **Gobernanza del equipo (no negociable, `.speckit/constitution.md` §3):** rama `main` protegida, cero commits directos, todo cambio vía Pull Request con ≥1 revisor aprobando, y **declaración explícita de uso de IA en cada PR** (qué %/sección fue asistida y qué pruebas la validaron). Esto aplica también a sesiones de Claude Code: ningún cambio de esta sesión se fusiona a `main` sin ese proceso.

---

## 1. Visión General del Producto

**StyleMe** es una plataforma que permite a un usuario digitalizar su guardarropa, recibir combinaciones de outfits basadas en teoría del color y compatibilidad aprendida, y visualizar el resultado sobre su propia foto mediante un probador virtual (VTON) asíncrono.

Este repositorio implementa la **interfaz web** que consume tres familias de endpoints del backend:

| Dominio | Endpoint backend (contrato) | Naturaleza |
| :--- | :--- | :--- |
| Prendas | `POST /api/v1/garments/upload` | Síncrono (respuesta directa) |
| Outfits | `POST /api/v1/outfits/recommend` | Síncrono (respuesta directa) |
| VTON | `POST /api/v1/vton/try-on` + `GET /api/v1/vton/status/{job_id}` | Asíncrono (job + polling) |

El frontend NO reimplementa lógica de dominio (clasificación, scoring cromático, generación de imágenes). Su responsabilidad es: captura de datos del usuario, validación de forma en el borde, orquestación de llamadas, estado de UI/carga/error, y renderizado.

---

## 2. Stack Tecnológico (Decisión Cerrada)

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Framework | Next.js 14/15, **App Router** | Server Components por defecto; Client Components solo donde haya interactividad/estado. |
| Lenguaje | TypeScript, **modo `strict` obligatorio** | Equivalente frontend al mandato de type hints estrictos del backend. |
| Estilos | Tailwind CSS | Utility-first, sin CSS-in-JS. |
| Componentes UI | shadcn/ui (Radix UI + Tailwind) | Componentes viven en el repo (`src/components/ui`), no en `node_modules` — se auditan y versionan como código propio. |
| Iconos | Lucide Icons | Según documento base. |
| Estado de servidor / caché | TanStack Query (React Query) | Toda comunicación con el backend pasa por hooks de TanStack Query, nunca `fetch` directo en componentes. |
| Estado de UI global | Zustand | Solo para estado de cliente puro (ej. wizard de onboarding, selección de prendas en curso). Nunca para cachear datos del servidor. |
| Validación de contratos | Zod | Equivalente frontend de Pydantic v2: todo payload que cruza la frontera red↔app se parsea con un schema Zod antes de usarse. Cero `as` / cero confianza ciega en `any` proveniente de `fetch`. |
| Testing unitario/integración | Vitest + React Testing Library | Rápido, nativo ESM/TS, compatible con Next.js. |
| Testing E2E | Playwright | Flujos críticos: upload de prenda, recomendación de outfit, ciclo completo de VTON (submit → polling → resultado). |
| Linting | ESLint (`next/core-web-vitals` + `typescript-eslint` strict) | Cero warnings tolerados en CI. |
| Formateo | Prettier | Integrado con ESLint, sin reglas de formato duplicadas en ESLint. |

### 2.1 Disciplina de Contratos Frontend↔Backend (crítico)

El backend aún no existe en este momento del proyecto. Para que la integración futura no degrade el estándar:

- Todo schema Zod que representa una respuesta del backend debe vivir en `src/schemas/api/` y **espejar exactamente** los modelos Pydantic descritos en la Sección 11 de `docs/context/plan-base.md` (nombres de campo, tipos, enums, nullability).
- Cuando el backend exponga su OpenAPI schema, evaluar generación automática de tipos/Zod (ej. `openapi-zod-client`) en vez de mantenerlos a mano — dejar esta tarea explícitamente pendiente en un spec futuro, no improvisarla ad-hoc.
- Ningún componente o hook debe asumir la forma de una respuesta sin pasarla por su schema Zod correspondiente. Un `parse` fallido se traduce siempre en un `ValidationError` tipado (ver §5), nunca en un fallo silencioso.
- Los `job_id`, `status` enums (`pending|processing|completed|failed`) y demás valores literales deben tipar-se como Zod `enum`/`literal`, nunca como `string` genérico.

---

## 3. Regla de Oro SDD (Spec-Driven Development)

**Flujo obligatorio, sin excepciones:**

```
SPEC (openspec/specs/*.md)  →  TEST (falla en rojo)  →  CODE (src/)  →  REFACTOR
```

1. **SPEC primero:** ninguna función, componente, hook o store se implementa sin que exista antes un archivo en `openspec/specs/` que defina su propósito, contrato (props/inputs/outputs tipados), casos de prueba y criterios de aceptación. Un cambio a una spec existente sigue el flujo del CLI de OpenSpec (`openspec/changes/<nombre>/proposal.md` + `design.md` + `tasks.md`, ver ejemplo real en `openspec/changes/harden-specs-from-qa-audit/`) antes de fusionarse en `openspec/specs/`.
2. **TEST en rojo:** se escribe la prueba (Vitest/RTL o Playwright) derivada de la spec, y se confirma que falla antes de escribir la implementación.
3. **CODE mínimo:** se implementa solo lo necesario para pasar la prueba, respetando tipado estricto y la arquitectura de carpetas (§4).
4. **REFACTOR:** se limpia manteniendo la suite en verde. No se introduce alcance no cubierto por la spec.

Está prohibido escribir código funcional en `src/` que no tenga spec y test asociados. Si el usuario pide una feature sin spec previa, la sesión debe primero proponer/generar la spec correspondiente en `openspec/specs/` antes de tocar `src/`.

---

## 4. Estructura de Directorios

```
MACHINE-BULLS/
├── CLAUDE.md
├── .speckit/
│   └── constitution.md           # Gobernanza del equipo (PR, DoD, riesgos) — ver §9 abajo
├── docs/
│   ├── context/
│   │   ├── plan-base.md          # Documento fuente del proyecto completo (full-stack)
│   │   └── frontend-plan.md      # Planteamiento UX/flujos/design system del frontend
│   └── clickup/                  # Team charter, priorización de casos, estructura de tablero
├── openspec/
│   ├── config.yaml
│   ├── specs/                    # Especificaciones SDD (frontend) — fuente de verdad de contratos
│   └── changes/                  # Propuestas de cambio de spec (proposal/design/tasks, CLI OpenSpec)
├── src/                          # No existe aún — se crea solo tras spec (openspec/specs/) + test en rojo
│   ├── app/                      # Next.js App Router: rutas, layouts, pages, route handlers
│   ├── components/
│   │   ├── ui/                   # shadcn/ui — primitivos generados
│   │   └── shared/                # Componentes compuestos reutilizables entre features
│   ├── features/                 # Arquitectura por dominio (feature-sliced)
│   │   ├── garments/
│   │   │   ├── components/
│   │   │   ├── hooks/            # useUploadGarment, etc. (TanStack Query)
│   │   │   ├── api/               # funciones de fetch tipadas para este dominio
│   │   │   └── schemas/           # Zod schemas específicos del dominio
│   │   ├── outfits/
│   │   └── vton/
│   ├── lib/
│   │   ├── api/                   # cliente HTTP base, manejo de errores, interceptores
│   │   └── utils/
│   ├── hooks/                     # hooks genéricos no atados a un dominio
│   ├── stores/                    # Zustand stores
│   ├── schemas/
│   │   └── api/                   # Zod schemas que espejan contratos backend (§2.1)
│   ├── types/                     # tipos compartidos no derivados de Zod
│   └── config/                    # constantes, configuración de entorno tipada
├── tests/
│   ├── unit/                      # Vitest — funciones puras, schemas, utils
│   ├── integration/                # Vitest + RTL — componentes/hooks con mocks de red (MSW)
│   ├── e2e/                        # Playwright — flujos completos
│   └── fixtures/                   # datos de prueba, mocks de respuestas backend
├── public/
├── .env.example
├── .eslintrc / eslint.config.mjs
├── .prettierrc
├── tailwind.config.ts
├── tsconfig.json                   # strict: true, noUncheckedIndexedAccess: true
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 5. Arquitectura de Manejo de Errores (Frontend)

Jerarquía base en `src/lib/errors.ts`, análoga a la jerarquía de excepciones de dominio del backend:

- **`StyleMeError`** — clase base, extiende `Error`, lleva `code: string` y `cause?: unknown`.
  - **`ApiError`** — error HTTP del backend (status, código de error del payload, detalle). Se lanza desde el cliente HTTP (`src/lib/api/client.ts`) cuando la respuesta no es `2xx`.
  - **`ValidationError`** — falla de `zod.safeParse` sobre una respuesta o input del usuario. Lleva el `ZodIssue[]` original.
  - **`VTONJobTimeoutError`** — el polling de `GET /api/v1/vton/status/{job_id}` supera el límite de intentos/tiempo configurado sin llegar a `completed`/`failed`.
  - **`NetworkError`** — fallo de red (sin respuesta del servidor), distinto de un `ApiError`.

Reglas:
- Los hooks de TanStack Query nunca devuelven errores no tipados: el `queryFn`/`mutationFn` captura y relanza como una subclase de `StyleMeError`.
- Cada `app/**/error.tsx` (Error Boundary de Next.js) debe distinguir entre estas subclases para mostrar mensajes accionables (ej. `VTONJobTimeoutError` → "el proceso está tardando más de lo esperado, puedes seguir esperando o reintentar").
- Prohibido el patrón `catch (e) { console.log(e) }` sin re-lanzar o manejar tipadamente.

---

## 6. Guía de Estilo y Calidad

- **TypeScript estricto:** `strict: true` en `tsconfig.json`. Cero `any` explícito. `any` implícito es error de build. Preferir `unknown` + narrowing/Zod sobre `any`.
- **Cero hardcode de contratos:** cualquier forma de dato externo (API, `localStorage`, query params) se valida con Zod antes de tiparse como confiable.
- **Componentes:** un componente = una responsabilidad. Lógica de fetching vive en hooks (`useX`), no en el JSX del componente.
- **Documentación:** TSDoc solo en funciones/hooks exportados cuyo comportamiento no sea obvio por la firma (ej. reglas de reintento de polling). No documentar lo autoevidente.
- **Nombres:** archivos de componentes en `PascalCase.tsx`, hooks en `useCamelCase.ts`, schemas Zod exportados como `XSchema` con su tipo inferido `type X = z.infer<typeof XSchema>`.
- **Server vs Client Components:** por defecto Server Component; se marca `"use client"` solo cuando hay estado, efectos, o hooks de navegador/TanStack Query/Zustand.

---

## 7. Comandos CLI Estándar

```bash
# Desarrollo
npm run dev                # Next.js dev server

# Build / producción
npm run build
npm run start

# Calidad de código
npm run lint                # eslint . (cero warnings permitidos)
npm run lint:fix
npm run format               # prettier --write .
npm run format:check
npm run typecheck            # tsc --noEmit

# Testing
npm run test                 # vitest run (unit + integration)
npm run test:watch           # vitest (modo watch, TDD loop)
npm run test:coverage        # vitest run --coverage
npm run test:e2e             # playwright test
npm run test:e2e:ui          # playwright test --ui
```

Antes de considerar cualquier feature "hecha": `npm run typecheck && npm run lint && npm run test && npm run test:e2e` deben pasar en verde.

---

## 8. Fuente de Verdad del Producto

`docs/context/plan-base.md` es el documento de planteamiento completo (full-stack) del proyecto. Este `CLAUDE.md` es su traducción operativa **solo para la porción frontend**. Ante cualquier ambigüedad sobre reglas de negocio (categorías de prenda, estéticas soportadas, reglas de armonía cromática, estados de un `VTONJob`), la fuente de verdad es `docs/context/plan-base.md` §10-11 — no inventar campos ni estados no listados ahí.

---

## 9. Gobernanza del Equipo (vinculante, `.speckit/constitution.md`)

Este repositorio pertenece a un equipo de 4 personas (Manuel Jiménez — Scrum Master, Leonardo Ibarra — Product Owner, Huascar Durán y Jaicel Velasco — Development Team) para un proyecto académico de 18 semanas. Reglas no negociables que rigen cómo se integra cualquier trabajo de esta sesión:

- **Rama `main` protegida:** cero commits directos. Todo cambio entra vía Pull Request.
- **1 revisor mínimo** antes de merge.
- **Declaración de uso de IA obligatoria en cada PR:** qué % o sección fue asistida por IA (incluye Claude Code) y qué pruebas validaron ese trabajo. La responsabilidad técnica es siempre del equipo, nunca de la IA — ver commit `64be0d2` en `openspec/` para el formato de declaración ya usado en este repo.
- **Rechazo automático de PR** si contiene: credenciales/API keys/tokens/datos personales sensibles, pruebas fallidas, o criterios de aceptación incompletos.
- **Trazabilidad:** toda decisión de alcance, datos, arquitectura o evaluación debe quedar registrada en ClickUp o GitHub — si no está registrada, no cuenta como avance del equipo (`.speckit/constitution.md` §5).
- **Prohibido** ingresar secretos o datos personales en prompts de herramientas de IA (`.speckit/constitution.md` §3, §6).

Cualquier sesión de Claude Code que trabaje en este repo debe operar dentro de estas reglas — nunca asumir autorización implícita para saltárselas por conveniencia (ej. commitear directo a `main`, u omitir la declaración de IA en un PR).

---

## 10. Decisiones de Sprint 1 (30 ago - 8 sep 2026)

### P0: Bloqueadores Resueltos

**P0#1: Tarea 0 (Project Scaffold) es bloqueador crítico**
- Spec: `openspec/specs/frontend/project-scaffold/spec.md`
- Antes de que Leonardo inicie Tarea 1 (tokens), debe ejecutar Tarea 0: inicializar repo Next.js 15, TypeScript strict, Tailwind, Vitest, Playwright, CI pipeline
- Aceptación: `npm run typecheck && npm run test && npm run build` todas verdes
- Cronograma: 1-2 sep (antes de 2 sep 19:00 cuando comienza Tarea 1)

**P0#2: 5 componentes en Sprint 1, 4 diferidos a Sprint 2**
- Sprint 1 = Button, Card, Badge, Skeleton, Progress (5 comps)
- Sprint 2 = Dialog, Sheet, Tabs, Toast (4 comps)
- Storybook removido de Sprint 1 (no spec'd, no MVP-critical)
- Rationale: Scope defensible. Spec design-system §2.4 lista 9, pero Sprint 1 se reduce a 5 para cerrar en 10 días calendario

**P0#3: ML tasks → backend repo, CERO en frontend Sprint 1**
- EDA, ResNet training, Embedding training viven en backend repo o Sprints 2-9 backend
- Leonardo Sprint 1 = SOLO frontend (tokens, shell, componentes, API client)
- Rationale: CLAUDE.md §1 = "Alcance: SOLO frontend". No mezclar stacks

### P1: Inconsistencias Congeladas

**P1#4: 44 tareas Sprint 1, 185 total**
- ClickUp es fuente de verdad única (SPRINT-1-MASTER.csv)
- Congelado: sin cambios sin decisión registrada

**P1#5: 9 sprints × 18 weeks INNEGOCIABLE**
- 12 ago 2026 – 15 dic 2026 (locked)
- Si algo no cabe, se recorta alcance o se mueve a siguiente sprint
- No se negocia fecha

**P1#6: Storybook out**
- No en Sprint 1; evaluar Sprint 3 si PO lo prioriza

**P1#7: Spec refs precisas**
- Todas apuntan a `openspec/specs/frontend/…` (no `docs/specs/…`)
- Secciones validadas

**P1#8: E2E coverage deferred a Sprint 2**
- Sprint 1: >50% unit coverage (Vitest)
- Sprint 2: merge E2E + unit, push a >80% total

### P2: Gobernanza

**P2#1: DECISION-LOG en main**
- Ver `docs/SPRINT-1-PRE-PROJECT-COMPLETION-SUMMARY.md` para audit trail

**P2#2: OpenSpec migration**
- design-system + app-shell fully migrated (### Requirement + #### Scenario + #### AC)

**P2#3: No secrets**
- Zero hardcode de tokens, credenciales, datos personales en prompts/commits
- Credenciales → GitHub Actions secrets

---

## 11. Entrada a Sprint 1

**Sprint 1 comienza:** 2 sep 2026, 19:00  
**Período:** 2 sep - 8 sep 2026 (7 días calendario)  
**Tareas totales:** 44 (distributed: Build 19, QA 5, Deploy 5, Backend 15)  
**Asignaciones (Frontend ONLY this repo):**
- Leonardo Ibarra: 6 tareas (Tarea 0-6: scaffold blocker, tokens, theme, layout, 5 components, shell)
- Jaicel Velasco: 5+ tareas (backend/API schemas, models, migrations, gateway, adapters — NOT in this frontend repo)
- Huascar Camilo: 3 tareas (frontend test infrastructure, coverage gates, E2E setup)
- Manuel Jimenez: 4+ tareas (CI pipeline, monitoring, SLOs, dashboards)

**NOTE:** ML/Data/CLIP work (classification, training, embeddings) lives in **backend repository**, not here. This repo = frontend only (§1 Alcance).

**Sprint cierra:** 8 sep 2026, 23:59  
**Review & Sprint 2 Kickoff:** 9 sep 2026, 09:00  
**Next sprint lead:** Jaicel (Asiento A para Sprint 2)  

**Detalles completos:** `docs/sprint-plans/sprint-1-init-[name].md`

**Gobernanza recordatorio:** All work enters via PR (no commits directly to main), minimum 1 reviewer, IA usage declared in PR body.
