# ML skeleton (`src/ml`) — historias bccr + bccz

Todos los comandos se corren desde `backend/` (ahí vive el `pyproject.toml`
que configura pytest):

```bash
cd backend
```

## Cómo correr training (skeleton)

```bash
uv run python -m ml.training.train --config src/ml/config.yaml
uv run python -m ml.training.train --config src/ml/config.yaml --run  # falla honesto (loop pendiente)
```

El skeleton valida config e imprime el plan. El loop levanta `NotImplementedError`
hasta el sprint de entrenamiento.

## Cómo correr evaluación mínima

```bash
uv run python -m ml.validation.eval --preds preds.json --labels labels.json --out metrics.json
```

Para métricas completas (precision/recall/F1, matriz, reportes) usar
`ml.metrics.evaluator.Evaluator` (historia bccz).

## Tests

```bash
uv run pytest                 # todo (tests/ + src/ml)
uv run pytest tests/test_evaluator.py
uv run ruff check src/ml tests
```
