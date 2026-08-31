# Sprint 1 — Prompt de Inicialización | Asiento A (Leonardo)

**Rol:** Feature Lead — Frontend Design System & App Shell  
**Duración:** 26 ago - 8 sep 2026 (14 días)  
**Epics:** frontend/design-system (F1), frontend/app-shell-and-navigation (F2)  
**14 tareas** | SP estimado: ~40-50  
**Contexto:** Cimiento del proyecto frontend. Sin esto, el resto no tiene base estable de UI/UX.

---

## Objetivo de Sprint

Sentar las bases de **interacción y accesibilidad** en el frontend, entregando:
- Sistema de diseño completamente funcional con componentes tipados y reutilizables
- Shell de navegación accesible que soporte mobile-first (TopNav/BottomTabBar)
- Cambio de tema sin parpadeo
- Pruebas unitarias y de regresión visual verificadas en CI

**Success Criteria (DoD):**
- ✅ Todos los 14 tests de esta tarea pasan (green en `npm run test`)
- ✅ `npm run typecheck` sin errores (TypeScript strict)
- ✅ `npm run lint` sin warnings
- ✅ Cobertura ≥80% en componentes de shell
- ✅ Contrastes AA validados automáticamente en CI
- ✅ Accesibilidad WCAG 2.1 AA verificada (6 requisitos cubiertos por test)
- ✅ Zero parpadeo en cambio de tema (validad visualmente en E2E)

---

## Tareas por Orden de Ejecución

### Fase 1: Fundamentos (días 1-2)

**1. Tokens de diseño → TailwindCSS (BLOCKER)**
- ID: `86e301dd8`
- **Tarea:** Crear `src/config/design-tokens.ts` con los colores, tipografías y espacios de §2.1 de spec `frontend/design-system/spec.md`. Derivar `tailwind.config.ts` desde ahí (cero hardcoding).
- **Aceptación:**
  - El archivo `tailwind.config.ts` importa `design-tokens.ts` y no contiene literales de color
  - Test: `import { tokens } from '../../config/design-tokens'; expect(tw.config.theme.colors).toEqual(tokens.colors)`
- **Ref spec:** frontend/design-system/spec.md §2.1, 2.2
- **Dependencia de:** Nada (inicio)
- **Bloqueador para:** Tareas 2, 3, 4

**2. Validación de Contraste (días 1-2)**
- ID: `86e301dda`
- **Tarea:** Escribir test de contraste automático que valida todos los pares texto/fondo (claro/oscuro) contra WCAG AA. Usar `axe-core` o `pa11y` en CI.
- **Aceptación:**
  - Test cubre mínimo 12 pares (6 en claro, 6 en oscuro)
  - Ratio calculado dinámicamente desde tokens de §2.1
  - CI falla si ratio < 4.5:1 (WCAG AA)
- **Ref spec:** frontend/design-system/spec.md §2.1
- **Dependencia de:** Tarea 1
- **Duración estimada:** 1 día

**3. Función `cn()` para Clases (días 1-2)**
- ID: `86e301ddf`
- **Tarea:** Implementar `src/lib/cn.ts` — función merge de clases Tailwind sin conflictos. Usar `clsx` + `tailwind-merge` bajo el capó.
- **Aceptación:**
  - `cn('px-4', 'px-6')` → `'px-6'` (última gana, no ambigüedad)
  - `cn(['text-sm', { 'text-lg': true }], undefined)` → `'text-lg'` (arrays, objetos, undefined OK)
  - Mínimo 4 test cases, todos verdes
  - Test suite ejecuta en < 50ms
- **Ref spec:** frontend/design-system/spec.md §2.4
- **Dependencia de:** Tarea 1
- **Duración estimada:** 1 día

### Fase 2: Componentes Base (días 3-5)

