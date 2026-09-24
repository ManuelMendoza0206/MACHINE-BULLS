# ADRs — Sprint 1 (26 ago – 8 sep 2026)

**Carpeta vacía — pendiente de Huascar**, como parte de su función de Asiento C (QA) de este
sprint (`team-rotation-plan.md` §7). Sigue el mismo formato que `docs/adr/adr-sprint-0/`:
título, Estado/Fecha, Contexto, Decision, Alternativas, Consecuencias.

## Cómo escribir una ADR aquí (plantilla)

```markdown
# ADR 008 — <título corto de la decisión>

Estado: aceptado
Fecha: <fecha real de la decisión, no la de hoy>

## Contexto

<Qué problema forzó la decisión. Cita el PR/commit real.>

## Decision

<Qué se decidió, en términos concretos y verificables en el código.>

## Alternativas

<Qué otras opciones se consideraron o existían, y por qué se descartaron. Si no hay evidencia
de que se consideró una alternativa real, dilo así — no inventes una.>

## Consecuencias

<Qué implica esta decisión para el resto del proyecto, positivo y negativo.>
```

Numera a partir de **ADR-008** (el 001-007 ya están ocupados en `adr-sprint-0/`) — la
numeración es global al proyecto, no reinicia por carpeta.

## Decisiones de Sprint 1 que probablemente necesitan una ADR

Investigadas parcialmente durante esta sesión — confírmalas contra el diff real de cada PR
antes de escribir, no asumas que esto es completo:

1. **Reajuste de la paleta de colores a WCAG AA** — los tokens de `mutedForeground`, `success`
   y `destructive` en tema claro se movieron un paso más oscuros porque los valores originales
   de `frontend-plan.md` §5.1 no llegaban a 4.5:1 de contraste. Ya está mencionado de forma
   informal en `CLAUDE.md` §10 D1, pero no como ADR — sería la ADR-008 natural. Verifica el PR
   que hizo el cambio (probablemente parte de #9) y documenta los valores antes/después.
2. **CSP baseline en `next.config.js`** — política con `'unsafe-inline'` en `script-src` en vez
   de nonce + `strict-dynamic`, también mencionada informalmente en `CLAUDE.md` §10 D2 (nota:
   verifica si esto se decidió en Sprint 1 o Sprint 2 — la fecha del PR que tocó
   `next.config.js` lo confirma).
3. **Cualquier otra decisión de Sprint 1 que encuentres al revisar los PRs** que no esté ya
   cubierta por `adr-sprint-0/` — este README es un punto de partida, no la lista completa.

## Qué hacer con esto como parte de tu QA de Sprint 1

1. Revisa los PRs de Sprint 1 (`#9` como mínimo — busca también commits sueltos en ese rango
   de fechas, 26 ago – 8 sep).
2. Escribe aquí una ADR por cada decisión de arquitectura real que encuentres sin documentar.
3. Deja constancia en `docs/sprint-plans/sprint-1/sprint-1-review.md` (tu revisión general de
   este sprint) de qué ADRs escribiste y por qué.
