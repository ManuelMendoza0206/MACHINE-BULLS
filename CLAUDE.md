# CLAUDE.md — StyleMe Fullstack (Web + Móvil + FastAPI)

Memoria persistente del agente para el repositorio **`MACHINE-BULLS`** (StyleMe / StyleSync IA). Este documento es la fuente de verdad operativa: toda sesión futura de Claude Code / OpenCode en este repo debe leerlo y respetarlo antes de escribir código.

> **Alcance de este repositorio:** Monorepo fullstack — **Plataforma web (Next.js)** + **App móvil (React Native / Expo)** + **Backend Python FastAPI** + pipeline VTON/MLOps. Ambos frontends y el backend viven en el mismo repo (directorios separados) y se comunican exclusivamente vía HTTP/JSON según los contratos de `docs/base-plan.MD` §11 y `openspec/.speckit/features/001-probador-virtual/plan.md`. No hay repositorio separado. Web y móvil comparten el mismo backend y contratos.

---

## 1. Visión General del Producto

**StyleMe** es una plataforma que permite a un usuario digitalizar su guardarropa, recibir combinaciones de outfits basadas en teoría del color y compatibilidad aprendida, y visualizar el resultado sobre su propia foto mediante un probador virtual (VTON) asíncrono.

Este repositorio implementa **tres caras** del producto:

| Capa | Responsabilidad | Se comunica vía |
| :--- | :--- | :--- |
| **Plataforma web (Next.js)** | Plataforma principal "qué me pongo" — digitalizar armario, recomendar outfits y VTON en navegador | HTTP/JSON contra el backend |
| **App móvil (React Native)** | Misma experiencia en iOS/Android — captura de prendas con cámara, selección y VTON | HTTP/JSON contra el mismo backend |
| **Backend (Python FastAPI)** | Validación de imágenes, clasificación, scoring cromático/embedding, encolado en SQS, orquestación de inferencia VTON en SageMaker, persistencia en RDS/S3 | Expone 3 familias de endpoints |

**Objetivo central (inteligencia propia):** resolver "qué me pongo" en moda masculina entregando inteligencia propia (motor de recomendación y reglas estéticas/color de creación propia), no solo conectar servicios de terceros. La lógica central del motor de compatibilidad es de creación propia — ver Constitution §2 y Team Charter.

| Dominio | Endpoint backend (contrato) | Naturaleza |
| :--- | :--- | :--- |
| Prendas | `POST /api/v1/garments/upload` | Síncrono (respuesta directa) |
| Outfits | `POST /api/v1/outfits/recommend` | Síncrono (respuesta directa) |
| VTON | `POST /api/v1/vton/try-on` + `GET /api/v1/vton/status/{job_id}` | Asíncrono (job + polling) |

El frontend NO reimplementa lógica de dominio (clasificación, scoring cromático, generación de imágenes). Su responsabilidad es: captura de datos del usuario, validación de forma en el borde, orquestación de llamadas, estado de UI/carga/error, y renderizado. El backend NO renderiza UI; su responsabilidad es: validación de negocio, autorización, persistencia y orquestación del pipeline MLOps.

---

## 2. Stack Tecnológico (Decisión Cerrada)

### 2.0 Frontend — Plataforma Web (Next.js)

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Framework | **Next.js 14/15, App Router** | Server Components por defecto; Client Components solo donde haya interactividad/estado. |
| Lenguaje | TypeScript, **modo `strict` obligatorio** | Equivalente al mandato de type hints estrictos del backend. |
| Estilos | Tailwind CSS | Utility-first, sin CSS-in-JS. |
| Componentes UI | shadcn/ui (Radix UI + Tailwind) | Viven en `src/components/ui` (o `web/components/ui`), no en `node_modules` — se auditan como código propio. |
| Iconos | Lucide Icons | Según documento base. |
| Estado de servidor / caché | TanStack Query (React Query) | Toda comunicación con el backend pasa por hooks de TanStack Query, nunca `fetch` directo en componentes. |
| Estado de UI global | Zustand | Solo para estado de cliente puro (wizard onboarding, selección prendas). Nunca para cachear datos del servidor. |
| Validación de contratos | Zod | Equivalente web de Pydantic v2: todo payload red↔app se parsea con Zod. Cero `as` / cero `any` de `fetch`. |
| Testing unitario/integración | Vitest + React Testing Library | Rápido, nativo ESM/TS, compatible con Next.js. |
| Testing E2E | Playwright | Flujos críticos: upload prenda, recomendación outfit, ciclo VTON completo. |
| Linting | ESLint (`next/core-web-vitals` + `typescript-eslint` strict) | Cero warnings tolerados en CI. |
| Formateo | Prettier | Integrado con ESLint, sin reglas de formato duplicadas. |