**4. Componentes de UI (días 3-4)**
- ID: `86e301ddn`
- **Tarea:** Crear 8 componentes en `src/components/ui/` según §2.4 de spec: Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner. Tipado sin `any`. Exportar stories a Storybook.
- **Aceptación:**
  - Cada componente es una función React pura (no tiene estado salvo props)
  - Props están tipadas con interfaces/types (no `any`)
  - Mínimo 1 story por componente en Storybook (ejecuta en local sin errores)
  - Cada story cubre: state normal, disabled, loading (si aplica), error (si aplica)
  - `npm run test -- src/components/ui` >= 80% coverage
- **Ref spec:** frontend/design-system/spec.md §2.4
- **Dependencia de:** Tareas 1, 3
- **Duración estimada:** 2 días

**5. Provider de Tema (Sin Parpadeo) (días 3-5)**
- ID: `86e301ddw`
- **Tarea:** Crear `src/app/providers.ts` que exporta `<AppProviders>` — wrapper que inyecta el script de tema ANTES de hydration. No CSS-in-JS en <head> (no parpadeo FOUC).
- **Aceptación:**
  - Script de tema se inyecta en `<script>` directo dentro de `<head>`, ANTES de cualquier stylesheet
  - Test: renderizar el árbol, cambiar tema, verificar que clase HTML cambia sin repaint visible (medible con Lighthouse / Performance Observer)
  - E2E test: navegar a app → cambiar tema → screenshot antes y después, verificar que no hay parpadeo (pixel-perfect)
  - `suppressHydrationWarning` aplicado en `<html>`
- **Ref spec:** frontend/design-system/spec.md §2.2, app-shell-and-navigation §2.3
- **Dependencia de:** Tareas 1, 3
- **Duración estimada:** 2 días

### Fase 3: App Shell & Navegación (días 6-9)

**6. AppProviders Instancia Única (días 6-7)**
- ID: `86e301dp5`
- **Tarea:** Refactorizar providers para que se instancien 1x por sesión (memoizar listeners, no recrear contextos). Verificar que context subscribers no se multiplican.
- **Aceptación:**
  - Test: renderizar `<AppProviders>` 3 veces en diferentes test suites, verificar que el Listener interno se instancia solo 1 vez global (use spy/mock)
  - Lighthouse DevTools: performance score >= 85
  - Memory profile: no memory leaks en cambios de tema repetidos (5 toggles sucesivos)
- **Ref spec:** app-shell-and-navigation/spec.md §2.3
- **Dependencia de:** Tarea 5
- **Duración estimada:** 1-2 días

**7. TopNav & BottomTabBar (CSS Only) (días 7-8)**
- ID: `86e301dp7`
- **Tarea:** Crear `<TopNav>` y `<BottomTabBar>` que se muestran/ocultan solo por media queries CSS (`@media`), sin JS de breakpoint detection. NavLink con `aria-current="page"`.
- **Aceptación:**
  - Zero JS conditional renders en breakpoint (no `useMediaQuery()`, no `window.innerWidth` check)
  - CSS media queries: `@media (max-width: 768px) { .TopNav { display: none; } }` etc.
  - E2E test: resize viewport → verificar que TopNav/BottomTabBar alternan correctamente sin console.log
  - `aria-current="page"` está en el NavLink activo, no solo clase `active`
  - Accesibilidad: test de focus navigation (Tab key) cubre toda la navbar
- **Ref spec:** app-shell-and-navigation/spec.md §2.1, 2.4, 2.5
- **Dependencia de:** Tareas 4, 5
- **Duración estimada:** 2 días

**8. Navegación Activa (días 8-9)**
- ID: `86e301dp8`
- **Tarea:** `usePathname()` integrado en NavLink para detectar ruta activa. Señal visual NO es solo color (ej: underline + bold + color).
- **Aceptación:**
  - NavLink activo tiene: color distinto + peso de fuente (600+) + underline/border-bottom
  - Test: navegar a `/wardrobe` → verificar que NavLink correspondiente tiene `aria-current="page"` Y las 3 propiedades de estilo
  - Visualtesting: captura antes/después de click en diferentes navlinks
