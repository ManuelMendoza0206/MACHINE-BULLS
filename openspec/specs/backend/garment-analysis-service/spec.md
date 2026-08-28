## Purpose
Implementa el pipeline de análisis de prendas (`POST /api/v1/garments/upload`): remoción de fondo, clasificación de categoría funcional y detección de estética contemporánea, con fallback cuando la confianza del clasificador primario es insuficiente. Es el primer pipeline de ML del proyecto y el que determina si el enfoque "no wrapper" del proyecto (§2.1 de `plan-base.md`) es real.

## Requirements

### Requirement: Remoción de fondo previa a cualquier clasificación
El sistema SHALL aislar la prenda del fondo de la imagen antes de ejecutar cualquier paso de clasificación.

#### Scenario: Imagen con fondo complejo
- **WHEN** se sube una imagen con fondo no uniforme (habitación, otras prendas visibles)
- **THEN** `rembg` (U-2-Net) produce una imagen con fondo removido antes de que CLIP la reciba, y esa imagen procesada es la que se persiste como `processed_image_url`

### Requirement: Clasificación zero-shot con fallback a modelo fine-tuned
El sistema SHALL usar CLIP zero-shot como clasificador primario de estética, y recurrir a un ResNet-50 fine-tuned cuando la confianza de CLIP caiga bajo el umbral configurado.

#### Scenario: Confianza CLIP suficiente
- **WHEN** CLIP zero-shot devuelve una estética con confianza ≥ umbral configurado
- **THEN** esa es la respuesta final — el fallback ResNet-50 no se invoca (evita costo de inferencia innecesario)

#### Scenario: Confianza CLIP insuficiente
- **WHEN** CLIP zero-shot devuelve todas las estéticas candidatas con confianza < umbral configurado
- **THEN** se invoca el fallback ResNet-50 fine-tuned, y su resultado reemplaza al de CLIP en la respuesta final

### Requirement: Respuesta Top-N con score, nunca un valor único absoluto
El sistema SHALL devolver las estéticas candidatas ordenadas por confianza (Top-N), nunca una única etiqueta sin score — mitigación ya acordada en `plan-base.md` §8 para el riesgo de baja precisión en estéticas ambiguas.

#### Scenario: Estética ambigua entre dos categorías
- **WHEN** una prenda tiene rasgos de dos estéticas (ej. Streetwear y Starboy)
- **THEN** la respuesta incluye ambas en `top_aesthetics` con sus confidence scores respectivos, no solo la de mayor score

### Requirement: Normalización de imagen consistente con el encoder
El sistema SHALL normalizar toda imagen a 224×224 RGB con la normalización estándar de ImageNet/CLIP antes de la inferencia, para ambos modelos (CLIP y el fallback ResNet-50).

#### Scenario: Imagen de resolución arbitraria subida por el usuario
- **WHEN** el usuario sube una imagen de cualquier resolución/aspect ratio
- **THEN** el pipeline la redimensiona/normaliza a 224×224 antes de pasarla a cualquiera de los dos modelos, sin distorsión que degrade la clasificación

---

## 1. Propósito y SLA

**Origen:** `docs/context/backend-plan.md` §8, `plan-base.md` §4.1.

**SLA:** timeout total del endpoint `POST /garments/upload` = 20s (ya asumido por `openspec/specs/frontend/api-client-and-schemas/spec.md` §1). Presupuesto interno: `rembg` ~3-5s, CLIP inference ~1-2s en GPU, margen restante para I/O de red del archivo subido y persistencia en Cloudinary. F1-Score objetivo: >0.82 categoría, >0.75 estética (`plan-base.md` §9.1).

## 2. Contratos

```python
from typing import Protocol
from dataclasses import dataclass
from PIL import Image

@dataclass(frozen=True)
class AestheticScore:
    aesthetic: str
    confidence: float

@dataclass(frozen=True)
class DominantColor:
    h: float; s: float; v: float; hex: str

@dataclass(frozen=True)
class GarmentAnalysisResult:
    category: str
    top_aesthetics: list[AestheticScore]  # ordenado desc por confidence, longitud ≥1
    dominant_colors: list[DominantColor]
    processed_image_url: str

class GarmentAnalyzer(Protocol):
    async def analyze(self, image: Image.Image) -> GarmentAnalysisResult: ...

class BackgroundRemover(Protocol):
    async def remove_background(self, image: Image.Image) -> Image.Image: ...

class AestheticClassifier(Protocol):
    async def classify(self, image: Image.Image) -> list[AestheticScore]: ...
    @property
    def confidence_threshold(self) -> float: ...
```

