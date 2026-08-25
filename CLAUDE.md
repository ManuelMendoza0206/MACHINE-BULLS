# CLAUDE.md — StyleMe Frontend

Memoria persistente del agente para el repositorio **`styleme-webapp`** (frontend de StyleMe). Este documento es la fuente de verdad operativa: toda sesión futura de Claude Code en este repo debe leerlo y respetarlo antes de escribir código.

> **Alcance de este repositorio:** SOLO frontend (Next.js). El backend Python/FastAPI/ML descrito en `docs/base-plan.MD` (clasificador CLIP, motor de compatibilidad, pipeline VTON) vive en un repositorio/servicio separado y se consume aquí exclusivamente vía HTTP/JSON, según los contratos de la Sección 11 de `docs/base-plan.MD`.

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

- Todo schema Zod que representa una respuesta del backend debe vivir en `src/schemas/api/` y **espejar exactamente** los modelos Pydantic descritos en la Sección 11 de `docs/base-plan.MD` (nombres de campo, tipos, enums, nullability).
- Cuando el backend exponga su OpenAPI schema, evaluar generación automática de tipos/Zod (ej. `openapi-zod-client`) en vez de mantenerlos a mano — dejar esta tarea explícitamente pendiente en un spec futuro, no improvisarla ad-hoc.
- Ningún componente o hook debe asumir la forma de una respuesta sin pasarla por su schema Zod correspondiente. Un `parse` fallido se traduce siempre en un `ValidationError` tipado (ver §5), nunca en un fallo silencioso.
- Los `job_id`, `status` enums (`pending|processing|completed|failed`) y demás valores literales deben tipar-se como Zod `enum`/`literal`, nunca como `string` genérico.

---

## 3. Regla de Oro SDD (Spec-Driven Development)

**Flujo obligatorio, sin excepciones:**

```
SPEC (/specs/*.md)  →  TEST (falla en rojo)  →  CODE (src/)  →  REFACTOR
```

1. **SPEC primero:** ninguna función, componente, hook o store se implementa sin que exista antes un archivo en `/specs/` que defina su propósito, contrato (props/inputs/outputs tipados), casos de prueba y criterios de aceptación.
2. **TEST en rojo:** se escribe la prueba (Vitest/RTL o Playwright) derivada de la spec, y se confirma que falla antes de escribir la implementación.
3. **CODE mínimo:** se implementa solo lo necesario para pasar la prueba, respetando tipado estricto y la arquitectura de carpetas (§4).
4. **REFACTOR:** se limpia manteniendo la suite en verde. No se introduce alcance no cubierto por la spec.

Está prohibido escribir código funcional en `src/` que no tenga spec y test asociados. Si el usuario pide una feature sin spec previa, la sesión debe primero proponer/generar la spec correspondiente en `/specs/` antes de tocar `src/`.

---

## 4. Estructura de Directorios

```
styleme-webapp/
├── CLAUDE.md
├── docs/
│   └── base-plan.MD              # Documento fuente del proyecto completo (full-stack)
├── specs/                        # Especificaciones SDD (frontend) — ver /specs/README.md
├── src/
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

`docs/base-plan.MD` es el documento de planteamiento completo (full-stack) del proyecto. Este `CLAUDE.md` es su traducción operativa **solo para la porción frontend**. Ante cualquier ambigüedad sobre reglas de negocio (categorías de prenda, estéticas soportadas, reglas de armonía cromática, estados de un `VTONJob`), la fuente de verdad es `docs/base-plan.MD` §10-11 — no inventar campos ni estados no listados ahí.
