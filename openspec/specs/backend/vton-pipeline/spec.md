## Purpose
Implementa el pipeline de probador virtual (`POST /api/v1/vton/try-on` + `GET /api/v1/vton/status/{job_id}`): estimación de pose, segmentación anatómica y generación vía modelo de difusión externo, con tolerancia a fallos y respeto estricto de la decisión de alcance académico/no comercial ya ratificada (D2, `.speckit/constitution.md` §8).

## Requirements

### Requirement: Extracción de pose y parsing humano antes de invocar el proveedor externo
El sistema SHALL ejecutar MediaPipe Pose y SCHP (Self-Correction Human Parsing) sobre la foto del usuario antes de enviar cualquier dato al proveedor de inferencia VTON.

#### Scenario: Foto de usuario válida
- **WHEN** se recibe una foto de usuario con cuerpo completo visible
- **THEN** se generan los keypoints de pose (MediaPipe) y la máscara de parsing anatómico (SCHP) antes de construir el payload para Replicate/RunPod

#### Scenario: Foto sin pose detectable
- **WHEN** MediaPipe Pose no detecta un cuerpo humano en la imagen (foto irrelevante, ángulo extremo, cuerpo parcialmente cubierto)
- **THEN** el `VTONJob` pasa a `status: failed` con `error_message` descriptivo, sin invocar al proveedor externo (evita costo de GPU en una entrada inválida)

### Requirement: Tolerancia a fallos del proveedor de inferencia externo
El sistema SHALL reintentar con backoff exponencial ante fallos transitorios de Replicate/RunPod, y SHALL abrir un circuit breaker tras N fallos consecutivos en una ventana de tiempo, marcando el job como `failed` inmediatamente en vez de encolarlo contra un proveedor caído.

#### Scenario: Fallo transitorio único
- **WHEN** la llamada a Replicate falla una vez (timeout de red, 503)
- **THEN** el sistema reintenta con backoff exponencial hasta un máximo de 3 intentos antes de marcar el job como fallido

#### Scenario: Proveedor caído (circuit breaker abierto)
- **WHEN** el circuit breaker está abierto por fallos consecutivos recientes
- **THEN** un nuevo `VTONJob` se marca `failed` con `error_message` inmediato, sin intentar la llamada real — evita que el frontend haga polling contra un job que nunca podrá completarse

### Requirement: Estado del job persistido y consultable de forma asíncrona
El sistema SHALL persistir el `VTONJob` en estado `pending`/`processing` inmediatamente al recibir la solicitud, y SHALL actualizar su estado a `completed`/`failed` de forma asíncrona sin bloquear la respuesta inicial.

#### Scenario: Creación de un job VTON
- **WHEN** se recibe `POST /vton/try-on` con foto y outfit válidos
- **THEN** la respuesta inmediata es `{ job_id, status: "processing", estimated_time_seconds }` — el procesamiento real ocurre después, de forma asíncrona

### Requirement: Proveedor de inferencia swappable sin afectar el contrato HTTP
El sistema SHALL encapsular la llamada al modelo VTON detrás de una interfaz `VtonInferenceProvider`, de forma que cambiar de proveedor (por resolución futura del riesgo de licenciamiento) no requiera cambios en el contrato expuesto al frontend.

#### Scenario: Cambio de proveedor de inferencia
- **WHEN** el equipo decide cambiar el checkpoint/proveedor de IDM-VTON/OOTDiffusion por otro (ej. tras revisar el alcance comercial)
- **THEN** el cambio se limita a la implementación de `VtonInferenceProvider`, sin tocar el router HTTP ni el schema de respuesta

---

## 1. Propósito y SLA

**Origen:** `docs/context/backend-plan.md` §9.2-9.3, `plan-base.md` §4.3, §8.

**SLA:** `POST /vton/try-on` responde en <10s (solo crea el job). El procesamiento asíncrono completo tiene un `estimated_time_seconds` comunicado al frontend; el timeout de UI del lado frontend es de 90s (`openspec/specs/frontend/vton-flow/spec.md` §2.2) — este backend nunca debe hacer sentir ese timeout como "roto" dejando un job en `processing` indefinidamente sin resolución eventual.

**Decisión de alcance heredada (D2, no reabrir aquí):** el proveedor usado es un checkpoint community de IDM-VTON/OOTDiffusion vía Replicate, bajo alcance académico/no comercial ya ratificado. El mecanismo de consentimiento/retención de fotos de usuario (Epic Q5 de Hardening) es una dependencia externa a esta spec, no se reimplementa aquí — este pipeline asume que el consentimiento ya fue capturado antes de que la foto llegue a este servicio.

## 2. Contratos

