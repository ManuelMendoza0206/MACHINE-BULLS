## Context

Ver `proposal.md` — la spec 05 nunca definió el requisito de sesión que la spec 07 ya da por
hecho. Este documento cubre cómo se materializa: qué estados se renderizan, qué componente los
aloja y por qué `useAuth()` no se toca.

## Goals / Non-Goals

**Goals:**

- Que el shell sea un consumidor real y verificable del contrato `useAuth()` de la spec 06, sin
  modificar ese contrato.
- Que los tres estados (`loading` / `authenticated` / `unauthenticated`) tengan comportamiento
  explícito y testeado, incluido el caso molesto: no renderizar nada mientras carga.
- Que quede escrito dónde vive la sesión en viewport chico, para que `profile-flow` no tenga que
  adivinarlo ni el shell.next duplicarlo.

**Non-Goals:**

- No se implementa `profile-flow` ni se toca `src/app/profile/page.tsx`.
- No se agrega primitivo `Dialog` al design system.
- No se cambia `useAuth()`, `AuthProvider` ni `AuthContextValue`.
- No se agregan ítems a `NAV_ITEMS` — sigue siendo exactamente 4.

## Decisions

**D1 — La sesión se muestra en `TopNav`, no en `BottomTabBar`.**
`BottomTabBar` es una tab bar con exactamente 4 secciones y `aria-current` sobre la ruta activa.
 meterle nombre de usuario y un botón de cerrar sesión mezcla acciones de sesión con secciones de
navegación, y en 360 px de ancho no cabe sin romper el layout. Además `/profile` ya está en
`NAV_ITEMS` con icono `User`: en viewport chico el camino natural hacia la sesión ya existe.
Alternativa considerada: un menú desplegable de usuario en la esquina superior derecha — descartada
porque no hay primitivo de dropdown ni de avatar en el design system, y construirlo sería alcance
de otro epic.

**D2 — `loading` no renderiza nada de sesión.**
Si durante `loading` se renderizara un placeholder o un nombre vacío, el usuario ve un cambio de
layout al resolverse la sesión en cada carga de página. No renderizar nada hace que la UI de
sesión aparezca sin parpadeo. Costo: durante `loading` hay menos elementos en el header, lo cual es
preferible a un reflow.

**D3 — El nombre del usuario cae a `email` cuando `name` es `null`.**
`AuthUser.name` es `string | null`. Un usuario de Google puede no traer nombre. Mostrar el email
siempre es mejor que renderizar un string vacío que empuja el layout. No se pide nombre adicional
al usuario: eso sería una historia de onboarding que no existe.

**D4 — `BottomTabBar` queda sin tocar, pero el Requirement lo dice.**
El riesgo real de D1 no es técnico, es que alguien lea "el shell" y extienda `BottomTabBar` por
inercia. Declarar en el Requirement que la tab bar no aloja acciones de sesión convierte una
decisión en algo verificable.

**D5 — El test se monta dentro de `AuthProvider`, no mockeando `useAuth`.**
El archivo de test existente renderiza `TopNav` pelado. Mockear el hook probaría que el componente
pinta lo que le pasan; montarlo con `AuthProvider` y Supabase mockeado prueba que el hook entrega
la sesión y el componente la consume. Es el mismo nivel de exigencia que ya usa
`tests/integration/garments/PhotoConsentGate.test.tsx` con su store real.

## Riesgos

- **`profile-flow` (Sprint 7) podría pedir confirmación antes de cerrar sesión** en el shell
  también. Si aparece ese requisito, es un delta de esta misma spec, no un rediseño: se agrega el
  primitivo `Dialog` cuando exista y se replica el patrón de `profile-flow/spec.md` §1.
- **Toca un epic de otro dueño.** `frontend/app-shell-and-navigation` es de Leonardo (Sprint 1,
  Asiento A). El AC de `dq7` obliga a consumir `useAuth()` desde el shell, así que el trabajo es de
  `dq7`, pero el cambio de archivo le corresponde a él y conviene que lo sepa antes de la revisión.