# ADR 008 — Reajuste de paleta de colores a WCAG AA

Estado: aceptado
Fecha: 2026-08-31

## Contexto

`docs/context/frontend-plan.md` §5.1 fijaba `mutedForeground #71717A`, `success #16A34A` y
`destructive #DC2626` para el tema claro. Al calcular el contraste real contra sus fondos
(`getContrastRatio`), varios de esos pares no llegaban al mínimo de 4.5:1 que la propia spec de
`design-system` exige (Requirement "Design tokens with WCAG AA contrast"): `mutedForeground`
sobre `muted` ≈ 4.3:1, texto claro sobre `success` ≈ 3.4:1, sobre `warning` ≈ 3.9:1. Commit
`f4f5a3a` ("chore(sprint-0): mitigate remaining non-blocking findings + Sprint 1 GO/NO-GO",
31-ago-2026) es el que corrige esto en `src/config/design-tokens.ts`.

## Decision

En el tema claro: `mutedForeground` de `#71717A` a `#52525B` (zinc-600), `success` de
`#16A34A` a `#15803D` (green-700), `destructive` de `#DC2626` a `#B91C1C` (red-700). Se añade
un token `warning` (`#B45309`, amber-700) que `frontend-plan.md` §5.1 no tenía, más los cuatro
`*Foreground` correspondientes. El tema oscuro no cambia — sus valores ya cumplían 4.5:1.
Verificado hoy (24-sep, QA de Sprint 1) corriendo `tests/unit/config/design-tokens.contrast.test.ts`
de forma directa: 45 tests en verde, cubriendo los 6 pares de texto reales en ambos temas y la
sincronización línea por línea entre `globals.css` y `design-tokens.ts`.

## Alternativas

No hay evidencia en el historial de que se haya considerado una alternativa real (p. ej.
mantener los valores de `frontend-plan.md` y compensar con otro mecanismo, o subcontratar la
paleta a una herramienta externa) — el commit va directo del hallazgo del test de contraste a
la corrección de los valores. Se documenta así en vez de inventar una alternativa que no existió.

## Consecuencias

`design-tokens.ts` queda como única fuente de verdad de color (ninguna otra parte del código
hardcodea un hex), con `tests/unit/config/design-tokens.contrast.test.ts` blindando en CI que
ningún cambio futuro vuelva a caer bajo 4.5:1 ni desincronice `globals.css`. El costo es que la
paleta del tema claro ya no coincide exactamente con lo que `frontend-plan.md` §5.1 describe
visualmente — ese documento queda desactualizado en sus valores hex concretos (la esencia de la
paleta, zinc/green/red/amber, se mantiene).
