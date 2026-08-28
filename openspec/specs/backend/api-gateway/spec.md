## Purpose
Expone los routers FastAPI que orquestan `domain-and-database`, `garment-analysis-service`, `recommender-engine` y `vton-pipeline` como una API REST coherente, incluyendo los 4 endpoints originales de `plan-base.md` §11 y los 4 endpoints nuevos que cierran los gaps G1-G4 documentados en `openspec/specs/frontend/api-contract-gaps/spec.md`.

## Requirements

### Requirement: Todo error de dominio se traduce a un código HTTP consistente
El sistema SHALL traducir cada subclase de `StyleMeException` (`docs/context/backend-plan.md` §10) al código HTTP correspondiente, sin excepciones no controladas llegando al cliente como error 500 genérico.

#### Scenario: Excepción de dominio no controlada en un router
- **WHEN** cualquier servicio interno lanza `DataValidationError`, `ModelInferenceError`, `VTONJobTimeoutError` o `ResourceNotFoundError`
- **THEN** el Exception Handler global la traduce a 422, 500, 200 (status:failed), o 404 respectivamente — nunca se propaga un stack trace crudo al cliente

### Requirement: Paginación por cursor en todos los endpoints de listado
El sistema SHALL paginar `GET /garments`, `GET /vton/jobs` por cursor, nunca por offset, para no degradar con el crecimiento del catálogo/historial.

#### Scenario: Listado de prendas de un usuario con armario grande
- **WHEN** un usuario con cientos de prendas solicita `GET /garments?user_id={id}`
- **THEN** la respuesta incluye un cursor para la siguiente página, y el rendimiento no se degrada linealmente con el total de prendas del usuario (a diferencia de offset)

### Requirement: Endpoint de adopción de catálogo cápsula es idempotente en efecto
El sistema SHALL tratar una segunda adopción de la misma prenda cápsula por el mismo usuario como no-error, aunque no cree una fila duplicada.

#### Scenario: Usuario adopta dos veces la misma prenda cápsula
- **WHEN** `POST /garments/capsule/{garment_id}/adopt` se invoca dos veces para el mismo usuario y prenda
- **THEN** la segunda invocación responde `409` pero no representa un fallo funcional — el frontend la trata como éxito silencioso (contrato ya fijado en `docs/context/backend-plan.md` §6.2)

### Requirement: CORS y rate limiting protegen la API sin bloquear el flujo legítimo
El sistema SHALL restringir CORS a los orígenes del frontend conocidos (dev/staging/prod) y SHALL aplicar rate limiting por IP/usuario a los endpoints de mutación costosa (`/garments/upload`, `/vton/try-on`), sin afectar los endpoints de lectura.

#### Scenario: Origen no autorizado
- **WHEN** una request llega desde un origen fuera de la lista permitida
- **THEN** el middleware CORS la rechaza antes de que llegue a cualquier router

#### Scenario: Rate limit excedido en creación de VTONJob
- **WHEN** un usuario excede el límite de solicitudes configurado a `/vton/try-on` en la ventana de tiempo definida
- **THEN** la respuesta es `429` con mensaje descriptivo, sin llegar a invocar el pipeline VTON

---

## 1. Propósito y SLA

**Origen:** `docs/context/backend-plan.md` §6, §13 (B5).

**SLA:** cada endpoint hereda el SLA ya fijado por su spec de servicio subyacente (`garment-analysis-service` 20s, `recommender-engine` 10s, `vton-pipeline` 10s de creación). Este gateway no debe agregar latencia perceptible (<50ms de overhead de routing/middleware).

## 2. Contratos

### 2.1 Routers y endpoints completos

| Endpoint | Método | Servicio subyacente | Gap que cierra |
| :--- | :--- | :--- | :--- |
| `/api/v1/garments/upload` | `POST` | garment-analysis-service | — (ya contratado) |
| `/api/v1/garments?user_id&cursor&limit` | `GET` | domain-and-database | **G1** |
| `/api/v1/garments/capsule/{garment_id}/adopt` | `POST` | domain-and-database | **G4** |
| `/api/v1/outfits/recommend` | `POST` | recommender-engine | — (ya contratado) |
| `/api/v1/outfits/{outfit_id}` | `GET` | domain-and-database | **G2** |
| `/api/v1/vton/try-on` | `POST` | vton-pipeline | — (ya contratado) |
| `/api/v1/vton/status/{job_id}` | `GET` | vton-pipeline | — (ya contratado) |
| `/api/v1/vton/jobs?user_id&status&cursor` | `GET` | domain-and-database | **G3** |