### 2.1 Frontend — App Móvil React Native

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Framework | **React Native + Expo** (Expo Router o React Navigation) | Un solo codebase iOS/Android. Recomendado en `openspec/.speckit/features/001-probador-virtual/plan.md` sobre Flutter. |
| Lenguaje | TypeScript, **modo `strict` obligatorio** | Equivalente móvil al mandato de type hints estrictos del backend. |
| Estilos | NativeWind (Tailwind para RN) o StyleSheet | Utility-first sin CSS-in-JS pesado. Comparte tokens con web si existe. |
| Componentes UI | Primitivos propios + Radix-compat (ej. `react-native-paper` o custom) | Viven en `mobile/components/ui`, no en `node_modules` — se auditan como código propio. |
| Iconos | Lucide Icons (`lucide-react-native`) | Según documento base. |
| Estado de servidor / caché | TanStack Query (React Query) | Toda comunicación con el backend pasa por hooks de TanStack Query, nunca `fetch` directo en componentes. |
| Estado de UI global | Zustand | Solo para estado de cliente puro (ej. wizard de onboarding, selección de prendas en curso). Nunca para cachear datos del servidor. |
| Validación de contratos | Zod | Equivalente móvil de Pydantic v2: todo payload que cruza la frontera red↔app se parsea con un schema Zod antes de usarse. Cero `as` / cero confianza ciega en `any` proveniente de `fetch`. |
| Testing unitario/integración | Vitest + React Native Testing Library | Rápido, nativo ESM/TS, compatible con Expo. |
| Testing E2E | Maestro / Detox | Flujos críticos: upload de prenda, recomendación de outfit, ciclo completo de VTON (submit → polling → resultado). |
| Linting | ESLint (`typescript-eslint` strict + `eslint-plugin-react-native`) | Cero warnings tolerados en CI. |
| Formateo | Prettier | Integrado con ESLint, sin reglas de formato duplicadas en ESLint. |

### 2.2 Backend — Python FastAPI

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Framework | **Python 3.11+ + FastAPI (async)** | Async nativo — crítico para no bloquear mientras se espera GPU/SQS (ver `001-probador-virtual/plan.md`). |
| Validación / Schemas | **Pydantic v2** | Fuente de verdad de los contratos §11. Todo request/response tipado con `BaseModel` estricto. Espeja 1:1 con Zod del frontend. |
| ORM / DB | SQLAlchemy 2.0 (async) + PostgreSQL (RDS) | Modelos `Garment`, `User`, `VTONJob`. Migraciones con Alembic. |
| Cola / Jobs | **Amazon SQS + worker async** (arq. `001-probador-virtual/plan.md` §Arquitectura) | `POST /vton/try-on` encola, worker invoca SageMaker. |
| Storage | **Amazon S3** (buckets separados) | Fotos de usuario (dato sensible) vs prendas catálogo — políticas de retención distintas (Constitution §6). |
| Inferencia | **AWS SageMaker Endpoints** + diffusers (IDM-VTON / OOTDiffusion) | Autoscaling, no EC2 fijo — controla costo GPU (Constitution §7). |
| Testing | **pytest + httpx + pytest-asyncio** | Tests de endpoint con `TestClient`/`AsyncClient`, mocks de S3/SQS/SageMaker. |
| Linting / Types | **Ruff + mypy --strict** | Cero warnings tolerados en CI. Equivalente backend de `tsc --noEmit`. |
| Formateo | Ruff format (o Black) | Integrado, sin duplicar reglas en linter. |

### 2.3 Disciplina de Contratos Frontend↔Backend (crítico)

La frontera móvil↔backend es contrato HTTP/JSON estricto. Pydantic (backend) es fuente de verdad, Zod (móvil) la espeja:

