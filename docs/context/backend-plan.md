# StyleMe — Planteamiento Integral del Backend

Documento exclusivo de planificación técnica del backend (Python/FastAPI/ML), derivado en su totalidad de `docs/context/plan-base.md` y validado contra las 8 specs de frontend ya existentes en `openspec/specs/`. Precede a las specs técnicas de backend en `openspec/specs/backend/`, siguiendo el mismo principio que `frontend-plan.md`: define **qué** se construye y **por qué**, antes de que las specs definan **cómo**.

> **Regla de consistencia (no negociable):** ningún contrato descrito aquí puede contradecir lo que las specs de frontend ya asumen como cierto (`openspec/specs/frontend/api-client-and-schemas/spec.md`, `openspec/specs/frontend/api-contract-gaps/spec.md`). Donde este documento define algo distinto a lo que el frontend espera, se marca explícitamente como **[BREAKING respecto a frontend]** y se resuelve antes de avanzar — no se deja ambigüedad para "descubrir en integración".

---

## 1. Alcance y Relación con el Frontend

**Alcance de este documento:** el servicio backend Python que expone la API REST consumida por `MACHINE-BULLS` (frontend Next.js) y ejecuta los tres pipelines de ML descritos en `plan-base.md` §4. No cubre infraestructura de despliegue como tema separado (se referencia donde `plan-base.md` ya la fija) ni el frontend, que es de solo consumo.

