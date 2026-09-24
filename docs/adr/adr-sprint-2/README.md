# ADRs — Sprint 2 (9 – 22 sep 2026)

**Carpeta vacía — pendiente de Huascar**, quien toma la función de Asiento C (QA) de Sprint 2
en sustitución de Manuel (handoff comunicado directamente a Huascar, fuera del repo — para el
contexto completo del intercambio). Mismo formato y numeración que `adr-sprint-1/README.md`
— continúa desde donde queden los números de Sprint 1.

## Decisiones de Sprint 2 que necesitan una ADR — esta lista sí está bien fundamentada

A diferencia de Sprint 1, Sprint 2 tuvo varias decisiones de arquitectura grandes que
**revierten decisiones cerradas anteriores sin que exista ningún registro de por qué**. Son
las más urgentes de documentar porque, sin la ADR, la próxima persona que lea `CLAUDE.md` o
`adr-sprint-0/` va a asumir que la decisión original sigue vigente.

1. **Restructura a monorepo** (`frontend/` + `backend/`) — PR #14 (`orden`, 16-sep). Antes de
   esto, el repo era frontend-only por decisión explícita (`CLAUDE.md` §1: "SOLO frontend...
   el backend vive en un repositorio/servicio separado"). Esa frase del `CLAUDE.md` **sigue
   sin actualizarse** — contradice la estructura real del repo. Escribe la ADR con el contexto
   real (¿por qué monorepo y no repos separados?) y, si la decisión se sostiene, actualiza
   también `CLAUDE.md` §1 para que deje de contradecir la realidad.

2. **Upgrade de stack: Next 14.2→16.3, React 18.3→19.3, Tailwind v3→v4** — PR #15 (17-sep).
   Revierte textualmente la "Decisión Cerrada" P0#5 (`CLAUDE.md` §2), que fijó 14.2/18.3
   específicamente por estabilidad frente a versiones nuevas. Ver la nota de corrección que
   dejé en `adr-sprint-0/ADR-001-stack-frontend.md` — esta ADR de Sprint 2 es la que completa
   esa historia: qué cambió para que la razón original (estabilidad) dejara de aplicar.

3. **Reintroducción de ML/notebooks al repositorio frontend** — PRs #18, #22, #23 (y #31 en
   Sprint 3, si quieres extender el contexto). Revierte P0#3 (`CLAUDE.md` §10: "ML/Data → repo
   backend, CERO en este repo"). Esta es la reversión de gobernanza más grande del proyecto
   hasta ahora y la que menos registro tiene — ningún PR de los 3 menciona la decisión anterior
   ni por qué ya no aplica.

4. **Soporte multicapa (`garment_layers`) en VTON** — PR #16 (17-sep). Decisión de diseño de
   API (orden por posición en vez de un `outfit_id` único) que adelanta trabajo de Sprint 6
   (`vton-flow`, epic de Jaicel) — documenta por qué se adelantó y qué implica para el diseño
   original de `vton-flow/spec.md`.

5. **Degradación de auth a modo público sin config de Supabase** — commit `0f8de2f` (16-sep).
   Extiende la ADR-003 de Sprint 0 (Supabase Auth) con un comportamiento de fallback que esa
   ADR no contemplaba — documenta el caso que lo forzó.

## Qué hacer con esto como parte de tu QA de Sprint 2

1. Revisa los PRs #14, #15, #16, #17, #18, #19, #20, #21, #22, #23 (todo lo que se mergeó
   dentro de la ventana 9-22 sep) — la lista de arriba es un punto de partida verificado, no
   necesariamente completa.
2. Escribe una ADR por cada decisión real que encuentres, siguiendo la plantilla de
   `adr-sprint-1/README.md`.
3. Donde una ADR revierta una decisión anterior (como la 1, 2 y 3 de arriba), actualiza también
   el documento que quedó desactualizado (`CLAUDE.md` §1/§2/§10) para que no siga contradiciendo
   la realidad — no basta con la ADR nueva si el documento viejo sigue diciendo lo contrario.
4. Deja constancia en `docs/sprint-plans/sprint-2/sprint-2-review.md` de qué ADRs escribiste.
