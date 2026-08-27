# CLAUDE.md — StyleMe Fullstack (React Native + FastAPI)

Memoria persistente del agente para el repositorio **`MACHINE-BULLS`** (StyleMe / StyleSync IA). Este documento es la fuente de verdad operativa: toda sesión futura de Claude Code / OpenCode en este repo debe leerlo y respetarlo antes de escribir código.

> **Alcance de este repositorio:** Monorepo fullstack — **App móvil React Native** + **Backend Python FastAPI** + pipeline VTON/MLOps. El frontend móvil y el backend viven en el mismo repo (directorios separados) y se comunican exclusivamente vía HTTP/JSON según los contratos de `docs/base-plan.MD` §11 y `openspec/.speckit/features/001-probador-virtual/plan.md`. No hay repositorio separado.

---

## 1. Visión General del Producto

**StyleMe** es una plataforma que permite a un usuario digitalizar su guardarropa, recibir combinaciones de outfits basadas en teoría del color y compatibilidad aprendida, y visualizar el resultado sobre su propia foto mediante un probador virtual (VTON) asíncrono.

Este repositorio implementa **ambas caras** del producto:

| Capa | Responsabilidad | Se comunica vía |
| :--- | :--- | :--- |
| **App móvil (React Native)** | Digitalizar guardarropa (foto de prenda), subir foto base del usuario, seleccionar prendas y visualizar VTON | HTTP/JSON contra el backend |
| **Backend (Python FastAPI)** | Validación de imágenes, clasificación, scoring cromático/embedding, encolado en SQS, orquestación de inferencia VTON en SageMaker, persistencia en RDS/S3 | Expone 3 familias de endpoints |

| Dominio | Endpoint backend (contrato) | Naturaleza |
| :--- | :--- | :--- |
| Prendas | `POST /api/v1/garments/upload` | Síncrono (respuesta directa) |
| Outfits | `POST /api/v1/outfits/recommend` | Síncrono (respuesta directa) |
| VTON | `POST /api/v1/vton/try-on` + `GET /api/v1/vton/status/{job_id}` | Asíncrono (job + polling) |

El frontend NO reimplementa lógica de dominio (clasificación, scoring cromático, generación de imágenes). Su responsabilidad es: captura de datos del usuario, validación de forma en el borde, orquestación de llamadas, estado de UI/carga/error, y renderizado. El backend NO renderiza UI; su responsabilidad es: validación de negocio, autorización, persistencia y orquestación del pipeline MLOps.

---

## 2. Stack Tecnológico (Decisión Cerrada)

### 2.0 Frontend — App Móvil React Native

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Framework | **React Native + Expo** (Expo Router o React Navigation) | Un solo codebase iOS/Android. Recomendado en `openspec/.speckit/features/001-probador-virtual/plan.md` sobre Flutter. |
| Lenguaje | TypeScript, **modo `strict` obligatorio** | Equivalente móvil al mandato de type hints estrictos del backend. |
| Estilos | NativeWind (Tailwind para RN) o StyleSheet | Utility-first sin CSS-in-JS pesado. Si se usa web paralela, Tailwind/CSS comparte tokens. |
| Componentes UI | Primitivos propios + Radix-compat (ej. `react-native-paper` o custom) | Viven en `app/components/ui`, no en `node_modules` — se auditan como código propio. |
| Iconos | Lucide Icons (`lucide-react-native`) | Según documento base. |
| Estado de servidor / caché | TanStack Query (React Query) | Toda comunicación con el backend pasa por hooks de TanStack Query, nunca `fetch` directo en componentes. |
| Estado de UI global | Zustand | Solo para estado de cliente puro (ej. wizard de onboarding, selección de prendas en curso). Nunca para cachear datos del servidor. |
| Validación de contratos | Zod | Equivalente móvil de Pydantic v2: todo payload que cruza la frontera red↔app se parsea con un schema Zod antes de usarse. Cero `as` / cero confianza ciega en `any` proveniente de `fetch`. |
| Testing unitario/integración | Vitest + React Native Testing Library | Rápido, nativo ESM/TS, compatible con Expo. |
| Testing E2E | Maestro / Detox + Playwright (si hay web) | Flujos críticos: upload de prenda, recomendación de outfit, ciclo completo de VTON (submit → polling → resultado). |
| Linting | ESLint (`typescript-eslint` strict + `eslint-plugin-react-native`) | Cero warnings tolerados en CI. |
| Formateo | Prettier | Integrado con ESLint, sin reglas de formato duplicadas en ESLint. |