Forma exacta de request/response: `docs/context/backend-plan.md` §6.2 (G1-G4) y `plan-base.md` §11 (originales) — esta spec no redefine forma, solo la implementación de routing/middleware/errores.

### 2.2 Exception Handler global

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

EXCEPTION_STATUS_MAP = {
    DataValidationError: 422,
    ResourceNotFoundError: 404,
    ModelInferenceError: 500,
}

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StyleMeException)
    async def handle_domain_exception(request: Request, exc: StyleMeException):
        status = EXCEPTION_STATUS_MAP.get(type(exc), 500)
        return JSONResponse(status_code=status, content={"error": exc.__class__.__name__, "message": str(exc)})
```
`VTONJobTimeoutError` no pasa por este handler — se resuelve como `status: failed` dentro del payload 200 del job (es un fallo de negocio, no de transporte, según `docs/context/backend-plan.md` §10).

### 2.3 Middlewares

```python
app.add_middleware(CORSMiddleware, allow_origins=settings.ALLOWED_ORIGINS, allow_methods=["GET", "POST"])
app.add_middleware(RateLimitMiddleware, limits={"/garments/upload": "20/minute", "/vton/try-on": "10/minute"})
```

## 3. Flujo de Datos Interno

```
Request entrante
        │
        v
CORS middleware ──► rechaza origen no autorizado (antes de cualquier router)
        │
        v
Rate limit middleware (solo en endpoints de mutación costosa) ──► 429 si excede
        │
        v
Router correspondiente ──► delega al servicio de dominio (garment-analysis-service /
                            recommender-engine / vton-pipeline / domain-and-database)
        │
        ├─ éxito ──► response DTO (Pydantic) ──► 200
        │
        └─ StyleMeException ──► Exception Handler global ──► status HTTP mapeado
```

## 4. Estrategia de Pruebas

**Unitarias (pytest + `TestClient` de FastAPI):**
- Exception Handler: cada subclase de `StyleMeException` mapeada al status correcto (tabla de §2.2), verificado con un router de prueba que lanza cada una.
- CORS: origen no permitido rechazado antes de llegar al router (mock del router, assert de no-invocación).
- Rate limit: N+1 solicitudes en la ventana → la N+1 responde 429, las N anteriores no.

**Integración (pytest, servicios de dominio mockeados):**
- Los 8 endpoints de §2.1 responden con la forma exacta de su contrato (golden files derivados de los fixtures JSON de `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.5 — misma fuente de verdad que ya usa el frontend, sin duplicar fixtures divergentes).
- `GET /garments` con cursor: segunda página no repite ni omite elementos de la primera (test con dataset de fixture conocido).
- `POST /garments/capsule/{id}/adopt` invocado dos veces → primera 200/201, segunda 409, sin excepción no controlada.

**Casos borde:**
- `GET /outfits/{outfit_id}` para un outfit que pertenece a otro usuario → 404, no 403 (no revelar existencia del recurso a quien no es su dueño).
- Payload malformado en cualquier endpoint POST → 422 con detalle de qué campo falló (Pydantic ya lo provee, verificar que no se opaca).

## 5. Criterios de Aceptación

- [ ] Los 8 endpoints de §2.1 implementados, incluyendo los 4 que cierran G1-G4, con la forma exacta ya contratada.
- [ ] Exception Handler global cubre las 4 subclases de `StyleMeException` con el mapeo de status de §2.2, verificado por test.
- [ ] `GET /garments` y `GET /vton/jobs` paginan por cursor, verificado con test de dataset grande (sin degradación ni duplicados/omisiones entre páginas).
- [ ] `POST /garments/capsule/{id}/adopt` es idempotente en efecto (409 en la segunda invocación, sin fila duplicada), verificado por test.
- [ ] CORS restringido a orígenes conocidos, rate limiting aplicado solo a `/garments/upload` y `/vton/try-on`.
- [ ] Los fixtures de test de este gateway son los mismos JSON de `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.5 — cero fixtures divergentes creados ad-hoc.
- [ ] `pytest tests/ -v --cov=src` ≥ 90% de cobertura en `src/api/`.

## 6. Manifiesto de Archivos

```
src/api/routers/garments.py
src/api/routers/outfits.py
src/api/routers/vton.py
src/api/middlewares/cors.py
src/api/middlewares/rate_limit.py
src/api/exception_handlers.py
src/api/pagination.py
src/main.py
tests/unit/api/test_exception_handlers.py
tests/unit/api/test_cors.py
tests/unit/api/test_rate_limit.py
tests/integration/api/test_garments_router.py
tests/integration/api/test_outfits_router.py
tests/integration/api/test_vton_router.py
tests/integration/api/test_capsule_adoption_idempotency.py
```
