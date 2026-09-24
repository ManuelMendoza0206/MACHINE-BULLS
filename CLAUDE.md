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

| Dominio | Endpoint backend (contrato)                                     | Naturaleza                   |
| :------ | :-------------------------------------------------------------- | :--------------------------- |
| Prendas | `POST /api/v1/garments/upload`                                  | Síncrono (respuesta directa) |
| Outfits | `POST /api/v1/outfits/recommend`                                | Síncrono (respuesta directa) |
| VTON    | `POST /api/v1/vton/try-on` + `GET /api/v1/vton/status/{job_id}` | Asíncrono (job + polling)    |

El frontend NO reimplementa lógica de dominio (clasificación, scoring cromático, generación de imágenes). Su responsabilidad es: captura de datos del usuario, validación de forma en el borde, orquestación de llamadas, estado de UI/carga/error, y renderizado.

---

## 2. Stack Tecnológico (Decisión Cerrada)

| Categoría                    | Tecnología                                                             | Notas                                                                                                                                                                                          |
| :--------------------------- | :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                    | **Next.js 16 (App Router)** + **React 19**                              | Actualizado desde 14.2/18.3 en PR #15; Server Components por defecto; Client Components solo con interactividad/estado.                                                                       |
| Runtime                      | **Node.js 22** (`.nvmrc`)                                              | `engines.node ^20.19.0 \|\| >=22.12.0`; CI en Node 22.                                                                                                                                        |
| Lenguaje                     | TypeScript, **modo `strict` obligatorio** (`noUncheckedIndexedAccess`) | Equivalente frontend al mandato de type hints estrictos del backend.                                                                                                                           |
| Estilos                      | Tailwind CSS v4                                                        | Utility-first, CSS-first config (`@theme inline`), sin CSS-in-JS.                                                                                                                             |
| Componentes UI               | shadcn/ui (Radix UI + Tailwind)                                        | Componentes viven en el repo (`src/components/ui`), no en `node_modules` — se auditan y versionan como código propio.                                                                          |
| Iconos                       | Lucide Icons                                                           | Según documento base.                                                                                                                                                                          |
| Estado de servidor / caché   | TanStack Query (React Query)                                           | Toda comunicación con el backend pasa por hooks de TanStack Query, nunca `fetch` directo en componentes.                                                                                       |
| Estado de UI global          | Zustand                                                                | Solo para estado de cliente puro (ej. wizard de onboarding, selección de prendas en curso). Nunca para cachear datos del servidor.                                                             |
| Validación de contratos      | Zod                                                                    | Equivalente frontend de Pydantic v2: todo payload que cruza la frontera red↔app se parsea con un schema Zod antes de usarse. Cero `as` / cero confianza ciega en `any` proveniente de `fetch`. |
| Testing unitario/integración | Vitest + React Testing Library                                         | Rápido, nativo ESM/TS, compatible con Next.js.                                                                                                                                                 |
| Testing E2E                  | Playwright                                                             | Flujos críticos: upload de prenda, recomendación de outfit, ciclo completo de VTON (submit → polling → resultado).                                                                             |
| Linting                      | ESLint (`next/core-web-vitals` + `typescript-eslint` strict)           | Cero warnings tolerados en CI.                                                                                                                                                                 |
| Formateo                     | Prettier                                                               | Integrado con ESLint, sin reglas de formato duplicadas en ESLint.                                                                                                                              |

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
npm run dev                  # Next.js dev server (localhost:3000)
npm run build / npm run start

