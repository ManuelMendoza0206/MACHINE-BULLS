# Sprint 1 — Review (Asiento C / QA)

**Autor de esta review:** Huascar Camilo Durán Avendaño — Asiento C de Sprint 1
(`team-rotation-plan.md` §7). Llenada el 24-sep-2026, corriendo cada comando real (no de
memoria) sobre `main` (`257e538`) — ver evidencia por sección abajo. Punto de partida original
verificado por Leonardo, conservado tal cual en la tabla de abajo.

**Verificación global corrida hoy (`frontend/`):**

```
npm run typecheck   → 0 errores
npm run lint         → 0 warnings
npx vitest run --coverage → 29 archivos, 188 tests, todos en verde
                            95.85% stmts / 89.03% branch / 96.2% líneas (global)
npx playwright test tests/e2e/navigation.spec.ts tests/e2e/theme.spec.ts → 4/4 en verde
npm run build         → compila y prerenderiza las 8 rutas sin error
```

## Cómo llenar este documento

1. Corre los comandos reales (`npm run typecheck/lint/test/test:e2e/build`) sobre el código que
   cerró Sprint 1 — no repitas lo que ya está verificado abajo sin volver a correrlo si tienes
   dudas.
2. Por cada epic de la tabla, confirma con evidencia (test corrido, PR leído) si el criterio de
   aceptación de su spec se cumple — no solo si el código "existe".
3. Escribe las ADRs que falten en `docs/adr/adr-sprint-1/` (instrucciones y lista de candidatas
   en `docs/adr/adr-sprint-1/README.md`).
4. Cierra moviendo en ClickUp los epics/tareas que correspondan — lista exacta en el handoff
   que Leonardo comunicó directamente (fuera del repo).

## Punto de partida verificado (24-sep-2026)

| Epic | Dueño | PR | Estado ClickUp al 24-sep | Nota |
|---|---|---|---|---|
| `frontend/design-system` | Leonardo (A) | #9, mergeado 16-sep | `update required` (25-sep) — **lista para tu revisión** | Sin validación de QA real todavía — confirma tú mismo antes de mover a `complete` |
| `frontend/app-shell-and-navigation` | Leonardo (A) | #9, mismo PR | `update required` (25-sep) — **lista para tu revisión** | Verificar: 88 tests, 97.9% cobertura reportados en su momento — reprodúcelo, no lo asumas |
| `frontend/landing-and-auth-flow` | Jaicel (B) | #14/#16, mergeados | `to do` | Sin ningún comentario de handoff ni validación — revisa desde cero |

Ningún PR de Sprint 1 tiene review formal de GitHub registrado (detalle completo de reviews por
PR en el handoff comunicado directamente).

## Secciones a completar

### 1. `design-system` — ¿validación real o solo estado en ClickUp?

**Sí se validó de verdad, no solo en ClickUp.** Corrí `tests/unit/config/design-tokens.contrast.test.ts`
+ `tests/unit/lib/utils/getContrastRatio.test.ts` directamente: 45 tests, todos en verde.
Confirmé con mis propios ojos en la salida que cubre los 6 pares de texto reales
(`foreground/background`, `mutedForeground/muted`, `accentForeground/accent`,
`successForeground/success`, `warningForeground/warning`, `destructiveForeground/destructive`)
en **ambos** temas (claro y oscuro) — no solo uno — y que el segundo bloque del test
(`globals.css stays in sync with the token source`) compara cada `--token` de `globals.css`
contra `hexToHslChannels(colorTokens[...])` línea por línea, en ambos temas. Esto es
exactamente lo que pide `design-system/spec.md` § "Design tokens with WCAG AA contrast" —
Requirement cumplido con evidencia reproducible, no heredada.

