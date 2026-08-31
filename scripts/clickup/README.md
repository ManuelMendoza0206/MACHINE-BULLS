# scripts/clickup

Reconciliación puntual del tablero ClickUp con la documentación del repo.

## `sync-sprint-1.mjs`

Implementa `docs/sprint-plans/sprint-1-manifest.md` §7: retitula ~7 tareas obsoletas,
etiqueta 4 como `repo:backend`, mueve a `in review` las tareas ya implementadas en rama, y
crea las 9 tareas de Sprint 0 (S0-1 … S0-9) para trazabilidad (`constitution.md` §5).

### Token — nunca en un comando ni en el script

```bash
# opción A: variable de entorno (no la pegues en un chat)
export CLICKUP_API_TOKEN=pk_...

# opción B: archivo local (gitignoreado)
echo -n 'pk_...' > scripts/clickup/.token
```

### Correr

```bash
node scripts/clickup/sync-sprint-1.mjs            # DRY RUN — imprime cada cambio, no toca nada
node scripts/clickup/sync-sprint-1.mjs --apply    # ejecuta
node scripts/clickup/sync-sprint-1.mjs --apply --no-create   # solo retitular/etiquetar/estado
```

**Flujo recomendado:** dry-run → revisar la salida → `--apply`. Nada de estados
`"Ready for Staging"` (dispara deploy). Después: exportar `SPRINT-1-MASTER.csv` a `docs/clickup/`
y **rotar el token**.

Dueño de esta tarea: Asiento D (Manuel) — es su responsabilidad "ClickUp al día" (`team-rotation-plan.md` §1).