- Todo schema Zod en `app/schemas/api/` debe **espejar exactamente** los modelos Pydantic de `backend/app/schemas/` y `docs/base-plan.MD` §11 (nombres de campo, tipos, enums, nullability). Divergencia = bug.
- Todo `BaseModel` Pydantic usa `model_config = ConfigDict(extra="forbid", strict=True)` — rechaza campos desconocidos.
- Cuando el backend exponga su OpenAPI schema, evaluar generación automática de tipos/Zod (ej. `openapi-zod-client`) en vez de mantenerlos a mano — dejar esta tarea explícitamente pendiente en un spec futuro, no improvisarla ad-hoc.
- Ningún componente o hook del móvil debe asumir la forma de una respuesta sin pasarla por su schema Zod correspondiente. Un `parse` fallido se traduce siempre en un `ValidationError` tipado (ver §5), nunca en un fallo silencioso.
- Los `job_id`, `status` enums (`pending|processing|completed|failed`) y demás valores literales deben tiparse como Zod `enum`/`literal` y como `Literal`/`Enum` en Pydantic, nunca como `string` genérico.

---

## 3. Regla de Oro SDD (Spec-Driven Development)

**Flujo obligatorio, sin excepciones — aplica a móvil Y backend:**

```
SPEC (openspec/specs/*.md o openspec/changes/<name>/specs/*.md)  →  TEST (falla en rojo)  →  CODE (app/ o backend/)  →  REFACTOR
```

1. **SPEC primero:** ninguna función, componente, hook, endpoint o service se implementa sin que exista antes una spec que defina su propósito, contrato (props/inputs/outputs tipados), casos de prueba y criterios de aceptación.
2. **TEST en rojo:** se escribe la prueba (Vitest/RTL o pytest) derivada de la spec, y se confirma que falla antes de escribir la implementación.
3. **CODE mínimo:** se implementa solo lo necesario para pasar la prueba, respetando tipado estricto y la arquitectura de carpetas (§4).
4. **REFACTOR:** se limpia manteniendo la suite en verde. No se introduce alcance no cubierto por la spec.

Está prohibido escribir código funcional en `app/` o `backend/` que no tenga spec y test asociados. Si el usuario pide una feature sin spec previa, la sesión debe primero proponer/generar la spec correspondiente en `openspec/` antes de tocar código.

---

## 4. Estructura de Directorios

```
MACHINE-BULLS/
├── CLAUDE.md
├── docs/
│   └── base-plan.MD              # Documento fuente del proyecto completo (full-stack)
├── openspec/                     # Specs y constitution (fuente de verdad SDD)
│   ├── specs/                    # 00..07 — specs ejecutables
│   └── .speckit/                 # constitution + feature 001 plan
├── web/                          # Plataforma web Next.js (ver §2.0)
│   ├── app/                      # App Router: rutas, layouts, pages
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitivos
│   │   └── shared/
│   ├── features/
│   │   ├── garments/             # hooks useUploadGarment, api/, schemas/
│   │   ├── outfits/
│   │   └── vton/
│   ├── lib/
│   │   ├── api/                  # cliente HTTP base (TanStack Query + Zod)
│   │   └── utils/
│   ├── stores/                   # Zustand
│   ├── schemas/api/              # Zod que espeja backend (§2.3)
│   ├── tests/
│   ├── public/
│   └── package.json
├── mobile/                       # App móvil React Native Expo (ver §2.1)
│   ├── app/                      # Expo Router: rutas, layouts, screens
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── features/
│   │   ├── garments/
│   │   ├── outfits/
│   │   └── vton/
│   ├── lib/api/                  # cliente HTTP base (mismo contrato que web)
│   ├── stores/
│   ├── schemas/api/              # Zod que espeja backend (§2.3) — compartir con web si se puede
│   └── package.json
├── backend/                      # Backend Python FastAPI (ver §2.2)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   │   ├── garments.py
│   │   │   ├── outfits.py
│   │   │   └── vton.py
│   │   ├── models/               # SQLAlchemy
│   │   ├── schemas/              # Pydantic v2 (fuente de verdad)
│   │   ├── services/             # dominio: clasificación, motor compatibilidad
│   │   ├── workers/              # SQS consumer + SageMaker
│   │   └── core/                 # config, errors, deps
│   ├── alembic/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/          # httpx AsyncClient + mocks AWS
│   │   └── fixtures/
│   ├── pyproject.toml
│   └── .env.example
├── package.json                  # workspaces (opcional) o separado web/mobile
├── tsconfig.json
└── pyproject.toml
```

---

## 5. Arquitectura de Manejo de Errores

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
- Backend espeja la misma jerarquía con excepciones Python (`StyleMeException` → `ApiException`, `ValidationException`); todo `HTTPException` de FastAPI mapea a un `code` del contrato.

---

## 5.1 DOME — Fases del Proyecto (del Team Charter)

