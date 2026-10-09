# ADR 401 — Dónde vive el clasificador CLIP y los prompts

Estado: aceptado
Fecha: 2026-10-09 (Sprint 4, Jaicel, cierre de las historias bccv y bcdj)

## Contexto

Al cerrar `86e31bccv` (CLIP Zero-Shot Evaluation) y `86e31bcdj` (CLIP Fine-Tuning
Preparation) apareció un conflicto entre cuatro contratos del repo sobre dónde
debe vivir `clip_classifier.py`:

| Fuente | Ruta que pide |
| --- | --- |
| AC de `86e31bccv` en ClickUp | `src/ml/models/clip_classifier.py` |
| `openspec/specs/backend/garment-analysis-service/spec.md` §6 Manifiesto | `src/services/garment_analysis/clip_classifier.py` |
| El mismo spec, §5 AC de cobertura | "≥ 90% en `src/services/garment_analysis/`" |
| `docs/clickup/backlog-seed.md` | "≥ 90% en `src/services/garment_analysis/`" |

Tres fuentes contra una. Además, 10 de los specs del proyecto tienen §"Manifiesto
de Archivos", o sea que no es una nota suelta sino una convención: los paths de
los manifests son relativos a `backend/`. Verificado con el spec de
`domain-and-database`, cuyo `src/domain/models.py` existe como
`backend/src/domain/models.py`.

A eso se suma una segunda divergencia: el manifest separa los prompts en su
propio archivo, `src/services/garment_analysis/prompts.py`.

El estado de hecho es que `backend/src/services/` está vacío salvo su
`__init__.py`, y `garment-analysis-service` es el epic de Asiento B de Sprint 3,
nunca empezado. En este sprint es Asiento C y QA de los dos.

## Decisión

El clasificador y los prompts viven en la **librería ML**, no en la capa de
servicio:

```
backend/src/ml/models/prompts.py         <- los prompts (TEMPLATES, expandir_prompts)
backend/src/ml/models/clip_classifier.py  <- derivar_pares, split_por_texto, validar_splits, inferencia
backend/src/ml/metrics/zero_shot.py       <- wilson, macro_f1, mcnemar_exact, evaluar, CLI
```

Cuando `garment-analysis-service` se construya, `services/garment_analysis/` va a
**importar** de acá en vez de reimplementar. El manifiesto del spec se actualizó
para reflejar eso.

La separación de prompts y clasificador sí se respetó: `prompts.py` es archivo
propio, como pide el §6. La divergencia queda solo en el prefijo de la ruta.

## Alternativas

**Mover todo a `backend/src/services/garment_analysis/`.** Cumple el §6, el §5 y
el `backlog-seed`, y deja el ClickUp AC incumplido — porque `86e31bccv` pide
`src/ml/models/clip_classifier.py` literal. Se descartó por dos razones: mezcla
código ML reutilizable con una capa HTTP que todavía no existe, y hace fallar el
contrato de la tarea que se está cerrando.

**Preguntar al PO antes de decidir.** Se hizo, y la instrucción fue aplicar el
criterio de capas sin esperar al Sprint Review.

**Dejar la decisión en un comentario del código, sin registro.** Fue lo primero
que se implementó y es lo que motivó escribir esta ADR: un docstring no es un
registro de decisión. Quien lea el spec veía un archivo fuera del manifiesto y no
tenía forma de saber si era un descuido o una decisión tomada.

## Consecuencias

- El AC de `86e31bccv` se cumple literal, sin reinterpretarlo.
- El §6 del spec queda modificado en un punto, con esta ADR como referencia. Es
  el único spec tocado de un epic ajeno al trabajo.
- `services/garment_analysis/` sigue vacío. Cuando arranque el epic, su
  `analyzer.py` y su `prompts.py` tienen una decisión previa que respetar: los
  prompts ya existen arriba, no se deben duplicar.
- El AC de "≥ 90% de cobertura en `src/services/garment_analysis/`" es
  **inimputable hasta que ese directorio exista**. No lo arregla esta ADR y hay
  que decirlo en el Sprint Review para que el PO no lo dé por cumplido.

Lo que el Sprint 4 sí dejó resuelto es la mitad que le tocaba: los tres AC de
`garment-analysis-service` que dependen de código ahora tienen dónde vivirlo, y
la de cobertura tiene un dueño y una fecha en vez de ser un supuesto.
