# Sprint 1 — Inicialización | Asiento A (Leonardo Ibarra López)

**Rol:** Feature Lead — Frontend Foundation  
**Período:** 26 ago - 8 sep 2026 (10 días calendario, ~40 horas disponibles @ 4h/día)  
**Epics:** [EPIC] frontend/design-system, [EPIC] frontend/app-shell-and-navigation  
**Tareas ejecutables:** 6 (Tarea 0-6)  
**Story Points:** ~20 (0.4x IA multiplier respeta déficit de tiempo)

---

## 🎯 Objetivo de Sprint

Construir **cimiento del frontend** — tokens, UI base, shell accesible, sin los cuales nada compila:
- ✅ Proyecto Next.js 15 compilando (Tarea 0 blocker)
- ✅ 5 componentes UI tipados (Button, Card, Badge, Skeleton, Progress)
- ✅ Shell mínimo con navegación adaptativa + error boundary + a11y
- ✅ Design tokens + utilidades (cn(), contraste)
- ✅ Tests verdes + CI pipeline ejecutando

---

## 📋 Tareas (Orden Estricto de Ejecución)

### ⚠️ Tarea 0: Project Scaffold (BLOCKER) — 1.5 días
**Spec:** `openspec/specs/frontend/project-scaffold/spec.md`

**Qué hacer:**
1. Clone repo `https://github.com/ManuelMendoza0206/MACHINE-BULLS.git`
2. Run `npm ci` (use ci, not install, para reproducibilidad)
3. Verify: `npm run typecheck && npm run lint && npm run test && npm run build` — todas verdes
4. Verify CI pipeline green (GitHub Actions)
5. Commit: "feat: Tarea 0 complete — Next.js 15 scaffold ready"

**No adelantes Tareas 1-6 hasta que Tarea 0 DONE.**

**Aceptación:**
- [ ] `npm ci` without errors
- [ ] `npm run typecheck` exits 0 (TS strict)
- [ ] `npm run test` exits 0 (empty suite OK)
- [ ] `npm run build` produces .next/ without warnings
- [ ] GitHub Actions workflow runs successfully
- [ ] Commit pushed to main

---

### Tarea 1: Design Tokens + Utilities — 1.5 días

**Qué (spec):** `design-system/spec.md` §2.1-2.2

**Tareas específicas:**
1. Crear `src/config/design-tokens.ts` con colores exactos (claro/oscuro):
   ```typescript
   export const colorTokens = {
     background: { light: '#FAFAF9', dark: '#0C0C0D' },
     foreground: { light: '#18181B', dark: '#F4F4F5' },
     muted: { light: '#F1F0EE', dark: '#1A1A1C' },
     mutedForeground: { light: '#71717A', dark: '#A1A1AA' },
     border: { light: '#E4E4E7', dark: '#27272A' },
     accent: { light: '#1C1C1E', dark: '#F4F4F5' },
     'accent-foreground': { light: '#F4F4F5', dark: '#1C1C1E' },
     success: { light: '#16A34A', dark: '#22C55E' },
     'success-foreground': { light: '#F4F4F5', dark: '#0C0C0D' },
     destructive: { light: '#DC2626', dark: '#EF4444' },
     'destructive-foreground': { light: '#F4F4F5', dark: '#0C0C0D' },
   };
   ```
2. Crear `src/utils/cn.ts` (clsx + tailwind-merge)
3. Crear `src/utils/getContrastRatio.ts` (WCAG AA validator)
4. Update `tailwind.config.ts` to import colorTokens (NO hardcoding)
5. Update `src/app/globals.css` with CSS variables (NOT shadcn defaults)

**Tests:** `tests/unit/config/design-tokens.contrast.test.ts`
- [ ] All 11 color pairs (light/dark × foreground/background) pass AA ratio ≥4.5:1
- [ ] cn() merges classes without conflicts (4 test cases min)
- [ ] getContrastRatio() computes correctly (verified against known pairs)

**Aceptación (AC):**
- [ ] `src/config/design-tokens.ts` exports colorTokens, typeScale, spacing
- [ ] `tailwind.config.ts` imports and uses colorTokens (zero hex literals)
- [ ] `src/app/globals.css` defines CSS variables from tokens (no hardcoded colors)
- [ ] `npm run test` passes all contrast tests
- [ ] Commit: "feat(Tarea 1): design tokens, cn(), contrast validator"

---

### Tarea 2: Theme Switching (no FOUC) — 1 día

**Qué (spec):** `design-system/spec.md` Requirement: Theme toggle; `app-shell/spec.md` §2.3

**Tareas específicas:**
1. Crear `src/hooks/useTheme.ts` (wraps next-themes)
2. Crear script de tema (inyectado en layout.tsx <head> ANTES de stylesheets)
3. Verify `suppressHydrationWarning` en `<html>`
4. localStorage persistence (theme preference remembered)