| Fase | Meta | Scope técnico |
| :--- | :--- | :--- |
| **1 — Análisis y Clasificación** | Backend recibe foto de prenda, quita fondo y clasifica tipo/estética | `backend/app/api/v1/garments.py` + `services/classifier` + S3 |
| **2 — Motor de Compatibilidad** | Analiza color/estilo de prendas guardadas y sugiere outfits armónicos | `backend/app/services/compatibility` (motor propio, ver §6) + `POST /outfits/recommend` |
| **3 — Probador Virtual VTON** | Proyecta outfit sobre foto del usuario respetando postura/proporciones | `backend/app/workers/` + SageMaker (IDM-VTON/OOTDiffusion) + polling VTON |
| **4 — Lanzamiento y UI** | Plataforma web + móvil pulida, todo conectado, usable end-to-end | `web/` + `mobile/` + integración completa |

Ninguna fase puede saltearse el flujo SDD §3. La lógica central de Fase 1 y 2 es de creación propia — no wrapper de API externa.

---

## 6. Guía de Estilo y Calidad

### Frontend (Web + React Native / TypeScript)
- **TypeScript estricto:** `strict: true` en `tsconfig.json`. Cero `any` explícito. `any` implícito es error de build. Preferir `unknown` + narrowing/Zod sobre `any`.
- **Cero hardcode de contratos:** cualquier forma de dato externo (API, `AsyncStorage`, query params) se valida con Zod antes de tiparse como confiable.
- **Componentes:** un componente = una responsabilidad. Lógica de fetching vive en hooks (`useX`), no en el JSX del componente.
- **Documentación:** TSDoc solo en funciones/hooks exportados cuyo comportamiento no sea obvio por la firma (ej. reglas de reintento de polling). No documentar lo autoevidente.
- **Nombres:** archivos de componentes en `PascalCase.tsx`, hooks en `useCamelCase.ts`, schemas Zod exportados como `XSchema` con su tipo inferido `type X = z.infer<typeof XSchema>`.

### Backend (Python / FastAPI)
- **Type hints estrictos:** `mypy --strict` obligatorio. Cero `Any` sin justificación. Todo `def` tipado, `BaseModel` con `strict=True`.
- **Pydantic v2:** todo request/response validado con `BaseModel` estricto; `model_config = ConfigDict(extra="forbid")` para rechazar campos desconocidos.
- **Ruff:** lint + format único. Cero warnings en CI (`ruff check` + `ruff format --check`).
- **Arquitectura hexagonal ligera:** `api/` (routers) → `services/` (dominio) → `models/` (persistencia). Ningún router toca S3/SQS/SageMaker directo — pasa por `services/`.
- **Tests:** `pytest` + `httpx.AsyncClient` + `pytest-asyncio`. Todo endpoint con test de contrato (Pydantic) y mock de AWS (moto/boto3 stub).

---

## 7. Comandos CLI Estándar

```bash
# ── Frontend Web (Next.js) ──
npm run dev --workspace=web         # next dev
npm run lint --workspace=web        # eslint . (cero warnings)
npm run typecheck --workspace=web   # tsc --noEmit
npm run test --workspace=web        # vitest run
npm run test:e2e --workspace=web    # playwright test

# ── Frontend Móvil (React Native / Expo) ──
npm run dev --workspace=mobile      # expo start
npm run android --workspace=mobile
npm run ios --workspace=mobile
npm run lint --workspace=mobile
npm run typecheck --workspace=mobile
npm run test --workspace=mobile
npm run test:e2e --workspace=mobile # maestro / detox

# ── Backend (Python FastAPI) ──
uv run fastapi dev backend/app/main.py   # dev server
uv run ruff check backend/               # lint
uv run ruff format --check backend/      # format check
uv run mypy backend/                     # typecheck --strict
uv run pytest                            # tests (httpx + moto)
```

Antes de considerar cualquier feature "hecha": web/mobile `npm run typecheck && npm run lint && npm run test` y backend `uv run mypy backend && uv run ruff check backend && uv run pytest` deben pasar en verde.

---

## 8. Fuente de Verdad del Producto

`docs/base-plan.MD` es el documento de planteamiento completo (full-stack) del proyecto. Este `CLAUDE.md` es su traducción operativa **solo para la porción frontend**. Ante cualquier ambigüedad sobre reglas de negocio (categorías de prenda, estéticas soportadas, reglas de armonía cromática, estados de un `VTONJob`), la fuente de verdad es `docs/base-plan.MD` §10-11 — no inventar campos ni estados no listados ahí.
