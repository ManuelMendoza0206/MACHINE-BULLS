# App Shell & Navegación Global

## Purpose

Proveer el layout raíz, los providers globales, la navegación adaptativa y el manejo global de
errores que envuelve toda ruta del producto, de forma consistente y accesible. Deriva de
`docs/context/frontend-plan.md` §2.1 y §8, y de la jerarquía de errores de `CLAUDE.md` §5
(`src/lib/errors.ts`), consumida aquí por el error boundary raíz.

Depende de: `design-system` (tokens, tema). Consumido por: todas las specs de flujo (renderizan dentro de este shell).

---

## Requirements

### Requirement: Providers globales instanciados una sola vez

`src/app/providers.tsx` SHALL exportar `AppProviders({ children })` (Client Component) que
compone, en orden: `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`,
`enableSystem`) → `QueryClientProvider` → `TooltipProvider` (Radix) → `children` → `Toaster`
(sonner). El `QueryClient` SHALL crearse con `useState(() => new QueryClient(defaultQueryClientConfig))`
— nunca como singleton de módulo, nunca recreado entre renders.

#### Scenario: El QueryClient no se recrea entre renders

- **WHEN** el componente padre de `AppProviders` re-renderiza varias veces
- **THEN** la instancia de `QueryClient` es la misma referencia en todos los renders

#### Scenario: SSR sin fuga de caché entre requests

- **WHEN** dos requests distintos se renderizan en el servidor
- **THEN** cada uno obtiene su propio `QueryClient` (no comparten caché)

#### Acceptance Criteria

- [ ] `src/lib/api/queryClient.ts` exporta `defaultQueryClientConfig` (objeto `QueryClientConfig`, no instancia) con `queries.retry: false`, `queries.staleTime: 30_000`, `mutations.retry: false`
- [ ] `AppProviders` usa el patrón `useState(() => new QueryClient(defaultQueryClientConfig))`
- [ ] Test de integración verifica referencia estable entre re-renders

---

### Requirement: Navegación adaptativa sin JavaScript de detección de viewport

El sistema SHALL alternar entre navegación superior (`TopNav`, desktop) e inferior
(`BottomTabBar`, mobile) usando **solo** CSS responsivo. Ambas variantes se renderizan siempre en
el DOM; la visibilidad la controlan clases Tailwind (`hidden lg:flex` / `flex lg:hidden`). Está
prohibido `window.innerWidth`, `useMediaQuery` o cualquier render condicional por breakpoint en JS.

#### Scenario: Cambio de tamaño de viewport en la misma sesión

- **WHEN** el viewport pasa de un ancho mobile a uno desktop sin recargar
- **THEN** la navegación cambia de bottom-tab a top-nav sin parpadeo ni desajuste de hidratación, sin errores de consola

#### Scenario: Los ítems de navegación son exactamente cuatro

- **WHEN** se lee `src/config/navigation.ts`
- **THEN** `NAV_ITEMS` tiene exactamente 4 entradas (`/wardrobe`, `/outfits`, `/try-on`, `/profile`), fijadas por `frontend-plan.md` §2.1

#### Acceptance Criteria

- [ ] `TopNav` y `BottomTabBar` reciben las mismas `NAV_ITEMS` y ninguna prop de estado activo
- [ ] Cero JS de detección de viewport en el árbol de navegación
- [ ] E2E cubre el resize mobile↔desktop en 3 anchos (375 / 768 / 1440)

---

### Requirement: Resaltado de la ruta activa

El ítem de navegación activo SHALL derivarse de `usePathname()` (mismo frame que el cambio de
ruta, no un efecto con delay) mediante una función pura `isNavItemActive(pathname, href)`. El
ítem activo SHALL exponer `aria-current="page"` y una señal visual que **no dependa solo del
color** (p. ej. peso de fuente + ícono relleno vs. outline).

#### Scenario: Sub-ruta activa el ítem padre

- **WHEN** `pathname` es `/wardrobe/upload`
- **THEN** `isNavItemActive('/wardrobe/upload', '/wardrobe')` es `true` y el ítem "Armario" tiene `aria-current="page"`

#### Scenario: Solo un ítem activo a la vez

- **WHEN** `pathname` coincide con un `href`
- **THEN** ese ítem tiene `aria-current="page"` y los otros tres no

#### Acceptance Criteria

- [ ] `isNavItemActive` es pura y está en `src/lib/navigation/isNavItemActive.ts`, con tests de casos exactos y de sub-ruta
- [ ] La señal visual del activo combina ≥ 2 propiedades (no solo color)

---

### Requirement: Manejo de errores no controlados por tipo

