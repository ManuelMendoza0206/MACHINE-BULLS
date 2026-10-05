# Estado de sesión en el shell

## Why

`openspec/specs/frontend/profile-flow/spec.md` §1.1 dice, literalmente:

> Los datos de perfil provienen de la sesión ya resuelta por el shell (spec 05/06) — `/profile`
> no dispara una llamada de red adicional para mostrar `email`/`name`.

Esa frase pone una dependencia explícita: el shell resuelve la sesión. Pero
`openspec/specs/frontend/app-shell-and-navigation/spec.md` — los 5 Requirements que tiene hoy
(providers globales, navegación adaptativa, ruta activa, manejo de errores, skip link) — **no
define ningún requisito de estado de sesión**. No hay un solo `useAuth`, `session` ni `signOut` en
todo el documento.

La consecuencia es verificable en el código: `src/components/shell/TopNav.tsx` importa
`usePathname`, `NAV_ITEMS`, `isNavItemActive`, `cn` y `ThemeToggle`. No consume `useAuth()`. El
shell no muestra quién está conectado ni ofrece cerrar sesión.

`profile-flow` es el segundo consumidor que `dq7` (`useAuth()` consumido sin cambios por app-shell
y profile-flow) exige. `profile-flow` es Sprint 7 y depende de un requisito que nadie escribió.
Mientras tanto el shell — el único componente de navegación que existe hoy — no lo consume.

Este cambio cierra ese hueco de especificación. No es una mejora estética: es la pieza que falta
para que una promesa ya escrita en otra spec sea cumplible.

## What Changes

- Se agrega el Requirement **"Estado de sesión en el shell"** a `app-shell-and-navigation`,
  con tres escenarios verificables: `loading`, `authenticated`, `unauthenticated`.
- Se define explícitamente que `BottomTabBar` **no** aloja acciones de sesión (es una tab bar de 4
  secciones), y que en viewport chico la sesión vive en `/profile` — cerrando el hueco para que
  nadie interprete "el shell" como "los dos componentes de navegación".
- Se actualiza `## Estrategia de pruebas` de la spec para cubrir los tres escenarios.
- Se implementa el Requirement en `TopNav.tsx` consumiendo `useAuth()` **sin modificar el hook**.
- Se agregan los tres casos de test al archivo de integración existente.

**BREAKING:** ninguno. `useAuth()` no cambia de firma; `AppProviders` ya monta `AuthProvider` en
el layout raíz; `BottomTabBar` y `NAV_ITEMS` quedan intactos.

## Capabilities

### Modified Capabilities

- `frontend/app-shell-and-navigation`: se agrega el Requirement de estado de sesión y se delimita
  qué componente del shell aloja acciones de sesión.

### Fuera de alcance

- **`profile-flow` no se implementa.** `src/app/profile/page.tsx` sigue siendo el stub que declara
  que esa spec es su dueña. Este cambio solo asegura que el contrato que profile-flow va a
  consumir ya esté especificado y disponible.
- **Diálogo de confirmación de cierre de sesión.** `profile-flow/spec.md` §1 lo exige para su
  propio botón. Este cambio **no** lo replica en el shell: el design system de Sprint 1 no tiene
  primitivo `Dialog` (`src/components/ui/` tiene `badge`, `button`, `card`, `progress`, `skeleton`),
  y replicar el patrón allí ampliaría el alcance del epic por un componente que nadie pidió.