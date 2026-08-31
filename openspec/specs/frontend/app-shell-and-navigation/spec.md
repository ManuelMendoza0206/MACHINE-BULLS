## Purpose
Provee el layout raíz, la navegación adaptativa y el manejo global de errores que envuelve toda ruta autenticada del producto, de forma consistente y accesible.

## Requirements

### Requirement: Navegación adaptativa sin JavaScript de detección de viewport
El sistema SHALL alternar entre navegación superior (desktop) e inferior (mobile) usando solo CSS responsivo.

#### Scenario: Cambio de tamaño de viewport
- **WHEN** el viewport cambia de un ancho mobile a uno desktop dentro de la misma sesión
- **THEN** la navegación cambia de bottom-tab a top-nav sin parpadeo ni desajuste de hidratación

### Requirement: Manejo de errores no controlados por tipo
El sistema SHALL mostrar un mensaje distinto según la subclase de `StyleMeError` capturada por el error boundary global.

#### Scenario: Error de red no controlado
- **WHEN** un componente hijo lanza una instancia de `NetworkError` durante el render
- **THEN** el error boundary global muestra el copy específico de conectividad, no un mensaje genérico

---

# Spec 05 — App Shell & Navegación Global

**Estado:** Draft para implementación · **Depende de:** spec 00 (design system) · **Consumido por:** specs 02, 03, 04, 06, 07 (todas renderizan dentro de este shell)

Deriva de `docs/context/frontend-plan.md` §2.1 (navegación global), §8 (accesibilidad), `CLAUDE.md` §5 (jerarquía de errores — consumida aquí por el error boundary global). Cubre `app/layout.tsx`, la navegación adaptativa (top nav / bottom tab bar), el error boundary raíz y `not-found`.

---

## 1. Propósito y SLA

**Propósito:** proveer el layout raíz (providers globales, tema, navegación) que envuelve toda ruta autenticada, garantizando que cambiar de tema, navegar entre secciones, o que un error no controlado ocurra en cualquier pantalla, se comporten de forma consistente y accesible en todo el producto.

**SLA de rendimiento:**
- El chrome de navegación (nav/tab-bar) se renderiza como parte del Server Component raíz — no depende de JS para decidir qué variante mostrar (ver §2.3, evita *layout shift* y desajuste de hidratación).
- Resolución de tema pre-paint (hereda el requisito de spec 00 §1 — cero FOUC).
- El resaltado del ítem de navegación activo se actualiza en el mismo frame del cambio de ruta (usa `usePathname()`, no estado derivado de un efecto con delay).

---

## 2. Contratos

### 2.1 Providers globales (`src/app/providers.tsx`)

```ts
// Client Component — único punto donde se instancian providers de librería
interface AppProvidersProps {
  children: React.ReactNode;
}
export function AppProviders({ children }: AppProvidersProps): JSX.Element;
```

Compone, en este orden: `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`) → `QueryClientProvider` (instancia única vía `useState(() => new QueryClient(defaultQueryClientConfig))`, nunca recreada entre renders) → `TooltipProvider` (Radix, requerido por varios componentes shadcn) → `children` → `Toaster` (sonner, posicionado `bottom-center` en mobile / `bottom-right` en desktop).

```ts
// src/lib/api/queryClient.ts
export const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false }, // consistente con "no reintentos automáticos" de spec 01 §1
  },
};
```

### 2.2 Navegación (`src/config/navigation.ts` + componentes)

```ts
interface NavItem {
  href: '/wardrobe' | '/outfits' | '/try-on' | '/profile';
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[]; // exactamente 4 ítems, fijado por frontend-plan.md §2.1 — no se agrega un 5º sin actualizar esa decisión primero
```

```ts
// src/components/shell/TopNav.tsx — visible solo en lg+ (≥1024px)
// src/components/shell/BottomTabBar.tsx — visible solo en <1024px
// Ambos reciben las mismas NAV_ITEMS, sin props adicionales — el estado activo se deriva
// internamente de usePathname(), no se pasa por props.
```

### 2.3 Regla de renderizado adaptativo [Decisión de diseño, crítica]

**Ambas variantes de navegación se renderizan siempre en el DOM**, alternando visibilidad vía clases Tailwind responsivas (`hidden lg:flex` en `TopNav`, `flex lg:hidden` en `BottomTabBar`) — **nunca** mediante detección de `window.innerWidth` en JS. Esto evita por construcción cualquier desajuste de hidratación SSR/CSR y layout shift al cargar.

### 2.4 Error boundary global (`src/app/error.tsx`)

```ts
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element;
```

Debe distinguir por `instanceof` (jerarquía de `CLAUDE.md` §5, spec 01 §2.1) y mostrar copy específico:

| Tipo de error | Copy | Acción ofrecida |
| :--- | :--- | :--- |
| `ApiError` | "Hubo un problema con el servidor. Inténtalo de nuevo." | Botón `reset()` |
| `NetworkError` | "No pudimos conectarnos. Revisa tu conexión." | Botón `reset()` |
| `ValidationError` | "Recibimos una respuesta inesperada del servidor." | Botón `reset()` + no mostrar detalles técnicos al usuario final |
| Cualquier otro `Error` | Copy genérico ("Algo salió mal") | Botón `reset()` |