npm run verify               # typecheck + lint + test + build  ← el gate local
npm run lint / lint:fix
npm run format / format:check
npm run typecheck            # tsc --noEmit
npm run test / test:watch / coverage
npm run test:e2e             # playwright (--pass-with-no-tests)
```

**Git hooks** (husky, armados por `npm ci`): `pre-commit` → `lint-staged`; `commit-msg` →
`commitlint` (Conventional Commits); `pre-push` → `typecheck`. `--no-verify` solo en emergencia.

Antes de considerar una feature "hecha": `npm run verify && npm run test:e2e` en verde **y** CI verde en el PR.

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

## 10. Decisiones de Sprint 1

> Ventana: 26 ago – 8 sep 2026. Sprint 0 (scaffold + prep) cierra antes del arranque de
> features; Sprint 1 de features corre 2–8 sep (ver §11).

### P0: Bloqueadores Resueltos

**P0#1: Project Scaffold (Sprint 0 / Tarea 0) — RESUELTO**

- Spec: `openspec/specs/frontend/project-scaffold/spec.md`
- Stack real: **Next.js 16 + React 19 + Node 22**, TypeScript strict, Tailwind v4 (paleta
  derivada de `src/config/design-tokens.ts`), Vitest + RTL (jsdom), Playwright, CI de 3 jobs.
- Entregado vía PR `chore/sprint-1-prep`. Puertas verdes verificadas por ejecución real:
  `npm ci`, `typecheck`, `lint`, `test`, `test:e2e`, `build` → todas exit 0.
  Evidencia: `docs/sprint-plans/sprint-0/sprint-0-review.md`.

**P0#2: 5 componentes en Sprint 1, 4 diferidos a Sprint 2**

- Sprint 1 = Button, Card, Badge, Skeleton, Progress — coincide con `design-system/spec.md` §2.4.
- Sprint 2 = Dialog, Sheet, Tabs, Toast (sonner). Storybook fuera de Sprint 1.

**P0#3: ML/Data → repositorio backend, CERO en este repo**

- CLIP/ResNet, embeddings, EDA, entrenamiento viven en el repo backend (§1).
- Leonardo Sprint 1 = SOLO frontend (tokens, shell, 5 componentes, esqueleto de API client).

### Decisiones de diseño (Sprint 0)

**D1: Ajuste de paleta a WCAG AA (31 ago 2026, ratificado por el PO)**

- `frontend-plan.md` §5.1 fijaba `muted-foreground #71717A`, `success #16A34A`,
  `warning #D97706`, `destructive #DC2626`. Varios de esos pares de texto **no llegaban a 4.5:1**
  (p. ej. `muted-foreground` sobre `muted` ≈ 4.3:1; texto claro sobre `success` ≈ 3.4:1).
- Valores **light** movidos un paso más oscuros: `muted-foreground #52525B` (zinc-600),
  `success #15803D` (green-700), `destructive #B91C1C` (red-700). Añadidos `warning #B45309`
  (amber-700) y los cuatro `*-foreground`. Valores **dark** sin cambio (ya cumplían).
- Resultado verificado: los 6 pares de texto ≥ 4.5:1 en ambos temas (mín. 4.80:1).
- SoT de valores: `src/config/design-tokens.ts`. La prueba
  `tests/unit/config/design-tokens.contrast.test.ts` (Tarea 1) lo blinda en CI.

**D2: CSP baseline en `next.config.js`** — política enforced con `default-src 'self'`,
`frame-ancestors 'none'`, `object-src 'none'`, `img-src` acotado a Cloudinary, `connect-src` a la
API + Supabase. `script-src` conserva `'unsafe-inline'` (Next inyecta scripts inline y hay rutas
estáticas — una política nonce + `strict-dynamic` rompería la hidratación de esas rutas sin
forzarlas a dinámicas). **Follow-up (track infra):** endurecer a nonce + `strict-dynamic` en las
rutas autenticadas (dinámicas) vía `middleware.ts`. Se probó en Sprint 0 y se descartó para el
scaffold por incompatibilidad con el prerender estático.

**D3: Contrato de env** — `NEXT_PUBLIC_API_BASE_URL` (nombre de `api-client-and-schemas/spec.md`
§111), no `NEXT_PUBLIC_API_URL`. `.env.example` es la plantilla; falla en build si falta en runtime real.

**D4: "Tarea 6" (API client skeleton) — sale del Asiento A**. El esqueleto del API client y los
tests de `errors.ts` **ya son de Jaicel** en Sprint 1: tareas ClickUp `86e301de7` / `86e301dea`
del epic `api-client-and-schemas` (F3), que Jaicel lidera este sprint (`sprint-1-task-list.md`,
no rotación §7.1 que dice Sprint 2 — esa tabla es imprecisa). La "Tarea 6" del prompt de Leonardo
era un duplicado. `src/lib/errors.ts` ya existe (scaffold). Sprint 1 Leonardo = **Tareas 0–5**
(sus dos epics: design-system + app-shell) — cierra la brecha de cronograma del Asiento A.

