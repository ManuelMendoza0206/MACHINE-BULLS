# ADRs — Sprint 0 (12–25 ago 2026)

Decisiones de arquitectura tomadas antes de escribir código, durante el setup del proyecto.
Autor original: equipo completo (sesión de planificación, 26-ago). Reorganizadas en esta
carpeta el 24-sep-2026 — antes vivían sueltas en `docs/adr/` sin agrupar por sprint.

| ADR | Decisión | Estado |
|---|---|---|
| [001](./ADR-001-stack-frontend.md) | Stack frontend: Next.js | **Corregido 24-sep** — decía Next 16 desde el origen, la decisión real de Sprint 0 fue 14.2 |
| [002](./ADR-002-stack-backend.md) | Stack backend: FastAPI + Python | Vigente |
| [003](./ADR-003-autenticacion.md) | Autenticación: Supabase Auth | Vigente — ver `adr-sprint-2` para el fallback sin config, añadido después |
| [004](./ADR-004-vton-alcance.md) | Alcance de VTON: módulo experimental académico | Vigente |
| [005](./ADR-005-clasificacion-estetica.md) | Clasificación de estética: CLIP zero-shot | Vigente, sin implementar todavía (`garment-analysis-service`, Sprint 3) |
| [006](./ADR-006-base-vectorial.md) | Base vectorial: pgvector + HNSW | Vigente, sin implementar todavía (`domain-and-database`) |
| [007](./ADR-007-almacenamiento.md) | Almacenamiento: Supabase Storage | Vigente |

## Por qué esta carpeta existe

`docs/adr/` ahora tiene una subcarpeta por sprint (`adr-sprint-0`, `adr-sprint-1`, ...) — cada
sprint documenta aquí las decisiones de arquitectura que tomó, no solo las de planificación
inicial. El Asiento C (QA) de cada sprint es quien cierra la carpeta correspondiente, como
parte de su revisión — ver `docs/sprint-plans/sprint-N/sprint-N-review.md` para el contexto
completo de cada sprint.

**Regla:** una ADR de esta carpeta se corrige (no se reescribe en silencio) cuando la realidad
del código la contradice — como con la 001. El historial de la decisión importa tanto como la
decisión vigente.