**Contrato inviolable con el frontend (`CLAUDE.md` §2.1 del repo frontend):** todo campo, enum y estado expuesto por este backend debe coincidir 1:1 con lo que las specs de frontend ya especificaron como schema Zod. Los 4 endpoints de `plan-base.md` §11 y los schemas de `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.3 son la especificación de forma vigente — este documento **añade** los endpoints que faltan (gaps G1-G5) y el detalle de implementación; no redefine la forma de lo que ya existe sin marcarlo como breaking.

### 1.1 Decisión de plataforma heredada (`.speckit/constitution.md` §8)

El backend comparte **la misma instancia de PostgreSQL que Supabase Auth** (no una RDS ni Postgres separado) — esta es la premisa que hace viable la ruta preferida (trigger de base de datos) para cerrar el gap G5 de identidad. Cualquier decisión de infraestructura de este documento asume ese Postgres único.

---

## 2. Principios de Arquitectura

**Origen:** mandato original del proyecto (Clean Architecture, SOLID, tipado estricto) + `.speckit/constitution.md` §2.

1. **Clean Architecture por capas:** `domain/` (entidades y reglas de negocio puras, sin dependencias de framework) → `services/` (casos de uso, orquestación) → `api/` (routers FastAPI, DTOs) → `data/` (SQLAlchemy, clientes externos). Una capa interna nunca importa de una capa externa.
2. **Async-first:** todo endpoint que toque GPU, red externa (Replicate/RunPod) o el pipeline de ML es `async def` — el requisito de latencia VTON (`plan-base.md` §8, >15s) es la razón de ser de FastAPI en el stack, no un detalle incidental.
3. **Tipado estricto sin excepción:** Pydantic v2 en todo borde (request/response DTOs), type hints completos compatibles con mypy/pyright, cero `Any` explícito o implícito — mismo estándar que `CLAUDE.md` exige del lado frontend con TypeScript/Zod.
4. **Pipeline MLOps real, no opcional:** entrenamiento/reentrenamiento reproducible, versionado de modelos, monitoreo de calidad en producción — `.speckit/constitution.md` §2 lo declara "no negociable", es un requisito académico del curso, no una preferencia de ingeniería.
5. **Tolerancia a fallos en las llamadas GPU:** reintentos con backoff exponencial y circuit breaker alrededor de las llamadas a Replicate/RunPod — la latencia y el costo de estas llamadas son el riesgo Alto documentado en `plan-base.md` §8.

---

## 3. Stack Tecnológico (Decisión Cerrada)

**Origen:** `plan-base.md` §6.1, sin cambios — se reafirma aquí como cerrado para el backend:

| Categoría | Tecnología | Notas |
| :--- | :--- | :--- |
| Lenguaje/Framework | Python 3.10+, FastAPI | Async nativo, OpenAPI generado automáticamente — **esa OpenAPI spec es la que debe alimentar la generación de tipos Zod del frontend** (`CLAUDE.md` frontend §2.1, tarea pendiente ahí marcada como futura). |
| Validación | Pydantic v2 | Equivalente exacto de Zod en el borde. |
| CV/DL | PyTorch, TorchVision, Hugging Face Transformers (CLIP), OpenCV, MediaPipe, `rembg` | |
| Base de datos | PostgreSQL (instancia de Supabase, §1.1) + `pgvector` | Embeddings de compatibilidad (dim 128) y búsqueda k-NN. |
| Almacenamiento de objetos | **Cloudinary** (confirmado, §12.1) | Imágenes de prenda y resultados VTON — transformaciones on-the-fly (resize/normalización) en vez de cómputo propio por variante. |
| Inferencia VTON | Replicate API / RunPod | Sujeto al riesgo de licenciamiento ya registrado en `.speckit/constitution.md` §7 — ver §9.3 de este documento. |
| Testing | Pytest | `pytest tests/ -v --cov=src`, TDD según la Regla de Oro (spec primero, test en rojo, código, refactor) — idéntica en espíritu a la del frontend. |
| Estilo | PEP 8, Black, Ruff, Google Docstrings | |

---

## 4. Arquitectura de Módulos

**Origen:** los 5 módulos propuestos en la planificación original del proyecto, reafirmados aquí como la división de specs de backend (§13).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (FastAPI)                        │
│   Routers: /garments  /outfits  /vton  /users(sync)                  │
│   Middlewares: CORS, Rate Limiting, Exception Handler tipado          │
└───────────┬──────────────────┬──────────────────┬────────────────────┘
            │                  │                  │
            v                  v                  v
 ┌────────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
 │ GARMENT ANALYSIS    │ │ RECOMMENDER       │ │ VTON PIPELINE        │
 │ SERVICE             │ │ ENGINE            │ │                       │
 │ rembg → CLIP        │ │ CIELAB/HSV +      │ │ MediaPipe Pose →      │
 │ zero-shot →         │ │ Triplet Loss      │ │ Human Parsing →       │
 │ ResNet fallback     │ │ embedding (D=128) │ │ Replicate/RunPod      │
 │                     │ │ → pgvector k-NN   │ │ (IDM-VTON/OOTDiff.)   │
 └──────────┬──────────┘ └─────────┬─────────┘ └──────────┬────────────┘
            │                      │                       │
            └──────────────────────┴───────────────────────┘
                                   │
                                   v
                    ┌───────────────────────────────┐
                    │  DOMAIN & DATABASE              │
                    │  SQLAlchemy 2.0 + Pydantic v2   │
                    │  PostgreSQL + pgvector           │
                    └───────────────────────────────┘
```

Cada bloque del diagrama es una futura spec independiente en `openspec/specs/backend/` (§13) — ningún módulo depende de los detalles internos de otro, solo de sus contratos de servicio.

---

## 5. Modelo de Datos — Completo (cierra G1, G3, G4)

**Origen:** `plan-base.md` §10.1, **extendido** para cerrar los gaps que el frontend ya documentó como bloqueantes en `openspec/specs/frontend/api-contract-gaps/spec.md`.

### 5.1 Entidades base (sin cambios respecto a `plan-base.md` §10.1)

`User`, `Garment`, `Outfit`, `OutfitGarment`, `VTONJob` — mismos campos ya listados ahí. No se agregan columnas nuevas a `User` (ver §5.3 sobre por qué `defaultAesthetic` NO se añade aquí).