**D5: Fuente de verdad del alcance** — estructura canónica del Sprint 1 en
`docs/sprint-plans/sprint-1/sprint-1-manifest.md` (derivada de specs + rotación); `sprint-1-task-list.md`
(mirror del tablero) ya alineado con él. La reconciliación de ClickUp la ejecuta el **Asiento D
(Manuel)** con `scripts/clickup/sync-sprint-1.mjs` (checklist en el manifiesto §7). _Pendiente:_
los prompts de Jaicel/Huascar/Manuel aún llevan fechas/conteos viejos — se corrigen al preparar
cada asiento (el manifiesto §4–§6 ya lista qué cambiar).

### P1: Inconsistencias Congeladas

**P1#4: Conteo de tareas — ClickUp es la fuente única**

- El número y reparto de tareas viven en ClickUp (export `SPRINT-1-MASTER.csv`), no en los `.md`.
- Los docs de sprint describen _qué_ hace cada asiento, no totales a reconciliar a mano.
- Sincronización del tablero: `scripts/clickup/sync-sprint-1.mjs` (credencial vía env var o archivo local gitignoreado; nunca en el repo).

**P1#5: 9 sprints × 18 semanas — fecha fija** (12 ago – 15 dic 2026). Si algo no cabe, se recorta o pasa al siguiente sprint.

**P1#6: Storybook fuera de Sprint 1** — reevaluar en Sprint 3 (con change de openspec).

**P1#7: Spec refs** — todas apuntan a `openspec/specs/frontend/…`; secciones citadas verificadas en `sprint-1-init-leonardo.md`.

**P1#8: Cobertura** — Sprint 1 la mide pero **no la usa como gate** (suites nacen en Tarea 1). El gate (≥80%, unit+E2E) entra en Sprint 2 (track de Huascar).

### P2: Gobernanza

**P2#1: Trazabilidad** — este §10 es el registro. El prep se entregó por PR (no commit directo a `main`), con declaración de IA. Trail histórico en `docs/sprint-plans/sprint-0/` (limpiado 24-sep).

**P2#2: Migración a formato OpenSpec nativo** — `design-system/spec.md` y
`app-shell-and-navigation/spec.md`: **ambas migradas** (Requirement + Scenario + AC). El resto
de specs de flujo se migran spec-first al empezar su Tarea correspondiente.

**P2#3: Sin secretos** — cero credenciales en prompts/commits/código. Tokens → GitHub Actions secrets (`CODECOV_TOKEN`, Supabase, etc.).

---

## 11. Entrada a Sprint 1

| Hito                        | Fecha                                                     |
| :-------------------------- | :-------------------------------------------------------- |
| Sprint 0 (scaffold + prep)  | hasta 1 sep 2026 — entregado vía PR `chore/sprint-1-prep` |
| Sprint 1 (features) arranca | 2 sep 2026, 19:00                                         |
| Sprint 1 cierra             | 8 sep 2026, 23:59                                         |
| Review + Sprint 2 kickoff   | 9 sep 2026, 09:00                                         |

**Asiento A (Feature Lead) Sprint 1 = Leonardo** — epics `frontend/design-system` +
`frontend/app-shell-and-navigation`, 6 tareas (Tarea 0–6), detalle en
`docs/sprint-plans/sprint-1/sprint-1-init-leonardo.md`. Asientos B/C/D (Jaicel / Huascar / Manuel):
sus `sprint-1-init-*.md`. Reparto y conteo exacto: **ClickUp** (`SPRINT-1-MASTER.csv`), no estos docs.

**Alcance:** este repo = frontend. Todo ML/Data/CLIP vive en el **repositorio backend** (§1).

**Next sprint lead:** Jaicel (Asiento A para Sprint 2).

**Gobernanza:** todo cambio por PR (cero commits directos a `main`), ≥1 revisor, declaración de uso de IA en el cuerpo del PR.