**Tests:** `tests/hooks/useTheme.test.ts`
- [ ] Toggle between light/dark, DOM reflects change instantly
- [ ] localStorage stores preference
- [ ] prefers-color-scheme fallback works
- [ ] E2E: visual test (no flicker on page load)

**AC:**
- [ ] `npm run test` passes
- [ ] No FOUC on page reload (measured in E2E)
- [ ] Commit: "feat(Tarea 2): theme switching with localStorage"

---

### Tarea 3: Providers + App Layout — 1 día

**Qué (spec):** `app-shell/spec.md` §2.1, 2.3; `design-system/spec.md` (theme)

**Tareas específicas:**
1. Create `src/app/providers.tsx` (Client Component)
   - ThemeProvider (next-themes)
   - QueryClientProvider (TanStack Query, NEW INSTANCE per session via useState(() => new QueryClient(...)))
   - Children
   - Toaster (sonner)

2. Update `src/app/layout.tsx`:
   - Import Providers, SkipToContentLink
   - Render: SkipToContentLink → Providers → TopNav → <main id="main-content" tabIndex={-1}> → children → BottomTabBar → Toaster
   - FIX: Use `export const viewport` (Next 15 pattern) — NO maximumScale: 1 (violates WCAG)
   - FIX: metadata.viewport removed (moved to separate export)

3. Update `src/app/globals.css`:
   - NO shadcn defaults — import from design-tokens instead

**Tests:** `tests/integration/layout.test.tsx`
- [ ] Providers render without hydration errors
- [ ] QueryClient is singleton (same instance after re-render)
- [ ] Theme changes propagate to layout
- [ ] SkipToContentLink visible on Tab

**AC:**
- [ ] `npm run test` passes
- [ ] `npm run typecheck` passes (no TS errors)
- [ ] Commit: "feat(Tarea 3): app layout, providers, theme integration"

---

### Tarea 4: 5 Core UI Components — 2.5 días

**Qué (spec):** `design-system/spec.md` §2.4 (Button, Card, Badge, Skeleton, Progress ONLY)

**Component breakdown (5 total, NOT 8):**
- Button (variant: default/secondary/danger; size: sm/md/lg)
- Card (container, variant: default/hover)
- Badge (color variants: default/success/warning/outline)
- Skeleton (loading bone, aria-busy)
- Progress (linear bar, determinate/indeterminate)

**Per component:**
1. Create `src/components/ui/[component].tsx`
2. Props typed (NO any)
3. Single responsibility
4. Integrate cn() for class merging
5. Test: `tests/integration/ui/[component].test.tsx` (RTL + a11y checks)
   - Render with each variant
   - Verify correct classes applied
   - WCAG a11y: aria-disabled (Button), aria-busy (Skeleton), role (Progress)