Los otros 3 Requirements de la spec que alcancé a verificar con test real:
- **`cn()`** — `tests/unit/lib/utils/cn.test.ts` pasa (incluido en los 188).
- **5 componentes UI** — sus tests de integración (`button`, `card`, `badge`, `skeleton`,
  `progress`) están en el suite de 188 y pasan; no encontré un test específico de
  `getContrastRatio('#FAFAF9','#18181B') === 21` para el caso conocido blanco/negro citado en
  el AC — el archivo prueba pares reales del proyecto, no ese caso de control exacto. Menor,
  no bloqueante.
- **Theme switching sin FOUC** — cubierto por e2e (`theme.spec.ts`, 2/2 en verde hoy), no solo
  por unit test.

**Conclusión:** `complete` en ClickUp está justificado por evidencia real, confirmada hoy.

### 2. `app-shell-and-navigation`

Corrí los 5 Requirements de `openspec/specs/frontend/app-shell-and-navigation/spec.md` contra
el código real, uno por uno:

| # | Requirement | Verificado con | Resultado |
|---|---|---|---|
| 1 | Providers globales instanciados una sola vez | `AppProviders.test.tsx` — "creates the QueryClient once and keeps the same reference across re-renders" | ✅ pasa |
| 2 | Navegación adaptativa sin JS de viewport | `TopNav.test.tsx` + `BottomTabBar.test.tsx` — "hidden at lg via CSS only" | ✅ pasa |
| 3 | Resaltado de ruta activa | `TopNav.test.tsx` — "marks the item... with aria-current and a non-colour signal" | ✅ pasa |
| 4 | Manejo de errores no controlados por tipo (**4 ramas**) | `GlobalError.test.tsx`, 7 tests | ✅ pasa — ver nota abajo |
| 5 | Skip link y landmark de contenido | e2e `navigation.spec.ts` — "keyboard-only: skip link, then navigate to Outfits" | ✅ pasa |