```python
from typing import Protocol
from dataclasses import dataclass
from enum import Enum

class VtonJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass(frozen=True)
class PoseExtractionResult:
    keypoints: list[tuple[float, float, float]]  # (x, y, confidence) por landmark
    parsing_mask_url: str  # máscara SCHP persistida

class PoseExtractor(Protocol):
    async def extract(self, user_photo_url: str) -> PoseExtractionResult | None:
        """None si no se detecta pose válida."""
        ...

class VtonInferenceProvider(Protocol):
    async def generate(
        self, user_photo_url: str, garment_photo_url: str, parsing_mask_url: str
    ) -> str:  # -> result_url
        """Lanza VTONJobTimeoutError o ModelInferenceError (docs/context/backend-plan.md §10) ante fallo."""
        ...

class CircuitBreaker(Protocol):
    def is_open(self) -> bool: ...
    def record_success(self) -> None: ...
    def record_failure(self) -> None: ...
```

## 3. Flujo de Datos Interno

```
POST /vton/try-on (multipart: user_image, outfit_id)
        │
        v
Crear VTONJob(status=pending) ──► persistir inmediatamente
        │
        v
Responder 200 { job_id, status: "processing", estimated_time_seconds }
        │
        v  (procesamiento asíncrono, background task/worker)
PoseExtractor.extract(user_photo)
        │
        ├─ None (sin pose detectable) ──► VTONJob.status = failed, error_message descriptivo ──► FIN
        │
        v
CircuitBreaker.is_open()?
        │
        ├─ true ──► VTONJob.status = failed, error_message inmediato ──► FIN (sin llamar a Replicate)
        │
        v
VtonInferenceProvider.generate(foto, prenda, máscara)
        │
        ├─ éxito ──► CircuitBreaker.record_success() ──► VTONJob.status=completed, result_url
        │
        └─ fallo transitorio ──► retry backoff (máx 3) ──► si agota reintentos:
                                    CircuitBreaker.record_failure()
                                    VTONJob.status = failed, error_message
        │
        v
GET /vton/status/{job_id} ──► siempre refleja el estado actual persistido (spec frontend 04 hace polling sobre esto)
```

## 4. Estrategia de Pruebas

**Unitarias (pytest, proveedor externo mockeado):**
- `PoseExtractor`: fixture sin pose detectable → retorna `None`, no lanza excepción.
- `CircuitBreaker`: N fallos consecutivos en la ventana configurada → `is_open()` retorna `true`; un éxito posterior lo resetea.
- Backoff: 3 reintentos exactos ante fallo transitorio persistente, con delays crecientes (verificado con fake timers/clock).
- Job sin pose detectable → nunca invoca `VtonInferenceProvider` (assert de no-invocación).

**Integración (pytest, con un mock HTTP del proveedor Replicate):**
- Flujo feliz completo: creación → pose+parsing → generación → `completed` con `result_url`.
- Circuit breaker abierto → nuevo job falla inmediatamente, 0 llamadas HTTP al proveedor mockeado.
- `GET /vton/status/{job_id}` refleja el estado en cada etapa del flujo asíncrono (polling simulado).

**Casos borde:**
- Outfit inexistente o que no pertenece al usuario → `ResourceNotFoundError` (404) antes de crear el job.
- Proveedor responde con resultado pero `result_url` inválida/inaccesible → tratado como `ModelInferenceError`, no como éxito silencioso.

## 5. Criterios de Aceptación

- [ ] `PoseExtractor` (MediaPipe Pose) y parsing (SCHP) ejecutados antes de cualquier llamada al proveedor externo, verificado por test de orden de invocación.
- [ ] Foto sin pose detectable marca el job como `failed` sin invocar al proveedor externo (ahorro de costo verificado).
- [ ] Backoff exponencial con máximo 3 reintentos implementado y testeado con fake timers.
- [ ] Circuit breaker implementado: abre tras N fallos consecutivos configurables, resetea con un éxito, verificado por test.
- [ ] `VTONJob` se persiste en `pending` inmediatamente al recibir la solicitud, antes de cualquier procesamiento asíncrono.
- [ ] `VtonInferenceProvider` es una interfaz swappable — ningún router HTTP importa directamente el SDK de Replicate.
- [ ] `POST /vton/try-on` responde en <10s (solo creación del job, verificado con test de presupuesto de tiempo).
- [ ] `pytest tests/ -v --cov=src` ≥ 90% de cobertura en `src/services/vton/`.

## 6. Manifiesto de Archivos

```
src/services/vton/pipeline.py
src/services/vton/pose_extractor.py
src/services/vton/schp_parser.py
src/services/vton/replicate_provider.py
src/services/vton/circuit_breaker.py
src/services/vton/job_repository.py
tests/unit/services/vton/test_pose_extractor.py
tests/unit/services/vton/test_circuit_breaker.py
tests/unit/services/vton/test_pipeline.py
tests/integration/services/vton/test_pipeline_e2e.py
tests/integration/services/vton/test_circuit_breaker_integration.py
```