`src/app/error.tsx` SHALL exportar `GlobalError({ error, reset })` que distingue por
`error.name` (`StyleMeError` fija `name = constructor.name`; a diferencia de `instanceof`, el
`name` sobrevive la serialización server→client de errores de Next en producción). Jerarquía en
`CLAUDE.md` §5 / `src/lib/errors.ts`. Muestra copy específico según esta tabla — **4 ramas**:

| Tipo                   | Copy                                                    | Acción                                 |
| :--------------------- | :------------------------------------------------------ | :------------------------------------- |
| `ApiError`             | "Hubo un problema con el servidor. Inténtalo de nuevo." | botón `reset()`                        |
| `NetworkError`         | "No pudimos conectarnos. Revisa tu conexión."           | botón `reset()`                        |
| `ValidationError`      | "Recibimos una respuesta inesperada del servidor."      | botón `reset()`, sin detalles técnicos |
| cualquier otro `Error` | "Algo salió mal." (genérico)                            | botón `reset()`                        |

`VtonJobTimeoutError` se maneja localmente en `vton-flow` y no debería llegar aquí; si llega,
cae en la rama genérica (sin tratamiento especial, para no duplicar lógica).

#### Scenario: Error de red no controlado

- **WHEN** un componente hijo lanza `NetworkError` durante el render
- **THEN** `GlobalError` muestra el copy de conectividad, no el genérico

#### Scenario: Reintentar invoca reset una vez

- **WHEN** el usuario pulsa "Reintentar"
- **THEN** `reset()` se invoca exactamente una vez

#### Acceptance Criteria

- [ ] `GlobalError` selecciona el copy por `error.name` (no `instanceof`)
- [ ] Test de integración pasa una instancia de cada subclase + una `Error` genérica + `VtonJobTimeoutError` (→ genérico) y verifica el copy exacto
- [ ] `ValidationError` nunca expone su `message` técnico en la UI
- [ ] `src/app/not-found.tsx` es estático (link a `/wardrobe`), sin lógica

---

### Requirement: Skip link y landmark de contenido

`src/components/shell/SkipToContentLink.tsx` SHALL ser el **primer elemento enfocable** del
`<body>` (antes de cualquier nav), visualmente oculto hasta recibir foco (`sr-only
focus:not-sr-only`), con `href="#main-content"`. `layout.tsx` SHALL envolver `children` en
`<main id="main-content" tabIndex={-1}>` (exactamente un `<main>` en el árbol).

#### Scenario: Primer Tab enfoca el skip link

- **WHEN** la página carga y el usuario pulsa `Tab` una vez
- **THEN** el foco va al skip link; `Enter` mueve el foco a `#main-content`

#### Acceptance Criteria

- [ ] El skip link precede a `AppProviders`/nav en el orden del DOM
- [ ] Hay exactamente un `<main id="main-content">` en el layout (las páginas no anidan otro)
- [ ] Cambiar de tema no produce parpadeo a nivel de layout (regresión del criterio de `design-system`)

---

## Orden de montaje del layout raíz

```
<html lang="es" suppressHydrationWarning>   (next-themes resuelve el tema pre-paint)
  <body>
    <SkipToContentLink />        ← primer enfocable del <body>, antes de AppProviders
    <AppProviders>
      <TopNav />                 ← hidden lg:block
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <BottomTabBar />           ← flex lg:hidden
      <Toaster />                ← dentro de AppProviders (sonner)
    </AppProviders>
  </body>
</html>
```

## Estrategia de pruebas

- **Unit:** `isNavItemActive` (casos exactos + sub-ruta).
- **Integración (RTL):** `TopNav`/`BottomTabBar` (4 ítems, `aria-current` en el correcto);
  `GlobalError` (4 ramas + `reset` una vez); `SkipToContentLink` (primer `Tab`);
  `AppProviders` (QueryClient estable entre renders).
- **E2E (Playwright):** resize mobile↔desktop sin error de consola; navegación solo con teclado
  desde el skip link; error forzado en ruta de prueba → `error.tsx` + `reset()` recupera.

## Manifiesto de Archivos

```
src/app/layout.tsx
src/app/providers.tsx
src/app/error.tsx
src/app/not-found.tsx
src/components/shell/TopNav.tsx
src/components/shell/BottomTabBar.tsx
src/components/shell/SkipToContentLink.tsx
src/config/navigation.ts
src/lib/api/queryClient.ts
src/lib/navigation/isNavItemActive.ts
tests/unit/lib/navigation/isNavItemActive.test.ts
tests/integration/shell/TopNav.test.tsx
tests/integration/shell/BottomTabBar.test.tsx
tests/integration/shell/GlobalError.test.tsx
tests/integration/shell/SkipToContentLink.test.tsx
tests/integration/shell/AppProviders.test.tsx
tests/e2e/navigation.spec.ts
```