- **Ref spec:** app-shell-and-navigation/spec.md §2.5
- **Dependencia de:** Tarea 7
- **Duración estimada:** 1 día

**9. GlobalError (5 Casos) (días 8-9)**
- ID: `86e301dpf`
- **Tarea:** Crear `<GlobalError>` que renderiza los 5 tipos de error de spec (NotFound, Unauthorized, ServerError, NetworkError, Fallback). Cada uno con UI distinta y fallback graceful.
- **Aceptación:**
  - 5 test cases: cada tipo de error renderiza sin crashes
  - No hay `console.error` no controlado (test suite limpia)
  - Fallback UI siempre visible (no blank page)
  - Buttons funcionales (reset, go home, retry)
  - Contraste AA en todos los states
- **Ref spec:** app-shell-and-navigation/spec.md §2.2
- **Dependencia de:** Tareas 4, 5
- **Duración estimada:** 1.5 días

**10. SkipToContentLink (Accesibilidad) (días 8-9)**
- ID: `86e301dpk`
- **Tarea:** Crear `<SkipToContentLink>` — primer elemento interactivo en el DOM (invisible hasta Tab). Link apunta a `id="main-content"`.
- **Aceptación:**
  - Elemento tiene `position: absolute` + `left: -9999px` (invisible)
  - En `:focus`, `top: 0; left: 0` (visible cuando se usa Tab)
  - E2E test: cargar página → presionar Tab una vez → SkipToContentLink tiene focus → presionar Enter → verifica que `main-content` recibe focus
  - Test axe accessibility: cero violaciones en modo "keyboard"
- **Ref spec:** app-shell-and-navigation/spec.md §2.5
- **Dependencia de:** Tareas 4, 5
- **Duración estimada:** 0.5 días

### Fase 4: Verificación & Tests (días 9-14)

**11. 6 Requisitos de Accesibilidad (días 10-11)**
- ID: `86e301de2`
- **Tarea:** Validar que los 6 requisitos de §2.5 de spec están cubiertos por test:
  1. SkipToContentLink (Tarea 10 ✓)
  2. Navegación por teclado (Tab, Enter, Escape) — test E2E
  3. `aria-label` en botones sin texto (ej: icon buttons)
  4. `aria-current="page"` en nav activa (Tarea 8 ✓)
  5. Contrastes AA (Tarea 2 ✓)
  6. Orden de lectura sensible (heading hierarchy, landmarks)
- **Aceptación:**
  - 6 tests, cada uno validando 1 requisito
  - `npm run test -- src/components/shell` pasa con 6 nuevos tests
  - Lighthouse accessibility score >= 90
- **Ref spec:** app-shell-and-navigation/spec.md §2.5
- **Dependencia de:** Tareas 7-10
- **Duración estimada:** 1.5 días

**12. Cobertura de Tests (días 11-13)**
- ID: `86e301dpw`
- **Tarea:** Aumentar cobertura en `src/components/shell/` y `src/app/providers.ts` a ≥80%. Cubrir: happy path, error cases, edge cases (empty state, very long labels, etc).
- **Aceptación:**
  - `npm run test -- src/components/shell --coverage` muestra >= 80% (statements, branches, lines, functions)
  - Cada componente tiene mínimo 3 test cases (normal, edge, error)
  - No hay líneas "uncovered" sin justificación en comentario
- **Ref spec:** frontend/design-system/spec.md §2.6
- **Dependencia de:** Todas las tareas anteriores
- **Duración estimada:** 2 días

**13. TypeScript, Lint, Tests (días 13-14)**
- ID: `86e301ddy`
- **Tarea:** Ejecutar `npm run typecheck && npm run lint && npm run test` en toda la carpeta design-system + app-shell. **Todas pasan en verde sin warnings.**
- **Aceptación:**
  - `npm run typecheck` → no errors (TypeScript strict mode)
  - `npm run lint` → no warnings (ESLint rules strict)
  - `npm run test` → todos los tests pasan (no skip, no pending)
  - CI ejecuta esto en cada commit — no PRs sin green checkmark