### 5.2 Extensión CONFIRMADA — Catálogo Cápsula (cierra G4)

**Estado: confirmado y afirmado en `plan-base.md` §10.1 y §11** (2026-08-26) — ya no es una propuesta de este documento, es parte del modelo de datos canónico del proyecto.

`plan-base.md` §5.2 define el catálogo "Básicos StyleMe" (50 prendas, `user_id` nullable en `Garment`) pero nunca especificaba el mecanismo de asociación al armario de un usuario. Se define aquí:

```
GarmentOwnership (tabla, no una columna en Garment)
- user_id: UUID (FK -> User.id)
- garment_id: UUID (FK -> Garment.id)
- source: enum('uploaded', 'capsule')  -- distingue prenda propia vs. copiada del catálogo
- added_at: timestamp
- PK compuesta (user_id, garment_id)
```
**Por qué una tabla de asociación y no reasignar `Garment.user_id`:** una prenda del catálogo cápsula debe poder estar "en el armario" de N usuarios simultáneamente sin duplicar la fila física ni su análisis ya computado (categoría/estética/colores) — reasignar `user_id` directamente rompería esa compartición. Esto **resuelve G4** con una respuesta concreta a la pregunta abierta de spec 08 ("¿es un POST separado, o el `user_id` se asigna directamente?"): es un `POST` separado que crea una fila en `GarmentOwnership`, nunca una mutación de `Garment`.

### 5.3 Por qué `defaultAesthetic` NO se agrega a `User` aquí

`openspec/specs/frontend/profile-flow/spec.md` §6 identificó la ausencia de este campo y lo resolvió del lado frontend con `localStorage`. **Decisión de este documento: se mantiene así.** Es una preferencia de UI de bajo valor para el backend (no participa en ningún cálculo de compatibilidad ni en el pipeline ML) — agregarla a `User` sería infraestructura de base de datos para un dato que el frontend ya resolvió de forma pragmática. Si en el futuro se requiere sincronización entre dispositivos, se reabre esta decisión.

### 5.4 Índices vectoriales

`Garment.compatibility_embedding vector(128)` con índice HNSW (`vector_cosine_ops`) — se prefiere HNSW sobre IVFFlat por mejor recall en un catálogo que crece incrementalmente (altas constantes de prendas nuevas) sin necesidad de reconstruir el índice completo como exige IVFFlat tras cambios grandes de volumen.

---

## 6. Contratos de API — Completos (cierra G1, G2, G3, G5)

**Origen:** `plan-base.md` §11 (4 endpoints originales, sin cambios de forma) + resolución explícita de los 5 gaps de `openspec/specs/frontend/api-contract-gaps/spec.md`.

### 6.1 Endpoints ya contratados (sin cambios — confirmación de forma)

