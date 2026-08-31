# Sprint 1 — Inicialización | Asiento A (Leonardo Ibarra López)

**Rol:** Feature Lead — Frontend Foundation
**Ventana:** Sprint 0 (scaffold, ya entregado) + Sprint 1 features **2–8 sep 2026** (~28 h @ 4h/día)
**Epics:** [EPIC] frontend/design-system, [EPIC] frontend/app-shell-and-navigation
**Tareas ejecutables:** 6 (Tarea 0–5). *Tarea 6 (API skeleton) diferida a Sprint 2 — epic F3, Asiento A = Jaicel.*
**Stack fijo:** Next.js 14.2 · React 18.3 · Node 20 · TypeScript strict

> **Gobernanza (no negociable):** cada Tarea entra por su rama `feat/tareaN-<slug>` → PR →
> ≥1 revisor (Jaicel para código, Manuel para infra) → merge a `main`. **Cero commits
> directos a `main`.** Declaración de uso de IA en el cuerpo de cada PR.

---

## 🎯 Objetivo de Sprint

Construir el **cimiento del frontend** — tokens, UI base, shell accesible:
- ✅ Proyecto Next.js 14.2 compilando (Tarea 0 — ya verde vía `chore/sprint-1-prep`)
- ✅ 5 componentes UI tipados (Button, Card, Badge, Skeleton, Progress)
- ✅ Shell mínimo con navegación adaptativa + error boundary + a11y
- ✅ Design tokens + utilidades (`cn()`, contraste)
- ✅ Tests verdes + CI ejecutando

---

## 📋 Tareas (orden estricto)

### ⚠️ Tarea 0: Verificación del Scaffold — 0.5 días
**Spec:** `openspec/specs/frontend/project-scaffold/spec.md`

El scaffold ya está en `main` (PR `chore/sprint-1-prep`). Esta Tarea verifica que compila en tu entorno.

1. `git clone` + `git checkout main` + `nvm use` (Node 20)
2. `npm ci` (no `npm install`)
3. `npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build` — todos exit 0
4. Confirmar en GitHub Actions que el último run de `main` está verde
5. Si algo falla en tu entorno: abrir issue, **NO** parchear en `main`

**Aceptación:**
- [ ] `npm ci` sin errores (lockfile en sync)
- [ ] `typecheck`, `lint`, `test`, `test:e2e`, `build` → todos exit 0 localmente
- [ ] CI de `main` verde
- [ ] Comentario en ClickUp con la salida de los comandos como evidencia

---

### Tarea 1: Utilidades de diseño + tests de tokens — 1.5 días
**Spec:** `design-system/spec.md` — Requirements "Design tokens with WCAG AA contrast",
"Utility function cn()", "Contrast ratio calculator utility".

El scaffold ya trae `src/config/design-tokens.ts` (hex de §2.1 + helper `hexToHslChannels`),
`tailwind.config.ts` derivando la paleta de esas keys, y `src/app/globals.css` con las
variables CSS. Esta Tarea **añade las utilidades y los tests que faltan**:

1. `src/lib/utils/cn.ts` — `clsx` + `tailwind-merge` (`cn(...inputs: ClassValue[]): string`).
2. `src/lib/utils/getContrastRatio.ts` — `getContrastRatio(hex1, hex2): number` (WCAG, sin dep externa).
3. `tests/unit/lib/utils/cn.test.ts` — 4 casos (conflicto, condicional, `undefined`, array anidado).
4. `tests/unit/lib/utils/getContrastRatio.test.ts` — casos conocidos (negro/blanco = 21:1, etc.).
5. `tests/unit/config/design-tokens.contrast.test.ts`:
   - Pares de **texto** de la spec — `(foreground, background)` y `(mutedForeground, muted)` — claro y oscuro: ≥ 4.5:1.
   - `(accentForeground, accent)` en ambos temas: ≥ 4.5:1.
   - **Sync check:** cada línea `--x` de `globals.css` == `hexToHslChannels(colorTokens.x[theme])`.
