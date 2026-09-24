# ADR 301 — Consent gate de fotos: placeholder temporal, no el diseño Q5

Estado: aceptado (temporal — reemplazar cuando Q5 cierre)
Fecha: 2026-09-24 (PR #32, mergeado ~23/24-sep)

## Contexto

`wardrobe-flow/spec.md` (Requirement "Subida por lote") no puede implementarse sin algún tipo
de consentimiento explícito antes de la primera subida — el propio Sprint 3 asigna el diseño
formal de esa política (qué se pide, cuánto se retiene, qué pasa si el usuario no consiente) al
Asiento D de este sprint (Jaicel, epic Q5 — "crítico", `team-rotation-plan.md` §4.4). Huascar
(Asiento A, `wardrobe-flow`) llegó al punto de necesitar el gate de consentimiento en su Tarea 1
antes de que Q5 tuviera un diseño real que consumir.

## Decision

Huascar implementó `PhotoConsentGate.tsx` + `stores/photoConsentStore.ts` como un **placeholder
explícito**, no como el diseño final: consentimiento mínimo (aceptar/no aceptar antes de la
primera subida de la sesión), sin política de retención, sin registro en backend, sin ADR
formal ni entrada en `docs/risks/RISK-REGISTER.md` en el momento de escribirlo. El propio
cuerpo del PR #32 lo declara así, palabra por palabra: *"This is a PLACEHOLDER policy, not
Jaicel's real Q5 design [...] swap it out the moment Q5 lands."*

## Alternativas

Bloquear la Tarea 1 de Huascar hasta que Jaicel entregara el diseño completo de Q5 — descartada
porque habría dejado el Asiento A completo del sprint parado esperando a otro asiento, cuando
`sprint-3-init-huascar.md` (Tarea 0) ya preveía exactamente este escenario ("acuerden un mínimo
viable para no bloquear tu Tarea 1"). Construir el gate sin declarar que es temporal — no
considerada por Huascar, que optó por la transparencia explícita en el PR en vez de dejarlo
pasar como si fuera el diseño definitivo.

## Consecuencias

El flujo de subida de Sprint 3 es funcional y honesto sobre su propio estado — no bloquea al
resto del equipo, pero tampoco finge tener una política de retención que no existe. **Deuda
técnica explícita:** cuando Jaicel entregue Q5, alguien debe (1) reemplazar
`photoConsentStore.ts` por la política real, (2) crear la ADR formal de la política de
consentimiento/retención en `docs/adr/adr-sprint-3/` o donde corresponda según cuándo cierre
Q5, y (3) añadir la entrada correspondiente en `RISK-REGISTER.md` que hoy no existe. Mientras
eso no pase, el consentimiento mostrado a usuarios reales de esta app **no tiene respaldo legal
de retención de datos** — riesgo real, no solo de documentación, si el proyecto llegara a
producción con usuarios reales antes de que Q5 cierre.
