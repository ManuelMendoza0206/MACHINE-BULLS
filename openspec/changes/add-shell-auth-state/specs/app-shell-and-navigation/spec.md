## ADDED Requirements

### Requirement: Estado de sesión en el shell

`src/components/shell/TopNav.tsx` SHALL consumir `useAuth()` (contrato de `spec 06` §2.2) y
reflejar sus tres estados sin modificar el hook. Cuando `status === 'authenticated'` muestra la
identidad del usuario y un control de cierre de sesión; en `loading` no renderiza nada de sesión;
en `unauthenticated` no renderiza nada de sesión.

`BottomTabBar` SHALL NOT alojar acciones de sesión — es una tab bar de exactamente 4 secciones
(`NAV_ITEMS`) y en viewport `< lg` la identidad del usuario vive en `/profile`, que ya figura en
la navegación.

#### Scenario: Sesión resuelta — el shell muestra identidad y cierre de sesión

- **WHEN** `useAuth()` devuelve `status === 'authenticated'` con `user` no nulo
- **THEN** `TopNav` renderiza el nombre del usuario —`user.name`, o `user.email` cuando `name` es
  `null`, nunca cadena vacía— junto a un control que invoca `signOut()`; verificado por un test de
  integración que monta el componente dentro de `AuthProvider`

#### Scenario: Sesión en carga — sin UI de sesión

- **WHEN** `useAuth()` devuelve `status === 'loading'`
- **THEN** `TopNav` no renderiza identidad ni control de cierre de sesión, evitando el
  parpadeo de layout al resolverse la sesión; verificado por un test de integración que afirma la
  ausencia del control de cierre de sesión

#### Scenario: Sin sesión — el shell no ofrece cerrar sesión

- **WHEN** `useAuth()` devuelve `status === 'unauthenticated'`
- **THEN** `TopNav` no renderiza identidad ni control de cierre de sesión, y la navegación de 4
  ítems permanece idéntica; verificado por un test de integración

#### Acceptance Criteria

- [ ] `useAuth()` se invoca desde `TopNav` sin cambiar su firma ni `AuthContextValue`
- [ ] `BottomTabBar` y `NAV_ITEMS` quedan sin modificar (siguen siendo 4 ítems)
- [ ] Ningún estado renderiza identidad de usuario como cadena vacía
- [ ] El control de cierre de sesión es alcanzable por teclado y expone nombre accesible
- [ ] `TopNav` mantiene sus 2 tests preexistentes en verde (4 ítems, `aria-current` con señal no-cromática)