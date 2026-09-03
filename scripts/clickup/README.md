# scripts/clickup

Reconciliación puntual del tablero ClickUp con la documentación del repo.
Dueño: Asiento D (Manuel) — "ClickUp al día" (`team-rotation-plan.md` §1).

## `sync-sprint-1.mjs`

Implementa `docs/sprint-plans/sprint-1-manifest.md` §7.

### Credencial

Se toma de una variable de entorno o de un archivo local **gitignoreado**. Nunca se versiona
ni se pasa como argumento.

```bash
# opción A — variable de entorno
export CLICKUP_API_TOKEN=<tu token>

# opción B — archivo local (scripts/clickup/.token, ya en .gitignore)
```

### Correr

```bash
node scripts/clickup/sync-sprint-1.mjs                          # DRY RUN — imprime cada cambio
node scripts/clickup/sync-sprint-1.mjs --apply                  # ejecuta
node scripts/clickup/sync-sprint-1.mjs --apply --no-create      # sin crear las tareas S0
node scripts/clickup/sync-sprint-1.mjs --apply --list <id>      # forzar la lista para las S0
node scripts/clickup/sync-sprint-1.mjs --apply --only=inreview,onhold   # re-correr un subconjunto
#   secciones válidas para --only: retitle | tags | inreview | onhold | s0
```

**Flujo:** dry-run → revisar la salida → `--apply`. Nunca uses el estado `"Ready for Staging"`
(dispara deploy). Después: exportar `SPRINT-1-MASTER.csv` a `docs/clickup/`.

### Nombres de estado y rate limit

Los nombres de estado (`in review`, `on hold`) varían por Space. El script los **resuelve
dinámicamente** contra los estados reales de cada lista. Si no encuentra uno equivalente,
lo dice e imprime los disponibles — entonces fijá el exacto y re-corré:

```bash
export CU_REVIEW_STATUS="<nombre exacto>"   # p. ej. "review" o "en revisión"
export CU_HOLD_STATUS="<nombre exacto>"     # p. ej. "blocked" o "en espera"
```

El plan gratuito de ClickUp limita a ~100 req/min. El script hace throttling
(`CU_SLEEP_MS`, default 800 ms) y reintenta los `429` respetando `Retry-After`.

Qué hace:

| Sección   | Acción |
| --------- | ------ |
| Retitles  | 7 títulos obsoletos → los del manifiesto §3/§6 |
| Tags      | `86e3122fr/fv/fy/g5` → `repo:backend` |
| In review | los 14 IDs de Asiento A → `in review` |
| On hold   | tareas de Leonardo que matchean ML/Data (EDA/ResNet/embedding/CLIP/dataset/training) → `on hold`. Imprime la lista — revisar antes de `--apply` |
| Sprint 0  | crea `[S0-1]`…`[S0-9]` en la lista `Deploy` |
