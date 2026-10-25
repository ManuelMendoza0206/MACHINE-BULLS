# scripts/clickup — Reconciliación del tablero

Automatiza el checklist de reconciliación de `docs/sprint-plans/sprint-1/sprint-1-manifest.md`
§7 sin tocar el tablero a mano.

## Credencial (nunca versionada — `.gitignore`)

El script busca el token de API en este orden:

1. Variable de entorno `CLICKUP_API_TOKEN`
2. Archivo local `scripts/clickup/.token` (gitignoreado)
3. `.env` del repo (gitignoreado), con `CLICKUP_API_TOKEN=pk_...`

## Uso

```bash
node scripts/clickup/sync-sprint-1.mjs              # audita (dry-run, no escribe)
node scripts/clickup/sync-sprint-1.mjs --apply      # retitle/etiqueta/borra duplicado
node scripts/clickup/sync-sprint-1.mjs --export-csv # exporta docs/clickup/SPRINT-1-MASTER.csv
```

## Qué automatiza y qué no

| Checklist (manifest §7) | Automatizado |
| --- | --- |
| Retitular `86e301ddn/dpf/dpw/dda/de2`, `86e302a2b` | Sí (compara título normalizado) |
| Borrar duplicado "Tarea 6 / API skeleton" | Sí (solo IDs distintos a `86e301de7`/`86e301dea`) |
| Etiquetar `86e3122fr/fv/fy/g5` con `repo:backend` | Sí (crea el tag de espacio si falta) |
| Correcciones de **descripción** (`86e301dea/de7/e09/e0m/e0t/302a5f/5u/a7u/32a2n`) | No — reminder en pantalla; se corrigen a mano (ver manifest §4–§6) |
| 0 tareas sin Assignee / Due / AC (constitution §5) | Auditoría Automatizar |
| Export de `SPRINT-1-MASTER.csv` | Con `--export-csv` |

Los cambios en el tablero quedan en el historial de ClickUp, reversibles desde la UI.