`POST /api/v1/garments/upload`, `POST /api/v1/outfits/recommend`, `POST /api/v1/vton/try-on`, `GET /api/v1/vton/status/{job_id}` — la forma exacta (campos, tipos) es la que ya consumen `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.3. **Este documento no la modifica.**

### 6.2 Nuevos endpoints — cierre de gaps

| # | Endpoint | Resuelve | Contrato |
| :--- | :--- | :--- | :--- |
| G1 | `GET /api/v1/garments?user_id={id}&cursor={c}&limit={n}` | Listado de `/wardrobe` | Paginación por cursor (no offset — el armario crece por inserción, cursor evita duplicados/saltos). Devuelve `GarmentSummary[]`: mismo shape que hoy consume `GarmentSummary` placeholder de spec 02 §6 (`id, processed_image_url, category, dominant_aesthetic`) + `source` (de §5.2). |
| G2 | `GET /api/v1/outfits/{outfit_id}` | Detalle directo de `/outfits/[outfitId]` sin depender de cache de cliente | Devuelve el mismo shape `Outfit` de `OutfitRecommendationResponseSchema` (spec 01 §2.3), individual en vez de array. `404` si el outfit no pertenece al usuario autenticado o no existe. |
| G3 | `GET /api/v1/vton/jobs?user_id={id}&status={s}&cursor={c}` | Historial de `/try-on/history` | Paginación por cursor; filtro opcional por `status`. Mismo shape `VtonJobStatusResponseSchema` (spec 01 §2.3) por elemento. |
| G4 | `POST /api/v1/garments/capsule/{garment_id}/adopt` | Asociación de catálogo cápsula (§5.2) | Body vacío (autenticación implícita); crea fila `GarmentOwnership(source='capsule')`; `409` si ya estaba adoptada por ese usuario (idempotente en efecto, no en respuesta — el frontend trata `409` como éxito silencioso). |
| G5 | Trigger de base de datos (no HTTP) | Sincronización `auth.users` → `User` | Ver §7 — no es un endpoint, es una función `AFTER INSERT` en Postgres, la ruta ya recomendada por `openspec/specs/frontend/landing-and-auth-flow/spec.md` §6 y ratificada en `.speckit/constitution.md` §8. |

**[BREAKING respecto a frontend — ninguno]**: los 4 endpoints nuevos son estrictamente aditivos; ningún schema Zod existente cambia de forma.

---

## 7. Sincronización de Identidad `auth.users` ↔ `User` (cierre definitivo de G5)

**Implementación concreta de la ruta ya preferida:**

```sql
CREATE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, created_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

`NEW.raw_user_meta_data->>'name'` recupera el campo `name` que `signUpWithEmail` (spec 06 §2.4) ya envía en `options.data.name` al llamar `supabase.auth.signUp` — **esto significa que el frontend no necesita ningún cambio** para que este trigger funcione; el contrato ya estaba correctamente diseñado del lado frontend a la espera de esta pieza backend.

**Idempotencia y fallos:** si el `INSERT` en `User` falla (ej. constraint violado), la transacción completa del signup en Supabase Auth también falla (mismo statement transaccional vía trigger) — evita el escenario de "usuario autenticado pero sin fila en `User`" que un endpoint HTTP asíncrono sí podría producir ante un fallo de red entre ambas llamadas.

---

## 8. Pipeline de Garment Analysis

**Origen:** `plan-base.md` §4.1, sin cambios de diseño — se detalla aquí la interfaz de servicio.

```python
class GarmentAnalyzer(Protocol):
    async def analyze(self, image: UploadFile) -> GarmentAnalysisResult: ...

@dataclass(frozen=True)
class GarmentAnalysisResult:
    category: str
    top_aesthetics: list[AestheticScore]  # ya ordenado desc por confidence
    dominant_colors: list[DominantColor]  # HSV + hex
    processed_image_url: str
```

Pipeline interno: `rembg` (U-2-Net) para remoción de fondo → normalización 224×224 RGB → CLIP zero-shot (prompts por estética, `plan-base.md` §4.1.A) → fallback a ResNet-50 fine-tuned si la confianza CLIP cae bajo umbral (F1 objetivo >0.82 categoría, >0.75 estética, `plan-base.md` §9.1).

**SLA:** timeout total del endpoint 20s (ya asumido por frontend spec 01 §1) — el presupuesto interno es rembg ~3-5s + CLIP inference ~1-2s en GPU, dejando margen para I/O de red del archivo subido.

---

## 9. Pipeline de Recomendación y VTON

### 9.1 Recommender Engine
Conversión RGB→CIELAB/HSV para armonía cromática (reglas de análogos/complementarios/triadas, `plan-base.md` §4.2.A) + embedding D=128 entrenado con Triplet Loss, consulta k-NN sobre `pgvector` (índice HNSW, §5.4). Evaluación FITB objetivo >70% (`plan-base.md` §9.2).

