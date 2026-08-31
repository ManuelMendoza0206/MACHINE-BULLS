## Purpose
Implementa el motor de recomendación de outfits (`POST /api/v1/outfits/recommend`): armonía cromática vía CIELAB/HSV y compatibilidad aprendida vía embeddings de Triplet Loss consultados por k-NN sobre `pgvector`. Es el componente que justifica que StyleMe no es un CRUD con IA pegada encima (`.speckit/constitution.md` §2).

## Requirements

### Requirement: Score cromático basado en reglas de armonía del círculo cromático
El sistema SHALL calcular un score cromático por combinación candidata aplicando reglas de análogos, complementarios y triadas sobre el espacio HSV/CIELAB, penalizando combinaciones saturadas discordantes.

#### Scenario: Combinación de colores complementarios
- **WHEN** dos prendas candidatas tienen tonos complementarios en el círculo cromático (ej. azul y naranja, saturación moderada)
- **THEN** el score cromático de esa combinación es mayor que el de una combinación con tonos análogos de saturación alta discordante

### Requirement: Compatibilidad aprendida vía embedding de 128 dimensiones
El sistema SHALL proyectar cada prenda a un espacio de embedding de compatibilidad (D=128) entrenado con Triplet Loss, y usar distancia coseno para medir compatibilidad entre prendas.

#### Scenario: Consulta de prendas compatibles
- **WHEN** se solicita completar un outfit a partir de una prenda ancla
- **THEN** el sistema consulta k-NN sobre `pgvector` (índice HNSW, spec `domain-and-database`) para encontrar las prendas con menor distancia coseno en el espacio de embedding, no una búsqueda por fuerza bruta

### Requirement: Respeta el armario disponible cuando se solicita explícitamente
El sistema SHALL restringir las combinaciones candidatas a `available_garment_ids` cuando el request lo especifica, y SHALL devolver un array vacío (no un error) cuando no existen combinaciones viables con esa restricción.

#### Scenario: Usuario filtra por armario disponible sin combinaciones viables
- **WHEN** `available_garment_ids` no contiene prendas suficientes para cubrir las 3-4 posiciones de un outfit
- **THEN** la respuesta es `{ "outfits": [] }` con status 200 — nunca un error 4xx/5xx por "no encontrado"

### Requirement: Filtro opcional por estética objetivo
El sistema SHALL filtrar o priorizar combinaciones hacia `target_aesthetic` cuando el request lo especifica, sin excluir por completo otras estéticas si no hay suficientes combinaciones de la solicitada.

#### Scenario: Estética objetivo con pocas combinaciones disponibles
- **WHEN** `target_aesthetic` se especifica pero el armario solo produce 1 combinación de esa estética
- **THEN** la respuesta prioriza esa combinación pero puede incluir otras estéticas para completar el array, en vez de devolver solo 1 resultado

---

## 1. Propósito y SLA

**Origen:** `docs/context/backend-plan.md` §9.1, `plan-base.md` §4.2.

**SLA:** timeout total del endpoint = 10s (ya asumido por frontend spec 01 §1). La consulta k-NN debe resolver en <500ms (heredado de `domain-and-database` §Requirement de búsqueda vectorial); el presupuesto restante es el cálculo de score cromático por combinación candidata. FITB (Fill-In-The-Blank) objetivo >70% (`plan-base.md` §9.2).

## 2. Contratos

```python
from dataclasses import dataclass
from typing import Protocol
import numpy as np

@dataclass(frozen=True)
class OutfitCandidate:
    outfit_id: str
    aesthetic: str
    chromatic_score: float  # [0,1]
    embedding_score: float  # [0,1], derivado de 1 - distancia_coseno_normalizada
    garments: list[tuple[str, str]]  # (garment_id, position)

class ChromaticHarmonyScorer(Protocol):
    def score(self, dominant_colors: list[tuple[float, float, float]]) -> float:
        """Recibe colores HSV de las prendas candidatas, retorna score [0,1]."""
        ...

class CompatibilityEmbeddingModel(Protocol):
    def embed(self, garment_features: np.ndarray) -> np.ndarray:  # -> vector(128)
        ...

class OutfitRecommender(Protocol):
    async def recommend(
        self,
        user_id: str,
        target_aesthetic: str | None,
        available_garment_ids: list[str] | None,
    ) -> list[OutfitCandidate]: ...
```