- **Ref spec:** frontend/design-system/spec.md §2.6, app-shell/spec.md §2.6
- **Dependencia de:** Todas
- **Duración estimada:** 1 día (mostly debugging last issues)

**14. Visual Regression (días 14)**
- ID: `86e302a2b` (Cross-task: Huascar también participa)
- **Tarea:** Capturar baseline screenshots de los 8 componentes (Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner) en modo claro y oscuro. Guardar en `tests/visual-regression/baselines/`.
- **Aceptación:**
  - 16 baselines (8 components × 2 themes)
  - Playwright test ejecuta, captura, compara contra baseline (fail si pixel diff > 2%)
  - Baselines están en git (no .gitignore)
  - CI ejecuta visual regression en cada PR
- **Ref spec:** frontend/design-system/spec.md (implícito en "production quality")
- **Dependencia de:** Tareas 4-5
- **Duración estimada:** 1 día

---

## Dependencias y Riesgos

| Tarea | Dependencia | Riesgo | Mitigación |
| --- | --- | --- | --- |
| 1 | Nada | Especificación ambigua de tokens | ✅ Spec 2.1 es precisa (colores nombrados, hex exacto) |
| 2 | 1 | Falso negativo en WCAG validation | Use 2+ herramientas (axe + pa11y) |
| 3 | 1 | Conflictos Tailwind no cubiertos | Test con casos reales del proyecto (px, m, p, w, h) |
| 4 | 1,3 | Props API creep (scope bloat) | Peer review estricto — max 10 props por componente |
| 5 | 1 | Parpadeo residual (timing) | Medir con Performance Observer, no solo visual |
| 6 | 5 | Memory leaks en listeners | Spy en `addEventListener`, validar cleanup |
| 7 | 4,5 | Media query breakpoint no sincroniza | E2E test con varias resoluciones (375px, 768px, 1440px) |
| 8 | 7 | Ruta activa no coincide (trailing slash) | `usePathname()` debe normalizar antes de comparar |
| 9 | 4,5 | Cascada CSS rompe fallback | GlobalError debe tener inline styles como fallback |
| 10 | 4,5 | Skip link nunca enfocado (z-index) | Validar que `:focus` hace `visible` a cualquier z-index |
| 11 | 7-10 | Test coverage no incluye E2E | Cobertura incluye unit + E2E (Playwright counts towards coverage) |
| 12 | 11 | Datos flaky en E2E visual | Usar fixtures locales, no APIs externas |
| 13 | 1-12 | CI timeout en typecheck | Incrementar timeout a 5 min (actualmente 2 min) |
| 14 | 4-5 | Baselines divergen por OS (font rendering) | Ejecutar visual regression en Docker (ubuntu) — no en local |

---

## Handoff & Entrega (fin de Sprint 1)

**Antes del Sprint Review (día 14, fin del día):**
- [ ] Comentario en [EPIC] frontend/design-system y [EPIC] frontend/app-shell-and-navigation con:
  - Qué quedó 100% completo (las 14 tareas)
  - Decisiones técnicas no documentadas (ej: "usamos `tailwind-merge` v2.1.0 por X")
  - Cualquier tech debt incurrido (ej: "SkipToContentLink implementado sin JSDoc — agregar en Sprint 2")

**Artefactos entregados:**
- ✅ 8 componentes de UI funcionales y tipados
- ✅ Design tokens derivando Tailwind
- ✅ App shell (TopNav + BottomTabBar) sin JS de breakpoint
- ✅ Cambio de tema sin parpadeo
- ✅ 14 tests pasando
- ✅ Cobertura ≥80%
- ✅ Accesibilidad WCAG 2.1 AA validada
- ✅ Visual regression baselines establecidas

**Siguiente:** Jaicel (Asiento B) en Sprint 2 construye endpoints que consumen estos componentes. Huascar (Asiento C) en Sprint 2 valida que el design-system entregado no rompe.