**SLA:** timeout 10s (ya asumido por frontend spec 01 §1) — la consulta k-NN debe resolver en <500ms; el presupuesto restante es el cálculo de score cromático por combinación candidata.

### 9.2 VTON Pipeline
MediaPipe Pose (keypoints) → Human Parsing (SCHP/SAM, máscara anatómica) → llamada a Replicate/RunPod con el trío (foto usuario, máscara, foto prenda) → resultado async con `VTONJob` (estados `pending/processing/completed/failed`, ya contratados en spec 01 §2.3).

**Tolerancia a fallos (mandato de arquitectura §2.5):** reintento con backoff exponencial (máx. 3 intentos) ante error transitorio de la API externa; circuit breaker que abre tras N fallos consecutivos en una ventana de tiempo, devolviendo `status: failed` con `error_message` inmediato en vez de encolar contra un proveedor caído — evita que el frontend quede haciendo polling contra un job que nunca podrá completarse (spec 04 §2.2 ya asume que el timeout de UI es local, pero un circuit breaker backend evita generar el job fallido tarde en vez de rápido).

### 9.3 Riesgo de licenciamiento — condiciona la elección de proveedor

Registrado en `.speckit/constitution.md` §7: IDM-VTON/OOTDiffusion son licencia no comercial. **Este documento no resuelve esa decisión** (es de producto/legal, no de arquitectura backend) — pero fija que la interfaz `VtonInferenceProvider` (Protocol) debe ser swappable entre las 3 rutas de resolución ya listadas en la constitución, sin que ese cambio afecte al contrato HTTP expuesto al frontend.

---

## 10. Arquitectura de Manejo de Errores

**Origen:** jerarquía de excepciones de dominio ya anticipada en `CLAUDE.md` (versión original del proyecto) — formalizada aquí y mapeada a los códigos HTTP que el frontend ya interpreta (`openspec/specs/frontend/api-client-and-schemas/spec.md` §2.6).

```python
class StyleMeException(Exception):
    """Base — nunca se lanza directamente."""

class DataValidationError(StyleMeException):
    """Pydantic/negocio — mapea a HTTP 422."""

class ModelInferenceError(StyleMeException):
    """Fallo de CLIP/ResNet/embedding — mapea a HTTP 500, nunca expone stack trace al cliente."""

class VTONJobTimeoutError(StyleMeException):
    """Circuit breaker abierto o proveedor VTON no responde — mapea a status: 'failed' en el VTONJob, HTTP 200 (el fallo es de negocio, no de transporte)."""

class ResourceNotFoundError(StyleMeException):
    """Mapea a HTTP 404 — usado por G2 (outfit no encontrado/no pertenece al usuario)."""
```

**Regla de mapeo:** un `Exception Handler` global de FastAPI traduce cada subclase a la respuesta HTTP correspondiente de la tabla de `spec 01 §2.6` — el frontend ya tiene `mapStatusToUserMessage` esperando exactamente estos códigos (400/401/403/404/422/429/500-503), por lo que el backend no debe introducir códigos fuera de ese conjunto sin actualizar esa spec primero.

---

## 11. Estrategia de Pruebas (resumen — detalle vive en cada spec de backend)

TDD estricto, misma Regla de Oro que el frontend: SPEC → TEST (rojo) → CODE → REFACTOR. `pytest tests/ -v --cov=src`, mínimo 90% de cobertura en `domain/` y `services/` (paralelo al estándar de 90% ya exigido en frontend spec 01 para su capa de integridad de datos). Modelos de ML (CLIP, ResNet, VTON) se mockean en tests unitarios/integración — solo un suite de evaluación aparte (no bloqueante de CI) corre inferencia real contra el dataset curado para medir F1/FITB/SSIM reales.

---

## 12. Decisiones Abiertas