**AC:**
- [ ] All 5 components exist and render
- [ ] Variants match spec exactly
- [ ] No console errors during test run
- [ ] Coverage >50% for ui/*
- [ ] Commit: "feat(Tarea 4): 5 core UI components (Button, Card, Badge, Skeleton, Progress)"

**⚠️ NO Dialog, Sheet, Tabs, Toast, Input, Select, Modal, Tooltip, Spinner — those are Sprint 2**
**⚠️ NO Storybook export — removed from scope**

---

### Tarea 5: App Shell Components — 1 día

**Qué (spec):** `app-shell/spec.md` §2.1-2.6

**Components (3 shell + 1 boundary):**
1. TopNav (header, theme toggle, logo) — visible lg+ (hidden <lg via CSS)
2. BottomTabBar (mobile nav, 4 tabs) — visible <lg, hidden lg+
3. SkipToContentLink (a11y skip link, sr-only)
4. GlobalError (error boundary, 5 error types)

**Per component:**
1. Create in `src/components/shell/`
2. Use usePathname() for active nav (not props)
3. Tests: `tests/integration/shell/[component].test.tsx`
   - Render variants
   - Keyboard nav (Tab, Enter, Escape)
   - aria-current="page" on active nav item
   - GlobalError catches and displays error correctly

**AC:**
- [ ] All 4 components exist
- [ ] TopNav/BottomTabBar toggle via CSS media query (NO JS breakpoint detection)
- [ ] SkipToContentLink sr-only + visible on focus
- [ ] GlobalError displays 5 error types without crashes
- [ ] Commit: "feat(Tarea 5): app shell (TopNav, BottomTabBar, SkipLink, GlobalError)"

---

### Tarea 6: API Client Skeleton + Error Hierarchy — 1.5 días

**Qué (spec):** `api-client-and-schemas/spec.md` §2.1-2.2

**Files:**
1. `src/lib/errors.ts` — error hierarchy (StyleMeError base + ApiError, ValidationError, NetworkError, VtonJobTimeoutError)
2. `src/lib/api/queryClient.ts` — QueryClient config (NO singleton at module level — used in providers.tsx with useState hook)
3. `src/lib/api/client.ts` (skeleton) — fetch wrapper (NO implementation yet, just types)

**Tests:** `tests/lib/errors.test.ts`
- [ ] Each error type instantiates correctly
- [ ] instanceof checks work

**AC:**
- [ ] Error classes defined and typed
- [ ] QueryClient config matches spec (retry: false, staleTime: 30s)
- [ ] No circular dependencies
- [ ] Commit: "feat(Tarea 6): error hierarchy + API client skeleton"

---

## ⏱️ Cronograma (Día a día)

| Día | Fecha | Tarea | Duración | Cumulative |
|---|---|---|---|---|
| 1 | 26-27 ago | Tarea 0 (Scaffold blocker) | 1.5d | 1.5d |
| 2-3 | 27-28 ago | Tarea 1 (Tokens + utilities) | 1.5d | 3d |
| 3-4 | 28-29 ago | Tarea 2 (Theme) + Tarea 3 (Layout) | 2d | 5d |
| 5-6 | 29-31 ago | Tarea 4 (5 components) | 2.5d | 7.5d |
| 7 | 1 sep | Tarea 5 (Shell) + Tarea 6 (API skeleton) | 2.5d | 10d |
| 8-14 | 2-8 sep | Buffer: PR reviews, fixes, integration | 4d | 14d |

**Total: 10 días defensible.**

---

## 🔗 Dependencias

```
Tarea 0 (scaffold) ┐
                   ├→ Tarea 1 (tokens) ┐
                   │                   ├→ Tarea 4 (components)
                   ├→ Tarea 2 (theme) ─┤
                   │                   ├→ Tarea 5 (shell)
                   ├→ Tarea 3 (layout) ┘
                   │
                   └→ Tarea 6 (API skeleton, parallel OK)
```

---

## 📚 Spec References (Validate Every Line)

- **design-system/spec.md §2.1** — Color tokens (11 pairs light/dark)
- **design-system/spec.md §2.2** — Utility cn()
- **design-system/spec.md §2.4** — Components: Button, Card, Badge, Skeleton, Progress (5 ONLY)
- **design-system/spec.md §4** — Test plan (contrast AA, component variants)
- **app-shell/spec.md §2.1-2.6** — Providers, TopNav, BottomTabBar, SkipLink, GlobalError, error types
- **api-client/spec.md §2.1** — Error hierarchy (StyleMeError + 4 subclasses)
- **api-client/spec.md §2.2** — QueryClient config

---

## ✅ Definition of Done (DoD)

- [ ] ALL npm run typecheck && lint && test && build PASS (zero warnings)
- [ ] GitHub Actions workflow GREEN
- [ ] WCAG 2.1 AA verified (contrast, keyboard nav, a11y tree)
- [ ] All spec references checked + implemented
- [ ] All PRs reviewed by Jaicel (code review) OR Manuel (infra review for Tarea 0)
- [ ] Zero `any` types
- [ ] Zero `console.error` in tests
- [ ] Zero hardcoded colors/tokens (all from design-tokens.ts)
- [ ] Commits pushed to main with IA disclosure

---

## 🚨 Critical Constraints (Non-Negotiable)

1. **Tarea 0 is BLOCKER** — Don't advance to Tarea 1 until `npm run build` is GREEN
2. **5 components, NOT 8** — NO Input, Select, Modal, Tooltip, Spinner (Sprint 2)
3. **NO Storybook in Sprint 1** — Removed from scope (evaluate Sprint 3)
4. **providers.tsx, NOT providers.ts** — Must be Client Component
5. **CSS media query nav, NO JavaScript breakpoint detection** — Prevent hydration mismatch
6. **colors from design-tokens.ts, ZERO hardcoding** — Even in globals.css
7. **QueryClient via useState hook, NOT module singleton** — SSR cache isolation
8. **viewport export, NO metadata.viewport with maximumScale** — WCAG compliance

---

## 🤝 Pair Sessions

- **Tarea 0 → Start:** Manuel (Infra) validates scaffold + CI
- **Tarea 6 (API client):** Jaicel (Backend) aligns Zod schemas with backend models
- **Daily:** 09:30 standup (15 min Slack)

---

## 📊 Success Metrics

| Metric | Target | Method |
|---|---|---|
| Tests passing | 100% | `npm run test` |
| TypeScript strict | 0 errors | `npm run typecheck` |
| Linting | 0 warnings | `npm run lint` |
| Build success | ✅ | `npm run build` |
| CI green | ✅ | GitHub Actions |
| Contrast AA | 100% pairs | Automated test |
| a11y compliance | WCAG 2.1 AA | axe tests |
| Coverage | >50% | Vitest report |

---

*This prompt is source of truth for Tarea 0-6. Cross-check every line against spec before implementing.*