**Nota específica sobre la Requirement 4** (la más fácil de implementar mal): la spec exige
exactamente 4 ramas de copy — `ApiError`, `NetworkError`, `ValidationError`, y "cualquier otro
`Error`" — y dice explícitamente que `VtonJobTimeoutError` **no** debe tener copy especial, debe
caer en la rama genérica. Leí el test línea por línea: `[new VtonJobTimeoutError('slow',
'job-1'), 'Algo salió mal.']` — exactamente el copy genérico, con el comentario `// falls
through to generic` en el propio código. Implementado exactamente como pide la spec, no 5 ramas
como en algún momento se temió (ver `CLAUDE.md` §10, corrección histórica "GlobalError cubre
los 5 casos" → 4 ramas).

**El número "88 tests, 97.9% cobertura" del punto de partida de Leonardo no lo pude
reproducir tal cual** — corriendo solo `tests/integration/shell/` + `tests/unit/lib/navigation/`
obtengo 22 + 5 = 27 tests con 81% de cobertura de líneas (la cobertura baja porque mezcla con
`AuthProvider.tsx`, que no es parte de este epic). Puede que el "88" contara algo distinto (todo
Sprint 1 junto, incluyendo design-system) — no encontré dónde se generó ese número original para
confirmarlo. No es un hallazgo grave (todo lo que sí puedo correr pasa en verde), pero dejo
registrado que ese número específico queda sin verificar tal cual se citó.

**Conclusión:** `complete` en ClickUp está justificado — los 5 Requirements tienen test real y
pasan. La única mancha es no poder reproducir la cifra exacta "88/97.9%" citada anteriormente.

### 3. `landing-and-auth-flow`

Era el epic de mayor riesgo sin validación previa — empecé aquí. Solo 2 Requirements formales en
la spec:

**Requirement "Mensajes de error de login no revelan cuál credencial falló" — ✅ cumplido,
bien probado.** `auth.test.tsx` tiene el test "login: shows generic error without distinguishing
field", y `auth-api.test.ts` confirma que `mapSupabaseError` colapsa "usuario no existe" e
"contraseña incorrecta" al mismo mensaje 401 genérico. Además encontré (sin que la spec lo pida
explícitamente, pero es una buena práctica de seguridad): `AuthForm` deshabilita el submit
durante el pending state — protección de doble-submit, mismo patrón que la spec de VTON exige
para `POST /vton/try-on`.

**Requirement "Rutas protegidas exigen sesión válida" — ❌ SIN test automatizado, hallazgo
real.** Corrí `grep -rl "proxy\|redirectTo\|NextRequest" tests/` sobre todo el árbol de tests:
cero resultados. `src/proxy.ts` (el middleware, renombrado por Next 16) existe y por inspección
de código hace lo correcto — redirige a `/login?redirectTo=<ruta>` si no hay `user` — pero
**ningún test verifica esto**, ni unitario ni e2e. Es justo el Requirement de mayor riesgo del
epic de mayor riesgo del sprint, y es el que no tiene red de seguridad automatizada. No lo
puedo mover a "validado con evidencia" — queda como hallazgo abierto, no como bloqueante para
`complete` en ClickUp (el código funciona, verificado manualmente leyendo `proxy.ts`), pero sí
como tarea de seguimiento concreta: un test de `proxy.ts` con un `NextRequest` mock a
`/wardrobe` sin cookie de sesión, verificando el `Location` de la redirección.

**Hallazgo adicional de seguridad, ya reportado en la review de PR #14:** `schemas/auth.ts`
exige solo `min(8)` en la contraseña, sin mayúscula/número/especial — más débil que el
checklist de seguridad de este mismo sprint (`sprint-1-init-huascar.md`: "mínimo 12 chars, 1
mayúscula, 1 número, 1 special"). Repetido aquí porque es exactamente el tipo de hallazgo que
esta review debe capturar.

**Conclusión:** el epic funciona y la mitad de su superficie de riesgo (mensajes de error) está
bien probada, pero **no recomiendo mover `landing-and-auth-flow` a `complete` todavía** — su
Requirement de más riesgo (rutas protegidas) no tiene test, y hay una brecha de política de
contraseña sin resolver. Sugiero `update required` con estas dos tareas de seguimiento
explícitas, no `complete`.

### 4. ADRs escritas este cierre

**Ninguna todavía — pendiente.** `docs/adr/adr-sprint-1/README.md` ya lista 2 candidatas
(reajuste de paleta WCAG AA, CSP baseline) y ambas se confirman reales en esta review (la
primera está directamente verificada arriba en la sección 1; la segunda no la audité en este
pase). Las dejo como siguiente paso explícito, no las inventé para cerrar esta sección — mejor
un "pendiente" honesto que una ADR apurada.

### 5. Handoff para Sprint 2 (quien valide tu trabajo de este sprint)

- **`design-system`** → recomendado `complete`, con evidencia real reproducida hoy (sección 1).
- **`app-shell-and-navigation`** → recomendado `complete`, con evidencia real reproducida hoy
  (sección 2). Nota abierta: la cifra "88 tests/97.9%" original no se pudo reproducir tal cual;
  no bloqueante.
- **`landing-and-auth-flow`** → recomendado **`update required`, no `complete`**. Dos tareas de
  seguimiento concretas quedan sin resolver: (1) sin test para el redirect de rutas protegidas
  (`src/proxy.ts`), (2) política de contraseña más débil que el checklist de seguridad del
  sprint (`min(8)` vs "12+mayúscula+número+especial"). El código funciona en ambos casos —
  verificado por lectura, no por ausencia de bug conocido — pero falta cerrar la brecha de
  verificación/política antes de darlo por cerrado.
- **ADRs de Sprint 1**: pendientes, 2 candidatas ya identificadas en
  `docs/adr/adr-sprint-1/README.md`.
- **PRs de Sprint 1**: sin review formal de GitHub — fuera del alcance de este documento (va en
  el handoff de Sprint 1-2 comunicado directamente por Leonardo).