| # | Decisión | Estado |
| :--- | :--- | :--- |
| D1 | Proveedor de almacenamiento de imágenes | **CONFIRMADO: Cloudinary** (2026-08-26) |
| D2 | Ruta de resolución del riesgo de licenciamiento VTON | Pendiente — ver análisis §12.2 |
| D3 | SCHP vs. SAM para human parsing | Pendiente — ver análisis §12.3 |

### 12.1 D1 — Cloudinary (confirmado)

Se descarta Supabase Storage y S3. Cloudinary se elige sobre Supabase Storage porque el pipeline de garment analysis (§8) ya necesita transformaciones de imagen en el camino crítico (normalización 224×224, remoción de fondo) — Cloudinary las ofrece como transformaciones on-the-fly vía URL (`/w_224,h_224,c_fill/`), evitando reimplementar ese paso como cómputo propio para cada variante que el frontend pida (thumbnail de grid vs. imagen de detalle vs. imagen de entrada al pipeline VTON). Supabase Storage es almacenamiento puro, sin ese servicio. **Impacto en specs:** `backend/domain-and-database` debe definir las convenciones de `public_id`/carpeta de Cloudinary como parte del schema de `Garment.processed_image_url` y `VTONJob.result_url`.

### 12.2 D2 — Licenciamiento VTON: qué decisiones fuerzan el avance del proyecto

El riesgo (`.speckit/constitution.md` §7) tiene 3 rutas ya registradas, pero dejarlas como "3 opciones abiertas" es exactamente lo que **no** fuerza el avance — nadie empieza `vton-pipeline` mientras "hay que decidir". Para desbloquear, hay que separar la decisión en dos preguntas distintas, respondibles ahora mismo con la información que ya existe en la constitución del propio proyecto:

**Pregunta 1 — ¿el proyecto es comercial o académico, hoy?**
`.speckit/constitution.md` §2 ya responde esto: *"Alcance acotado en 18 semanas"*, proyecto de curso ("Taller de Sistemas Inteligentes"). No hay intención de venta ni de despliegue comercial declarada en ningún documento del repo. **Esto significa que la Ruta 2 (alcance estrictamente académico/no comercial, documentado) no es una opción entre tres — es simplemente una descripción precisa de lo que el proyecto ya es.** Formalizarla no es una concesión, es dejar de fingir una ambigüedad que no existe en la práctica.

**Pregunta 2 — dado eso, ¿qué proveedor concreto se usa para no seguir bloqueado?**
Con el alcance académico confirmado, la decisión de proveedor deja de ser un riesgo legal abierto y pasa a ser una elección técnica ordinaria: usar un checkpoint community de IDM-VTON/OOTDiffusion ya hosteado en Replicate (ej. variantes públicas usadas habitualmente en demos y proyectos de estudiante), aceptando sus términos de uso bajo el marco de "proyecto de curso, sin explotación comercial" — exactamente la mitigación que la Ruta 2 ya contempla.

**Decisión que fuerza el desarrollo (CONFIRMADA con el Product Owner, 2026-08-26):** se ratifica la Ruta 2 como la postura oficial del proyecto — no como resignación, sino porque es la que ya describe la realidad declarada del proyecto (curso, sin cliente final, sin monetización). Con eso se fija un proveedor Replicate concreto (checkpoint community de IDM-VTON/OOTDiffusion) en la spec `backend/vton-pipeline` sin más demora. **Se reabre esto únicamente si en algún momento el equipo decide explícitamente perseguir un despliegue comercial o llevar el producto a un cliente final** (ahí sí aplicarían Ruta 1 o Ruta 3).

**Distinción importante que sí queda registrada como control activo (no como bloqueo):** el hecho de que el uso no-comercial esté cubierto por la licencia **no significa que no haya nada que vigilar**. Las licencias tipo RAIL de estos modelos incluyen, además de la restricción comercial, **restricciones de uso** independientes de si el proyecto es comercial o no (no generar contenido que represente a una persona real de forma no consentida o dañina). Como el pipeline procesa fotos reales de cuerpos de usuarios, **el eje de riesgo real a partir de ahora es consentimiento y retención de esas fotos** — no el licenciamiento del modelo — y se traslada a `.speckit/constitution.md` §6 (Datos y Privacidad) como el control que sí debe tener mecanismo concreto (ver tarea pendiente ahí). Maximizar el realismo técnico del try-on es correcto y deseable; lo único que reabriría el riesgo de licencia es expandir el alcance a comercial sin volver a esta decisión.