**Triplet Loss (entrenamiento, `plan-base.md` §4.2.B):**

$$\mathcal{L}(A, P, N) = \max\left(0, D(f(A), f(P)) - D(f(A), f(N)) + \alpha\right)$$

$A$=ancla, $P$=positivo compatible, $N$=negativo incompatible, $\alpha$=margen — no se reimplementa aquí, es la spec de entrenamiento offline; esta spec consume el modelo ya entrenado vía `CompatibilityEmbeddingModel.embed()`.

## 3. Flujo de Datos Interno

```
POST /outfits/recommend { user_id, target_aesthetic?, available_garment_ids? }
        │
        v
Resolver conjunto de prendas candidatas
   (available_garment_ids si se especifica, si no: todo el armario del usuario vía G1)
        │
        ├─ conjunto insuficiente para cubrir posiciones ──► { "outfits": [] }, 200 OK
        │
        v
Para cada combinación candidata (top+bottom+footwear[+outerwear]):
        │
        ├─► ChromaticHarmonyScorer.score(colores HSV) ──► chromatic_score
        │
        └─► CompatibilityEmbeddingModel.embed() por prenda
                 ──► consulta k-NN pgvector (índice HNSW) ──► embedding_score
        │
        v
Combinar scores, filtrar/priorizar por target_aesthetic si se especificó
        │
        v
Ordenar por score combinado, devolver Top-N como OutfitRecommendationResponse
(spec frontend 01 §2.3 — mismo shape exacto)
```

## 4. Estrategia de Pruebas

**Unitarias (pytest):**
- `ChromaticHarmonyScorer`: casos conocidos de teoría del color (complementarios, análogos, triadas) con scores esperados relativos (A > B en vez de valores absolutos frágiles).
- `available_garment_ids` insuficiente → `[]` sin excepción.
- `target_aesthetic` con pocas combinaciones → no excluye otras estéticas del resultado (verificado con fixture controlada).

**Integración (pytest + fixture de pgvector con embeddings conocidos):**
- Consulta k-NN usa el índice HNSW (verificado vía `EXPLAIN ANALYZE`, mismo patrón que `domain-and-database`).
- Evaluación FITB sobre dataset curado — suite de evaluación aparte (no bloqueante), reporta si cae bajo 70%.

**Casos borde:**
- Usuario con exactamente las prendas mínimas para 1 combinación (sin variantes) — debe devolver esa única combinación, no fallar.
- Empate de score entre dos combinaciones — orden determinista (criterio de desempate documentado, ej. por `outfit_id`).

## 5. Criterios de Aceptación

- [ ] `ChromaticHarmonyScorer` implementado con reglas de análogos/complementarios/triadas, verificado con casos relativos de teoría del color.
- [ ] `CompatibilityEmbeddingModel.embed()` consume el modelo ya entrenado (D=128), sin lógica de entrenamiento en este servicio.
- [ ] Consulta de compatibilidad usa k-NN sobre el índice HNSW de `domain-and-database`, no fuerza bruta (verificado con `EXPLAIN ANALYZE`).
- [ ] `available_garment_ids` insuficiente devuelve `{ "outfits": [] }` con 200 OK, nunca un error.
- [ ] `target_aesthetic` prioriza sin excluir por completo otras estéticas cuando hay pocas combinaciones de la solicitada.
- [ ] Timeout total del endpoint ≤ 10s verificado con test de presupuesto de tiempo.
- [ ] Suite de evaluación FITB (no bloqueante) documentada y ejecutable bajo demanda, reporta contra el umbral de 70%.
- [ ] `pytest tests/ -v --cov=src` ≥ 90% de cobertura en `src/services/recommender/`.

## 6. Manifiesto de Archivos

```
src/services/recommender/engine.py
src/services/recommender/chromatic_scorer.py
src/services/recommender/embedding_model.py
src/services/recommender/candidate_generation.py
tests/unit/services/recommender/test_chromatic_scorer.py
tests/unit/services/recommender/test_engine.py
tests/unit/services/recommender/test_candidate_generation.py
tests/integration/services/recommender/test_knn_query.py
tests/evaluation/test_fitb_accuracy.py
```
