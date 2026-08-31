<!-- Estructura mínima de PR — .speckit/constitution.md §3, team_charter "Revisión de PR". -->

## Objetivo
<!-- Qué cambia y por qué. 1–3 frases. -->

## Spec / Tarea
- Spec: `openspec/specs/frontend/<...>.md` — Requirement: <...>
- ClickUp: <enlace a la tarea>

## Archivos modificados
<!-- Lista breve o "ver diff". Destacar cambios de contrato/arquitectura. -->

## Verificaciones ejecutadas
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] `npm run test` — exit 0
- [ ] `npm run test:e2e` — exit 0
- [ ] `npm run build` — exit 0
- [ ] CI verde en este PR
<!-- Pegar salida relevante si algo no es obvio. -->

## Declaración de uso de IA (obligatoria)
<!-- Qué % / secciones fueron asistidas por IA (Claude, Copilot, ...) y qué pruebas validaron ese trabajo.
     La responsabilidad técnica es del equipo, no de la IA. -->
- Asistencia IA: <ninguna | ~X%, secciones ...>
- Validación:

## Checklist
- [ ] Rama `feat/…` o `chore/…` desde `main` (cero commits directos a `main`)
- [ ] Sin credenciales / API keys / datos personales en el diff
- [ ] Criterios de aceptación de la tarea cubiertos
- [ ] Cero `any`; cero color hardcodeado fuera de `design-tokens.ts` / `globals.css`
- [ ] Revisor asignado ≠ autor
