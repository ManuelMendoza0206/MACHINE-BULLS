# Sprint 2 — Inicialización | Asiento C (Manuel Jiménez Mendoza)

**Rol:** QA & Validación — con rezago de un sprint (valida Sprint 1, no Sprint 2)
**Ventana:** 9 – 22 sep 2026 (hoy: 17-sep, **quedan 5 días — esta tarea va con retraso**)
**Qué validas:** `frontend/design-system`, `frontend/app-shell-and-navigation`
(Leonardo, Asiento A Sprint 1), `frontend/landing-and-auth-flow` (Jaicel, Asiento B Sprint 1)

> **Por qué esto es urgente:** al 17-sep, con el sprint por cerrar en 5 días, `design-system`
> ya aparece `complete` en ClickUp (sin que quede claro si fuiste tú quien lo validó — ver
> Tarea 1), pero `app-shell-and-navigation` y `landing-and-auth-flow` **siguen en `to do`** pese
> a estar mergeados y verificados. Ninguno de los 3 tiene comentario de handoff, ni hay review
> formal de GitHub en los PRs que los cierran (#9, #14, #16). El ciclo de rotación depende de
> este rezago deliberado (`team-rotation-plan.md` §1: "valida trabajo ya terminado y estable");
> si Sprint 3 arranca sin esto, Leonardo (Asiento C de Sprint 3) no tiene contra qué validar el
> epic de Jaicel de este sprint, y el hueco se propaga.

---

## 🎯 Objetivo de Sprint

Confirmar — con evidencia, no de memoria — que lo que Leonardo y Jaicel entregaron en Sprint 1
cumple sus specs y sus criterios de aceptación, y dejar el registro que el resto del equipo
necesita para seguir construyendo encima sin reabrir supuestos.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Reconstruir qué se mergeó y cuándo — 0.5 días

1. `git log main --oneline` — identifica los PRs #9 (Leonardo, tokens/theme/providers/
   componentes/app-shell), #14 (Jaicel, monorepo + auth + api client), #16 (Jaicel, flujo
   multicapa — este es de Sprint 6, ignóralo para esta validación).
2. Confirma el estado de CI de cada uno vía GitHub (no solo confiar en que "mergeó" = "pasó").

**Aceptación:**
- [ ] Lista escrita de qué PR cierra qué epic, con el resultado real de CI de cada uno

---

### Tarea 1: Validar `frontend/design-system` (Leonardo) — 1 día

> **⚠️ Actualización 17-sep (noche):** este epic ya aparece `complete` en ClickUp. Si ya lo
> validaste tú, no repitas el trabajo — pero **deja el comentario de handoff que falta**
> (regla §4.1: el cambio de estado no sustituye el registro de qué se verificó). Si el cambio
> de estado lo hizo otra persona sin que tú validaras, dilo explícitamente — no asumas que
> "está en `complete`" significa "ya está validado por QA".

**Spec:** `openspec/specs/frontend/design-system/spec.md` — 6 Requirements (tokens WCAG-AA,
theme switching sin FOUC, `cn()`, `getContrastRatio()`, 5 componentes UI, app layout).

1. `cd frontend && npm run test -- --coverage` — confirma que los archivos de test citados en
   la spec existen y pasan (`design-tokens.contrast.test.ts`, `cn.test.ts`,
   `getContrastRatio.test.ts`, los 5 `tests/integration/ui/*.test.tsx`).
2. Verifica el hallazgo pendiente de Sprint 1: los pares `success`/`destructive` sobre fondo
   claro — ¿la spec quedó con los valores corregidos (`CLAUDE.md` §10 D1) y el test de
   contraste realmente los cubre y pasa, o sigue siendo un AC sin verificar?
3. Corre `npm run test:e2e` — confirma que `theme.spec.ts` (no-FOUC) pasa de verdad, no solo
   que existe el archivo.

**AC:**
- [ ] Los 6 Requirements de la spec, uno por uno, marcados como cubiertos-con-test o
      pendiente-con-motivo (no "asumido cubierto")
- [ ] Comentario de validación en `[EPIC] frontend/design-system` con este detalle
- [ ] Si algo falla: `update required` de vuelta a Leonardo con el motivo exacto, no un
      "no pasa" genérico

---

### Tarea 2: Validar `frontend/app-shell-and-navigation` (Leonardo) — 1 día

**Spec:** `openspec/specs/frontend/app-shell-and-navigation/spec.md`.

1. Verifica los 4 stubs de ruta (`/wardrobe`, `/outfits`, `/try-on`, `/profile`) — ¿están
   declarados en la spec como Requirement explícito (correción documentada el 17-sep,
   "docs(spec): app-shell declara los 4 stubs de nav-route") o siguen siendo código sin spec?
