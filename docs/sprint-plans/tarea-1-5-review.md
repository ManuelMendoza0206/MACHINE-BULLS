# Asiento A (Leonardo) — Tareas 1–5: autoevaluación vs. el plan

**Rama:** `feat/leonardo-sprint-1` (no mergeada — a la espera de PR review).
**Base:** `main` actual (scaffold + tokens AA + specs migradas + entorno dev).
**Puertas (clean `npm ci`, modo CI):** typecheck · lint · format:check · test (88) · test:e2e (4/4) · build → **todas exit 0**.

---

## Tarea por tarea

| Tarea                    | Spec                                                                                               | Entregado                                                                                                                                                                                                                                                                                                                                                                                                                                         | Veredicto                                                                                                                                                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Tokens + utils**   | `design-system` — Requirements `cn()`, `getContrastRatio()`, "Design tokens with WCAG AA contrast" | `src/lib/utils/cn.ts`, `getContrastRatio.ts` (WCAG puro, acepta `#rgb`/`#rrggbb`/sin `#`), `design-tokens.contrast.test.ts` = 40 asserts (6 pares de texto ≥4.5:1 claro+oscuro **+** sync `globals.css`↔`design-tokens.ts`)                                                                                                                                                                                                                       | ✅ **acertado** — el guard es más estricto que lo pedido (además blinda la sync CSS). Corregí un escenario buggy de la spec (`text-sm`+`text-lg` que `tailwind-merge` colapsa), documentado.                                                                                                                       |
| **2 — Theme toggle**     | `design-system` — "Theme switching without FOUC"                                                   | `ThemeToggle` (ciclo system→light→dark, `aria-label`+sr-only, focus ring, guarda de `mounted` para hidratación); integración (ciclo + `localStorage` + preferencia persistida); e2e **no-FOUC** (dark aplicado antes del paint al recargar)                                                                                                                                                                                                       | ✅ **acertado** — `next-themes` resuelve el script anti-FOUC; e2e prueba que no hay flash de claro.                                                                                                                                                                                                                |
| **3 — Providers/layout** | `app-shell` — "Providers globales instanciados una sola vez"                                       | `src/lib/api/queryClient.ts` (`defaultQueryClientConfig`: objeto, no instancia — `retry:false`, `staleTime:30_000`); `providers.tsx` lo importa; test: **referencia estable** del QueryClient entre re-renders + config compartida + contexto llega a los hijos                                                                                                                                                                                   | ✅ **acertado** — el footgun del singleton de módulo (fuga de caché en SSR) queda resuelto y testeado. La config queda lista para el api-client de Jaicel.                                                                                                                                                         |
| **4 — 5 componentes UI** | `design-system` §2.4 + "Accessibility compliance"                                                  | Button (`cva`, `forwardRef`, `asChild` vía Slot, `variant`/`size` exactos de §2.4, foco visible, `aria-disabled`+`disabled`), Card+Header/Content/Footer, Badge (`default/success/warning/outline`, `children` obligatorio — el texto carga el significado), Skeleton (`role=status`+`aria-busy`+label), Progress (`role=progressbar`, `aria-valuenow`/`%` determinado, `aria-valuetext` indeterminado, clamp 0–100). 15 tests RTL.               | ✅ **acertado, con nota** — variantes 1:1 con la spec; los 4 requisitos de a11y de §2.5 cubiertos por test. La spec se contradecía sobre dónde va `aria-busy` (elemento vs. contenedor): fui por `role=status` en el elemento (satisface el escenario y es testeable) y documenté el patrón de wrapper para grids. |
| **5 — App shell**        | `app-shell` — nav adaptativa, ruta activa, error boundary, skip link                               | `config/navigation.ts` (4 `NAV_ITEMS`), `isNavItemActive` (puro, sub-rutas, tolera trailing slash, no colisiona `/wardrobe-archive`), `TopNav` (`hidden lg:block`), `BottomTabBar` (`flex lg:hidden`, fixed), `error.tsx` (**4 ramas**, match por `error.name`), `not-found.tsx`, 4 páginas stub para que la nav sea real, `SkipToContentLink` primero en `<body>`. Tests: unit + 3 integración + e2e (resize solo-CSS + navegación por teclado). | ✅ **acertado** — señal de activo = `aria-current` + peso de fuente + grosor de ícono (2 señales no-color). `error.name` en vez de `instanceof` es **mejor que la spec**: `instanceof` se rompe con la serialización server→client de Next en producción.                                                          |

