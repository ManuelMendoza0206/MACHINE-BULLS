# ADRs — Sprint 3 (23 sep – 6 oct 2026)

**Carpeta activa** — a diferencia de `adr-sprint-1/` y `adr-sprint-2/` (pendientes de Huascar),
esta la llena Leonardo (Asiento C, QA de Sprint 3) a medida que revisa los PRs del sprint.
Documento vivo — se actualiza en cada revisión de PR, no de una sola vez al cierre.

**Numeración provisional:** las ADRs de esta carpeta usan `ADR-3xx` para no chocar con la
numeración de `adr-sprint-1/adr-sprint-2` (que empieza en 008 y aún no se sabe dónde termina,
porque Huascar todavía no las escribe). Renumerar a la secuencia global cuando esas 2 carpetas
tengan contenido real.

| ADR | Decisión | PR |
|---|---|---|
| [301](./ADR-301-photo-consent-placeholder.md) | Consent gate de fotos — placeholder temporal, no el diseño Q5 | #32 (Huascar) |
| [302](./ADR-302-mlflow-tracking.md) | MLflow + ngrok para tracking de experimentos | #31 (Jaicel) |

## Nota sobre el PR #32

Al revisar el PR #32 a fondo, encontré que **Huascar ya documentó explícitamente en el cuerpo
del PR** que `PhotoConsentGate` es un placeholder temporal, no el diseño real de Jaicel (Q5) —
"no ADR-008, no risk-register entry, no backend consent record exist yet at time of writing".
Esto corrige mi preocupación anterior (registrada en la conversación de esta sesión) de que el
componente se construyó sin coordinación — sí hubo coordinación, solo que documentada en el PR
en vez de en una ADR formal. ADR-301 completa ese registro que faltaba.
