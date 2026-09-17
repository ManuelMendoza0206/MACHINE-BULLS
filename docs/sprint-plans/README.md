# Sprint Plans — Índice

Un directorio por sprint. Cada carpeta contiene el manifiesto canónico del sprint
(`sprint-N-manifest.md`) y un prompt de inicialización por persona
(`sprint-N-init-<nombre>.md`), siguiendo la rotación de asientos de
`../clickup/team-rotation-plan.md`.

| Sprint | Ventana | Estado | Carpeta |
|---|---|---|---|
| 0 | 12 – 25 ago 2026 | Cerrado (scaffold) — ver `../sprint-0/` | — |
| 1 | 2 – 8 sep 2026 | Cerrado, mergeado el 16-sep (PR #9) | [`sprint-1/`](./sprint-1/) |
| 2 | 9 – 22 sep 2026 | **En curso** (hoy: 17-sep) | [`sprint-2/`](./sprint-2/) |
| 3 | 23 sep – 6 oct 2026 | Planificado, no iniciado | [`sprint-3/`](./sprint-3/) |
| 4-8 | oct – dic 2026 | Ver `../clickup/team-rotation-plan.md` §3 | — |

## Convención de nombres

- `sprint-N-manifest.md` — estructura canónica del sprint: asientos, epics, estado real
  verificado (no aspiracional), checklist de reconciliación con ClickUp.
- `sprint-N-init-<nombre>.md` — prompt de arranque para la persona que ocupa cada asiento ese
  sprint. El nombre de archivo es el de la persona, no el asiento — la tabla de rotación
  (`team-rotation-plan.md` §7) dice quién ocupa qué asiento cada sprint.
- Otros documentos de un sprint (revisiones, listas de tareas detalladas) viven en la misma
  carpeta del sprint al que pertenecen.

## Cómo se mantiene esto al día

Cada manifiesto de sprint es responsabilidad de quien ocupa el **Asiento D** (Infra/Release)
de ese sprint — incluye un checklist de reconciliación con ClickUp al final. Antes de dar un
sprint por cerrado, ese checklist debe estar en cero pendientes.

**Regla de oro (aprendida de la auditoría del 17-sep-2026):** un epic no se considera cerrado
solo porque el código está en `main` — tiene que estar en `complete` en ClickUp con el link del
PR como evidencia, y el epic debe llevar el comentario de handoff de fin de sprint
(`team-rotation-plan.md` §4.1) antes del Sprint Review.