---

## Contra el plan de producto (`frontend-plan.md`)

| Principio                                                                       | Estado                                                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| §1 "quiet confidence" — accent casi-monocromo, paleta neutra                    | ✅ `accent` ≈ negro, sin color de marca saturado                                               |
| §8 WCAG AA — contraste, teclado, `aria-current`, skip link, foco, no-solo-color | ✅ los 6 pares ≥4.5:1 (verificado), nav por teclado (e2e), foco visible, doble señal en activo |
| §1.2.4 mobile-first — pulgar, una mano                                          | ✅ `BottomTabBar` mobile / `TopNav` desktop, switch solo-CSS                                   |
| §5.4 Skeleton "crítico"                                                         | ✅ implementado con a11y                                                                       |
| No FOUC (§5.1: dark desde el día 1)                                             | ✅ e2e-verificado                                                                              |

---

## Gaps y follow-ups (honestos)

1. **Cobertura como número** — no medida contra el 80%. P1#8 difiere el _gate_ a Sprint 2 (Huascar). Hay 88 tests + 4 e2e.
2. **`axe`/`jest-axe`** — no está en deps (tarea de QA de Huascar). Mis asserts de a11y son manuales (`aria-*`, `role`).
3. **Visual regression** (`86e302a2b`) — es de Huascar, no hecho.
4. **Landing `/`** — todavía muestra el `TopNav` de la app; debería ser pre-auth limpio. Es alcance de `landing-and-auth-flow` (spec 06), no de este asiento.
5. **Páginas stub** (`/wardrobe` etc.) — las crean formalmente las specs de flujo; acá son stubs marcados, necesarios para que `typedRoutes` y la nav funcionen.
6. **e2e local** flaky en cold-start de `next dev` (mitigado con `retries:1`). **CI usa `next start`** (build de producción, sin compile-on-demand) → 4/4 sólido.
7. **Skeleton `role=status`** en cada item de un grid = varias live-regions. El doc del componente indica envolver; no hay enforcement.

---

## Commits en la rama

```
363fe60 test(tarea5): harden playwright webServer
e2593c3 feat(tarea5): app shell — adaptive nav, error boundary, not-found
9c6ef5c feat(tarea4): 5 base UI components
9968d89 feat(tarea3): defaultQueryClientConfig + AppProviders test + nav slot
252a598 feat(tarea2): ThemeToggle + no-FOUC e2e
a7d17f7 feat(tarea1): cn() + getContrastRatio() + contrast guard
```

## Desviaciones — alineadas en la spec (ya no son desviaciones)

Decisión de equipo: forzar la alineación docs ↔ specs ↔ ClickUp. Las 3 mejoras que hice
durante la implementación se **incorporaron a las specs** en esta misma rama:

| Antes (spec)                                                                                | Ahora (spec + código, coherentes)                                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `cn()` "Merge conditional classes" usaba `text-sm`+`text-lg` (que `tailwind-merge` colapsa) | escenario con `font-bold`/`italic` + nota de que el colapso de conflictos es intencional         |
| `GlobalError` "distingue por `instanceof`"                                                  | "distingue por `error.name`" (sobrevive la serialización server→client de Next) + AC actualizado |
| Diagrama de montaje: `<SkipToContentLink/>` dentro de `<AppProviders>`                      | antes de `<AppProviders>`, primer enfocable del `<body>` (ya lo decía el AC)                     |
| Skeleton: `aria-busy="true"`                                                                | `role="status"` + `aria-busy` + nombre accesible; patrón de wrapper para grids documentado       |

**Conclusión:** las 5 tareas cubren sus Requirements con test, las puertas están verdes en modo
CI, y las specs quedan alineadas con lo construido. Listo para PR review del equipo.