Nota: `VtonJobTimeoutError` no debería llegar nunca a este boundary global (se maneja localmente en spec 04 `VtonTimeoutView`); si llegara aquí por un bug, cae en la rama "cualquier otro `StyleMeError`" con copy genérico — no se le da tratamiento especial en este nivel para no duplicar lógica de spec 04.

### 2.5 `src/app/not-found.tsx`

Estático, sin lógica — ilustración + link a `/wardrobe` (o `/` si no autenticado).

### 2.6 Accesibilidad — skip link (`src/components/shell/SkipToContentLink.tsx`)

```ts
// Sin props. Visualmente oculto hasta recibir foco (clase sr-only focus:not-sr-only).
// href="#main-content"; app/layout.tsx envuelve el children en <main id="main-content" tabIndex={-1}>.
```

Primer elemento enfocable del `<body>` — antes que cualquier ítem de navegación.

---

## 3. Flujo de Datos Interno

### 3.1 Orden de montaje del layout raíz

```
<html data-theme=... (script inline pre-hidratación, evita FOUC — hereda spec 00 §3)>
  <body>
    <SkipToContentLink />
    <AppProviders>
      <TopNav />          ← hidden por CSS en <lg
      <main id="main-content" tabIndex={-1}>
        {children}         ← contenido de cada ruta (specs 02-04, 06, 07)
      </main>
      <BottomTabBar />     ← hidden por CSS en ≥lg
      <Toaster />
    </AppProviders>
  </body>
</html>
```

### 3.2 Resaltado de navegación activa

```
Cambio de ruta (Next.js App Router, client-side navigation)
        │
        v
usePathname() actualiza en TopNav/BottomTabBar (mismo render que el cambio de ruta)
        │
        v
NavItem cuyo href === pathname (o pathname.startsWith(href) para sub-rutas,
ej. /wardrobe/upload activa el ítem "Armario")
        │
        v
aria-current="page" + estilo visual distinto (no solo color — también peso de fuente/ícono
relleno vs. outline, para no depender solo de contraste de color)
```

### 3.3 Captura de error no controlado

```
Componente hijo lanza un error durante render/efecto
        │
        v
Next.js App Router monta el error.tsx más cercano en el árbol de rutas
        │
        v
GlobalError recibe `error` ──► rama por instanceof (§2.4) ──► copy + reset()
        │
        v
Usuario click "Reintentar" ──► reset() ──► Next.js reintenta renderizar el segmento
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- Lógica de "ruta activa" extraída a una función pura `isNavItemActive(pathname: string, href: string): boolean`, testeada con casos exactos y de sub-ruta (`/wardrobe/upload` → activa `/wardrobe`).

**Integración (Vitest + RTL):**
- `TopNav`/`BottomTabBar`: renderizan los 4 `NAV_ITEMS` exactos; el ítem correspondiente a un `pathname` mockeado (`next/navigation` `usePathname` mock) tiene `aria-current="page"`, los demás no.
- `GlobalError`: se le pasa una instancia de cada subclase de `StyleMeError` (importadas de spec 01) y una `Error` genérica → verificar que el copy renderizado corresponde exactamente a la tabla de §2.4 (5 casos).
- `GlobalError`: click en "Reintentar" invoca `reset` exactamente una vez.
- `SkipToContentLink`: es el primer elemento con `tabIndex` alcanzable por `Tab` desde el inicio del documento (test con `userEvent.tab()`).
- `AppProviders`: `QueryClient` no se recrea entre re-renders del componente padre (se verifica con una referencia estable capturada en un mock/spy).

**E2E (Playwright):**
- Redimensionar el viewport de mobile a desktop dentro de la misma sesión (sin reload) → `BottomTabBar` desaparece y `TopNav` aparece sin error de consola ni parpadeo.
- Navegar entre las 4 secciones vía teclado únicamente (Tab + Enter) desde el skip link.
- Forzar un error en una ruta de prueba → `error.tsx` se muestra con el copy correcto y `reset()` recupera la vista.

---

## 5. Criterios de Aceptación

- [ ] `AppProviders` instancia cada provider exactamente una vez por sesión de la app (no por render).
- [ ] `TopNav` y `BottomTabBar` alternan visibilidad solo por CSS responsivo — cero JS de detección de viewport.
- [ ] Navegación activa usa `aria-current="page"` y una señal visual no dependiente exclusivamente de color.
- [ ] `GlobalError` cubre los 5 casos de la tabla de §2.4 con copy distinto y verificado por test.
- [ ] `SkipToContentLink` es funcional por teclado y es el primer elemento enfocable de la página.
- [ ] Cambiar de tema no produce parpadeo visible (regresión del criterio de spec 00, verificado aquí a nivel de layout completo).
- [ ] Cobertura de tests ≥ 80% en `src/components/shell/` y `src/app/providers.tsx`.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Manifiesto de Archivos

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
tests/e2e/navigation.spec.ts
```