### 2.1 Backend — Python FastAPI

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

### 2.2 Disciplina de Contratos Frontend↔Backend (crítico)

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
├── app/                          # App móvil React Native (Expo)
│   ├── app/                      # Expo Router: rutas, layouts, screens
│   ├── components/
│   │   ├── ui/                   # primitivos UI (Button, Card, etc.)
│   │   └── shared/
│   ├── features/
│   │   ├── garments/
│   │   │   ├── components/
│   │   │   ├── hooks/            # useUploadGarment, etc. (TanStack Query)
│   │   │   ├── api/              # funciones fetch tipadas para este dominio
│   │   │   └── schemas/          # Zod schemas específicos del dominio
│   │   ├── outfits/
│   │   └── vton/
│   ├── lib/
│   │   ├── api/                  # cliente HTTP base, manejo de errores
│   │   └── utils/
│   ├── hooks/                    # hooks genéricos
│   ├── stores/                   # Zustand stores
│   ├── schemas/
│   │   └── api/                  # Zod schemas que espejan contratos backend (§2.2)
│   ├── types/
│   └── config/
├── backend/                      # Backend Python FastAPI
│   ├── app/
│   │   ├── main.py               # FastAPI app, routers
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── garments.py
│   │   │       ├── outfits.py
│   │   │       └── vton.py
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic v2 schemas (espejan Zod)
│   │   ├── services/             # lógica de dominio
│   │   ├── workers/              # consumer SQS + invocación SageMaker
│   │   └── core/                 # config, errors, deps
│   ├── alembic/                  # migraciones
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/          # httpx AsyncClient + mocks S3/SQS
│   │   └── fixtures/
│   ├── pyproject.toml
│   └── .env.example
├── tests/                        # Tests frontend (si se mantiene separado)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json                  # workspace mobile
├── tsconfig.json
└── pyproject.toml                # workspace backend (o backend/pyproject.toml)
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

## 6. Guía de Estilo y Calidad

### Frontend (React Native / TypeScript)
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
# ── Frontend (React Native / Expo) ──
npm run dev                  # expo start
npm run android / ios        # expo run:android / run:ios
npm run lint                 # eslint . (cero warnings)
npm run typecheck            # tsc --noEmit
npm run test                 # vitest run
npm run test:e2e             # maestro / detox test

# ── Backend (Python FastAPI) ──
uv run fastapi dev backend/app/main.py   # dev server
uv run ruff check backend/               # lint
uv run ruff format --check backend/      # format check
uv run mypy backend/                     # typecheck --strict
uv run pytest                            # tests (httpx + moto)
```

Antes de considerar cualquier feature "hecha": frontend `npm run typecheck && npm run lint && npm run test` y backend `uv run mypy backend && uv run ruff check backend && uv run pytest` deben pasar en verde.

---

## 8. Fuente de Verdad del Producto

`docs/base-plan.MD` es el documento de planteamiento completo (full-stack) del proyecto. Este `CLAUDE.md` es su traducción operativa **solo para la porción frontend**. Ante cualquier ambigüedad sobre reglas de negocio (categorías de prenda, estéticas soportadas, reglas de armonía cromática, estados de un `VTONJob`), la fuente de verdad es `docs/base-plan.MD` §10-11 — no inventar campos ni estados no listados ahí.