2. `npm run test:e2e` — corre `navigation.spec.ts` tú mismo; en la auditoría del 17-sep se
   observaron 3 tests marcados "flaky" (pasan en reintento) por cold-start del dev server en
   sandbox — confirma si en tu entorno (o en CI) esto es consistente o es un problema real de
   la navegación.
3. `TopNav`/`BottomTabBar` — confirma que alternan solo por CSS (inspecciona el código, no
   solo el resultado visual) — cero `useMediaQuery`/`window.innerWidth`.

**AC:**
- [ ] Los Requirements de navegación adaptativa, error boundary (4 ramas) y skip link,
      verificados uno por uno
- [ ] Resultado de la investigación de los tests "flaky" documentado (¿problema real o del
      entorno de sandbox?)
- [ ] Comentario de validación en `[EPIC] frontend/app-shell-and-navigation`

---

### Tarea 3: Validar `frontend/landing-and-auth-flow` (Jaicel) — 1.5 días

**Spec:** `openspec/specs/frontend/landing-and-auth-flow/spec.md`; ADR-003 (autenticación).

Esta es la de mayor riesgo del sprint anterior (Huascar la apoyó como refuerzo en Sprint 1 sin
sprint previo que validar — regla §4.3 del plan de rotación).

1. `signUpWithEmail`/`signInWithEmail`/`signOut` — confirma que ninguno propaga el error crudo
   de Supabase al usuario (mensajes distinguibles pero sin filtrar si el problema es "usuario
   no existe" vs "contraseña incorrecta" — enumeration attack).
2. Middleware protege exactamente las 4 rutas del matcher, ninguna otra — pruébalo manualmente
   contra una ruta fuera de la lista.
3. `useAuth()` — consumido sin cambios por el resto del código (no forzó adaptaciones río abajo
   que delaten un contrato inconsistente).
4. Cobertura de `src/features/auth/` ≥ 85% — corre el reporte, no asumas el número.

**AC:**
- [ ] Los 4 puntos de arriba verificados con evidencia (comando corrido, output pegado en el
      comentario del epic)
- [ ] Checklist OWASP Top 10 aplicado a los endpoints de auth iniciado (aunque el cierre
      completo sea Sprint 7 por plan — al menos el chequeo de enumeration attack de este punto)
- [ ] Comentario de validación en `[EPIC] frontend/landing-and-auth-flow`

---

### Tarea 4: Cerrar la brecha de gobernanza de los PRs sin review — 0.5 días

Hallazgo de la auditoría del 17-sep: mergeaste los PRs #14, #15, #16, #17 sin dejar un review
formal de GitHub (approve/request changes) en ninguno — solo el merge. Esto no cumple
`constitution.md` §3 ("≥1 revisor aprobando antes de merge").

1. Deja un review retroactivo en esos 4 PRs con lo que efectivamente verificaste antes de
   mergear (aunque sea después del hecho, deja el registro).
2. A partir de ahora: review formal *antes* de mergear, en todos los PRs que toques.

**AC:**
- [ ] 4 reviews retroactivos dejados en GitHub con el detalle de qué se verificó
- [ ] Acuerdo explícito con el equipo (o nota en `CLAUDE.md` §9) de que el review precede al
      merge de aquí en adelante, sin excepción

---

## ⏱️ Cronograma (5 días restantes desde 17-sep)

| Día | Fecha | Tarea |
|---|---|---|
| 1 | mié 17 sep | Tarea 0 (reconstruir) + Tarea 4 (reviews retroactivos, es rápido) |
| 2 | jue 18 sep | Tarea 1 (design-system) |
| 3 | vie 19 sep | Tarea 2 (app-shell) |
| 4-5 | sáb 20 – lun 22 sep | Tarea 3 (auth — la de mayor riesgo, más tiempo) |

---

## ✅ Definition of Done

- [ ] Los 3 epics de Sprint 1 (`design-system`, `app-shell-and-navigation`,
      `landing-and-auth-flow`) con comentario de validación explícito en ClickUp
- [ ] Cada epic movido a `complete` (si pasa) o `update required` con motivo (si no)
- [ ] 4 reviews retroactivos en GitHub para los PRs #14/#15/#16/#17
- [ ] Handoff dejado para Leonardo (Asiento C de Sprint 3, valida tu propio trabajo de este
      sprint más el de Jaicel/Huascar)

---

## 🤝 Pair Sessions

- **Tarea 3 (auth):** si algo no cuadra, Jaicel (autor original) — 20 min antes de marcar
  `update required`.
- Responde en retrospectiva la pregunta fija del plan de rotación: "¿algo se perdió en el
  handoff de este ciclo?" — dado que este es el primer sprint con esta validación con rezago,
  documenta bien qué faltó para que Sprint 3 no repita el mismo vacío.
