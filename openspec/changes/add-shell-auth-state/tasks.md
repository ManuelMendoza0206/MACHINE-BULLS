## 1. Especificación

- [ ] 1.1 Crear `openspec/changes/add-shell-auth-state/{proposal,design,tasks}.md` + delta en `specs/app-shell-and-navigation/spec.md` — verificado que los archivos existen
- [ ] 1.2 Agregar el Requirement "Estado de sesión en el shell" a `openspec/specs/frontend/app-shell-and-navigation/spec.md` con los 3 escenarios (`loading` / `authenticated` / `unauthenticated`) + 5 Acceptance Criteria
- [ ] 1.3 Actualizar `## Estrategia de pruebas` de la spec para mencionar los 3 escenarios de sesión en `TopNav`
- [ ] 1.4 Declarar en el Requirement que `BottomTabBar` no aloja acciones de sesión y que en viewport `< lg` la sesión vive en `/profile`

## 2. Implementación

- [ ] 2.1 `TopNav.tsx`: invocar `useAuth()` y desestructurar `{ user, status, signOut }` — sin tocar `useAuth.ts` ni `AuthProvider`
- [ ] 2.2 `authenticated`: renderizar `user.name ?? user.email` + control de cierre de sesión que invoca `signOut()`, en el slot `ml-auto` junto al `ThemeToggle`
- [ ] 2.3 `loading` y `unauthenticated`: no renderizar identidad ni control de sesión
- [ ] 2.4 Verificar que `BottomTabBar.tsx` y `src/config/navigation.ts` quedaron sin modificar (`git diff --stat`)

## 3. Tests

- [ ] 3.1 `tests/integration/shell/TopNav.test.tsx`: montar dentro de `AuthProvider` con Supabase mockeado (hoy renderiza pelado, lo que devuelve el contexto por defecto y no ejercita la sesión)
- [ ] 3.2 Caso `authenticated`: identidad visible + control de cierre de sesión invoca `signOut`
- [ ] 3.3 Caso `loading`: sin identidad y sin control de sesión
- [ ] 3.4 Caso `unauthenticated`: sin identidad y sin control de sesión
- [ ] 3.5 Los 2 tests preexistentes (4 ítems, `aria-current` con señal no-cromática) siguen en verde

## 4. Verificación

- [ ] 4.1 `npm run typecheck` en verde
- [ ] 4.2 `npm run lint` en verde, sin warnings nuevos
- [ ] 4.3 `npm run test` en verde
- [ ] 4.4 `npm run test:e2e` en verde
- [ ] 4.5 `npm run build` en verde