Pendiente solo la ratificación formal de esta postura por el resto del equipo (Manuel, Huascar, Jaicel) en la próxima ceremonia — igual que el pivote de plataforma de `.speckit/constitution.md` §8.

### 12.3 D3 — SCHP vs. SAM: la decisión que evita trabajo innecesario

Esta es una decisión técnica pura, sin componente de producto/legal — se puede resolver ahora sin ratificación del equipo.

- **SCHP (Self-Correction Human Parsing):** propósito específico para parsing humano, produce directamente un mapa semántico por clase (torso, brazos, piernas, prendas por tipo). **Es el componente que IDM-VTON y OOTDiffusion usan en sus propias implementaciones de referencia** (`plan-base.md` §4.3 los menciona juntos precisamente porque el pipeline de referencia los acopla).
- **SAM (Segment Anything Model):** propósito general, requiere *prompting* (puntos/cajas) y devuelve máscaras sin etiqueta semántica — usarlo exigiría construir una capa adicional de clasificación para mapear cada máscara a "torso"/"pierna"/etc., trabajo de ingeniería extra que no está justificado si el modelo VTON elegido (D2) ya espera máscaras estilo SCHP como entrada.

**Decisión que fuerza el desarrollo:** usar **SCHP**, sin evaluación adicional — es la opción compatible por diseño con el pipeline VTON ya elegido en `plan-base.md` §4.3 y §6.1, evita construir infraestructura de clasificación que SAM exigiría, y no tiene ningún trade-off de licenciamiento distinto a D2 (SCHP es de investigación abierta, no depende de la resolución de D2). Se marca **CONFIRMADO** para efectos de `backend/vton-pipeline`.

**Resumen de impacto:** con D1 confirmado, D2 resuelto vía ratificación de postura académica (pendiente solo de aprobación formal del equipo, no de análisis técnico adicional), y D3 confirmado, **no queda ninguna decisión técnica bloqueando el inicio de `backend/domain-and-database` ni `backend/vton-pipeline`** — solo la ratificación de equipo de D2, que es un paso de gobernanza (ClickUp/ceremonia), no de arquitectura.

---

## 13. Próximos Pasos — Specs de Backend Propuestas

Bajo `openspec/specs/backend/`, siguiendo la misma estructura de capability-path nativa de OpenSpec que se está aplicando a `openspec/specs/frontend/`:

1. `backend/domain-and-database` — entidades de §5 (incluyendo `GarmentOwnership`), migraciones SQLAlchemy 2.0, seed del catálogo cápsula (50 prendas), índices `pgvector` de §5.4.
2. `backend/garment-analysis-service` — pipeline de §8, interfaz `GarmentAnalyzer`, fallback CLIP→ResNet.
3. `backend/recommender-engine` — pipeline de §9.1, Triplet Loss, consultas k-NN.
4. `backend/vton-pipeline` — pipeline de §9.2, `VtonInferenceProvider` swappable, circuit breaker.
5. `backend/api-gateway` — routers de §6 completos (incluyendo los 4 endpoints nuevos G1-G4), middlewares, jerarquía de errores de §10, trigger de §7.

Cada una seguirá el mismo formato nativo OpenSpec (`## Purpose` + `### Requirement` + `#### Scenario` WHEN/THEN) que se está aplicando retroactivamente a las specs de frontend — no el formato narrativo plano original, para que ambos lados del proyecto sean válidos bajo `openspec validate --specs` desde el primer commit de backend.