**Prompt engineering CLIP (`plan-base.md` §4.1.A):** cada estética se representa como un prompt estructurado (ej. `"A photo of an old money aesthetic men's outfit, linen shirt, quiet luxury"`), no como una sola palabra — esto es lo que hace al enfoque zero-shot viable sin fine-tuning inicial.

## 3. Flujo de Datos Interno

```
POST /garments/upload (multipart/form-data)
        │
        v
Validación de imagen (tamaño, formato) ──► DataValidationError (422) si falla
        │
        v
BackgroundRemover.remove_background() [rembg / U-2-Net]
        │
        v
Normalización 224×224 RGB (ImageNet/CLIP)
        │
        v
AestheticClassifier.classify() [CLIP zero-shot]
        │
        ├─ confidence ≥ umbral ──► usar resultado CLIP
        │
        └─ confidence < umbral ──► ResNet-50 fine-tuned (fallback)
                                        │
                                        v
                                usar resultado ResNet-50
        │
        v
Clasificación de categoría funcional (mismo backbone, cabeza de clasificación separada)
        │
        v
Extracción de colores dominantes (HSV) sobre la imagen ya sin fondo
        │
        v
Persistir processed_image_url en Cloudinary
        │
        v
GarmentAnalysisResult ──► 200 OK (GarmentUploadResponse, spec 01 frontend §2.3)
```

## 4. Estrategia de Pruebas

**Unitarias (pytest, modelos mockeados):**
- `BackgroundRemover`: dado un mock de `rembg`, verifica que se invoca antes de cualquier clasificación (orden de llamadas).
- `AestheticClassifier`: confidence ≥ umbral → no invoca fallback; confidence < umbral → invoca fallback (mock de ambos clasificadores, assert de invocación).
- Respuesta siempre incluye ≥1 elemento en `top_aesthetics`, ordenado desc por confidence.
- Normalización: imagen de entrada de resolución arbitraria (ej. 4000×3000) produce tensor de exactamente 224×224 antes de la inferencia.

**Integración (pytest, modelos reales sobre fixtures curadas — no en el path de CI rápido):**
- Suite de evaluación aparte (no bloqueante) mide F1 real contra el dataset curado de `plan-base.md` §5.2, reporta si cae bajo 0.82/0.75.
- Caso de imagen corrupta/no es ropa → `ModelInferenceError` (500) sin exponer stack trace, según jerarquía de `docs/context/backend-plan.md` §10.

**Casos borde:**
- Imagen con múltiples prendas visibles (ej. outfit completo en una foto) — documentar comportamiento esperado (clasifica la prenda dominante, no falla).
- Imagen de 1x1 px o corrupta — rechazo con `DataValidationError`, no crash.

## 5. Criterios de Aceptación

- [ ] `BackgroundRemover` implementado con `rembg`/U-2-Net, invocado antes de cualquier paso de clasificación (verificado por test de orden de llamadas).
- [ ] `AestheticClassifier` (CLIP zero-shot) implementado con prompts estructurados por estética, no palabras sueltas.
- [ ] Fallback a ResNet-50 fine-tuned implementado y disparado únicamente cuando la confianza CLIP cae bajo el umbral configurado (test de ambos escenarios).
- [ ] Respuesta expone `top_aesthetics` como lista ordenada con ≥1 elemento, nunca una etiqueta única sin score.
- [ ] Normalización 224×224 RGB aplicada de forma idéntica a ambos modelos (CLIP y fallback).
- [ ] Timeout total del endpoint ≤ 20s verificado con test de presupuesto de tiempo (mock de latencia de cada etapa).
- [ ] Suite de evaluación de F1 real (no bloqueante de CI) documentada y ejecutable bajo demanda.
- [ ] `pytest tests/ -v --cov=src` ≥ 90% de cobertura en `src/services/garment_analysis/`.

## 6. Manifiesto de Archivos

```
src/services/garment_analysis/analyzer.py
src/services/garment_analysis/background_remover.py
src/services/garment_analysis/clip_classifier.py
src/services/garment_analysis/resnet_fallback_classifier.py
src/services/garment_analysis/color_extraction.py
src/services/garment_analysis/prompts.py
src/config/vision_thresholds.py
tests/unit/services/garment_analysis/test_analyzer.py
tests/unit/services/garment_analysis/test_clip_classifier.py
tests/unit/services/garment_analysis/test_resnet_fallback.py
tests/unit/services/garment_analysis/test_color_extraction.py
tests/integration/services/garment_analysis/test_pipeline_e2e.py
tests/evaluation/test_f1_score_curated_dataset.py
```