6. **Decisión de token pendiente** *(bloquea el escenario "ALL pairs ≥ 4.5:1")*:
   `success` (#16A34A) y `destructive` (#DC2626) sobre blanco dan < 4.5:1. Opciones: (a) oscurecer el
   token de texto (variante 700), o (b) acotar el AC a "3:1 para componentes/no-texto (WCAG 1.4.11)"
   porque se usan como fondo con texto claro o como borde/ícono. Registrar la decisión en el PR y
   actualizar la spec vía `openspec/changes/`.

**AC:**
- [ ] `cn()` y `getContrastRatio()` en `src/lib/utils/`, tipados, sin `any`
- [ ] Los 3 archivos de test en verde; `npm run test` pasa
- [ ] Decisión de contraste registrada (PR + change de spec)
- [ ] PR `feat/tarea1-design-tokens` revisado y mergeado

---

### Tarea 2: Theme switching (no FOUC) — 1 día
**Spec:** `design-system/spec.md` — Requirement "Theme switching without FOUC"; `app-shell/spec.md` §2.3.

`next-themes` (ya en `providers.tsx`: `ThemeProvider attribute="class" defaultTheme="system"`)
inyecta el script anti-FOUC; `<html suppressHydrationWarning>` ya está en `layout.tsx`.

1. `src/components/shell/ThemeToggle.tsx` — botón (light/dark/system) con `useTheme` de `next-themes`.
2. `tests/integration/shell/ThemeToggle.test.tsx` — toggle cambia `documentElement.classList`; persiste en `localStorage`; respeta `prefers-color-scheme` en `system`.
3. `tests/e2e/theme.spec.ts` — recarga con tema oscuro fijado → sin flash de claro.

**AC:**
- [ ] `ThemeToggle` accesible (`aria-label`, foco visible); sin `any`
- [ ] Tests unit + e2e en verde
- [ ] PR `feat/tarea2-theme` revisado y mergeado

---

### Tarea 3: Providers + Layout (refinamiento) — 1 día
**Spec:** `app-shell/spec.md` §2.1, §2.3.

El scaffold ya trae `AppProviders` (con `useState(() => new QueryClient(...))`, `TooltipProvider`,
`Toaster`) y `layout.tsx` (`export const viewport` sin `maximumScale`; `SkipToContentLink` +
`<main id="main-content" tabIndex={-1}>` **dentro** de `AppProviders`). Esta Tarea:

1. Extrae la config inline del QueryClient a `src/lib/api/queryClient.ts` como
   `export const defaultQueryClientConfig` (objeto, **no** instancia); `AppProviders` la importa.
2. Deja *slots* en `layout.tsx` para `<TopNav />` (antes de `<main>`) y `<BottomTabBar />` (después),
   que rellena Tarea 5 — ambos dentro de `AppProviders`, ocultos por CSS según breakpoint.
3. `tests/integration/shell/AppProviders.test.tsx`:
   - `QueryClient` **estable entre re-renders** del padre (misma referencia).
   - El árbol monta sin errores de hidratación.
   - `SkipToContentLink` es el primer elemento alcanzable por `Tab`.

**AC:**
- [ ] `defaultQueryClientConfig` en `src/lib/api/queryClient.ts` (`retry: false`, `staleTime: 30_000`)
- [ ] Tests en verde; `typecheck` limpio
- [ ] PR `feat/tarea3-providers` revisado y mergeado

---

### Tarea 4: 5 componentes UI base — 2.5 días
**Spec:** `design-system/spec.md` §2.4 — **exactamente** Button, Card, Badge, Skeleton, Progress.

| Componente | Variantes (§2.4) |
|---|---|
| `Button` | `variant: 'default' \| 'secondary' \| 'ghost' \| 'destructive'`, `size: 'sm' \| 'default' \| 'lg' \| 'icon'` |
| `Card` (+ `CardHeader/Content/Footer`) | — |
| `Badge` | `variant: 'default' \| 'success' \| 'warning' \| 'outline'` |
| `Skeleton` | `className` (dimensiones vía Tailwind) |
| `Progress` | `value?: number` (`undefined` = indeterminado) |

**Por componente:**
1. `src/components/ui/<component>.tsx` — `cva` para variantes, `forwardRef`, `asChild` (Radix `Slot`) donde aplique. Sin `any`.
2. `tests/integration/ui/<component>.test.tsx` (RTL) — cada variante renderiza y aplica la clase esperada (snapshot de `className`).
3. A11y verificable de §2.5: `aria-disabled` (Button), texto-no-solo-color (Badge), `aria-busy` en el contenedor (Skeleton), `role="progressbar"` + `aria-valuenow`/`aria-valuetext` (Progress).

**AC:**
- [ ] Los 5 componentes con las variantes **exactas** de §2.4
- [ ] Tests RTL en verde; sin `console.error` en la corrida
- [ ] Los 4 requisitos de a11y de §2.5 cubiertos por test
- [ ] PR `feat/tarea4-ui-components` revisado y mergeado

**⚠️ NADA de Dialog, Sheet, Tabs, Toast(sonner), Input, Select, Modal, Tooltip, Spinner — son Sprint 2.**
**⚠️ NADA de Storybook.**

---

### Tarea 5: Componentes del App Shell — 1 día
**Spec:** `app-shell/spec.md` §2.2 (navegación), §2.4 (error boundary), §2.5 (`not-found`), §2.6 (skip link), §3.2 (nav activa).

1. `src/config/navigation.ts` — `NAV_ITEMS` (exactamente 4: `/wardrobe`, `/outfits`, `/try-on`, `/profile`).
2. `TopNav` — `hidden lg:flex`; sin JS de breakpoint.
3. `BottomTabBar` — `flex lg:hidden`; sin JS de breakpoint.
4. `src/lib/navigation/isNavItemActive.ts` (pura) + `usePathname()`; `aria-current="page"` + señal visual no dependiente solo del color.
5. `src/app/error.tsx` (`GlobalError`) — distingue por `instanceof` según la tabla de §2.4:
   `ApiError`, `NetworkError`, `ValidationError`, y "cualquier otro `Error`" → **4 ramas** (no 5).
6. `src/app/not-found.tsx` — estático, link a `/wardrobe`.

**Tests:** `tests/unit/lib/navigation/isNavItemActive.test.ts`,
`tests/integration/shell/{TopNav,BottomTabBar,GlobalError,SkipToContentLink}.test.tsx`,
`tests/e2e/navigation.spec.ts` (resize mobile↔desktop sin error de consola; navegación solo con teclado).

**AC:**
- [ ] `TopNav`/`BottomTabBar` alternan solo por CSS responsivo (cero `useMediaQuery`/`window.innerWidth`)
- [ ] `GlobalError` cubre las 4 ramas de §2.4 con copy distinto verificado por test
- [ ] `isNavItemActive` maneja sub-rutas (`/wardrobe/upload` activa `/wardrobe`)
- [ ] PR `feat/tarea5-app-shell` revisado y mergeado

---

### Tarea 6 — DIFERIDA a Sprint 2

El esqueleto de API client + los tests de `errors.ts` pertenecen al epic
`api-client-and-schemas` (F3), que **arranca en Sprint 2 con Jaicel como Asiento A**
(rotación §7.1). No es trabajo del Asiento A en Sprint 1 y sacarlo cierra la brecha de
cronograma. `src/lib/errors.ts` ya existe (scaffold); Jaicel lo consume desde su epic.
Decisión registrada en `CLAUDE.md` §10 D4.

---

## ⏱️ Cronograma (2–8 sep 2026, ~4h/día) — Tareas 0–5

| Día | Fecha | Tarea | Est. |
|---|---|---|---|
| — | 31 ago–1 sep | Tarea 0 (verificar scaffold) | 0.5d |
| 1 | mar 2 sep | Tarea 1 (utilidades + tests de tokens) | 1.5d |
| 2 | mié 3 sep | Tarea 1 (cierre) + Tarea 2 (theme toggle) | 1.0d |
| 3 | jue 4 sep | Tarea 3 (providers/layout) — **mid-sprint check 15:30** | 1.0d |
| 4–5 | vie 5 – sáb 6 sep | Tarea 4 (5 componentes + tests) | 2.5d |
| 6–7 | dom 7 – lun 8 sep | Tarea 5 (shell + error boundary) + buffer de review | 1.5d |

**Total: ~8 tarea-días en 7 días de 4h.** Con holgura ajustada. Válvula de escape pactada en
el mid-sprint (4 sep): si va apretado, `BottomTabBar` de Tarea 5 → Sprint 2 (queda `TopNav` +
`error.tsx` + `not-found.tsx`, que es lo que consumen las specs 02–04).

---

## 🔗 Dependencias

```
Tarea 0 (scaffold, hecho)
   ├─ Tarea 1 (utils + token tests) ──┬─ Tarea 4 (componentes)
   ├─ Tarea 2 (theme toggle) ─────────┤
   └─ Tarea 3 (providers/layout) ─────┴─ Tarea 5 (shell)
```

---

## 📚 Spec References (verificar cada línea)

- **design-system/spec.md** — Requirements: "Design tokens with WCAG AA contrast", "cn()",
  "Contrast ratio calculator", "Theme switching without FOUC", "5 base UI components" (§2.4),
  "Accessibility compliance" (§2.5)
- **app-shell/spec.md** — Requirements: providers (QueryClient vía `useState`) · navegación
  adaptativa (solo CSS) · ruta activa · error boundary (4 ramas) · skip link + landmark
- **api-client-and-schemas/spec.md** — solo §2.2 (`defaultQueryClientConfig` para Tarea 3). La
  jerarquía de errores y el client son Sprint 2.

---

## ✅ Definition of Done — por Tarea

- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build` — todos exit 0
- [ ] CI verde en el PR
- [ ] Cada requisito de spec citado, cubierto por test (spec → test en rojo → código)
- [ ] Cero `any`; cero `console.error` no controlado en tests; cero color hardcodeado fuera de `design-tokens.ts`/`globals.css`
- [ ] **PR mergeado a `main` con ≥1 aprobación y declaración de uso de IA** — nunca commit directo

---

## 🚨 Restricciones (no negociables)

1. **Cada Tarea = su rama + PR + review.** Cero commits directos a `main`.
2. **5 componentes, NO 8** — nada de Input/Select/Modal/Tooltip/Spinner (Sprint 2).
3. **Sin Storybook** en Sprint 1.
4. **`providers.tsx`** (Client Component), export `AppProviders`.
5. **Navegación por media query CSS**, cero detección de viewport en JS.
6. **Colores solo desde `design-tokens.ts`** (y su reflejo en `globals.css`); cero literal de color en componentes.
7. **QueryClient vía `useState(() => new QueryClient(defaultQueryClientConfig))`**, nunca singleton de módulo.
8. **`export const viewport`** (patrón Next 14), sin `maximumScale`/`userScalable: false`.

---

## 🤝 Pair Sessions

- **Tarea 3 (providers):** Jaicel confirma `defaultQueryClientConfig` (retry/staleTime) — 15 min.
- **Tarea 5 (shell):** Huascar revisa a11y de teclado antes del PR.
- **Daily:** 09:30 standup (15 min).

---

## 📊 Success Metrics

| Métrica | Target | Método |
|---|---|---|
| Tests | 100% verde | `npm run test` + `npm run test:e2e` |
| TypeScript strict | 0 errores | `npm run typecheck` |
| Lint | 0 warnings | `npm run lint` |
| Build | ✅ | `npm run build` |
| CI | ✅ en el PR | GitHub Actions |
| Contrast | pares de texto ≥ 4.5:1 | `design-tokens.contrast.test.ts` |
| a11y de componentes | 4 requisitos de §2.5 | RTL (`aria-*`, `role`) |
| Coverage | medida, sin gate en Sprint 1 | Vitest report |

> a11y con `axe`/`jest-axe` es Sprint 2 (aún no está en `package.json`; lo trae el track de Huascar).

---

*Este prompt es fuente de verdad para Tarea 0–5. Verificá cada línea contra la spec antes de implementar.*
