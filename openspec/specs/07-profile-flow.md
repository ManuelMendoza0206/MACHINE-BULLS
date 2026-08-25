# Spec 07 — Profile Flow

**Estado:** Draft para implementación · **Depende de:** spec 00, spec 01, spec 05, spec 06 (`useAuth()`, Supabase Auth) · **Consumido por:** spec 03 (lee `defaultAesthetic` como filtro inicial)

Deriva de `docs/frontend-plan.md` §4.9. Cubre la ruta `/profile`.

---

## 1. Propósito y SLA

**Propósito:** mostrar los datos del `User` autenticado, permitir fijar una estética por defecto que prefiltra `/outfits` (spec 03 §2.1), y cerrar sesión.

**SLA de rendimiento:**
- Los datos de perfil provienen de la sesión ya resuelta por el shell (spec 05/06) — `/profile` no dispara una llamada de red adicional para mostrar `email`/`name`.
- Cambiar la estética por defecto se refleja de inmediato en el `localStorage` local (sin latencia de red, ver gap §6) y está disponible para `useRecommendOutfits` (spec 03) en la siguiente visita a `/outfits` sin necesidad de recargar.

---

## 2. Contratos

### 2.1 Preferencias de perfil (`src/features/profile/lib/profilePreferences.ts`)

```ts
export function getDefaultAesthetic(userId: string): string | null;
export function setDefaultAesthetic(userId: string, aesthetic: string | null): void;
```
Almacenamiento: `localStorage`, clave `styleme:profile:${userId}:defaultAesthetic`. Ver gap §6 — solución interina hasta que el backend soporte este campo.

### 2.2 Hook de preferencias (`src/features/profile/hooks/useProfilePreferences.ts`)

```ts
interface UseProfilePreferencesResult {
  defaultAesthetic: string | null;
  setDefaultAesthetic: (aesthetic: string | null) => void;
}
export function useProfilePreferences(): UseProfilePreferencesResult;
```
Internamente usa `useAuth().user.id` (contrato de spec 06) para derivar la clave de `localStorage`; si `user` es `null` (no debería ocurrir dentro de una ruta protegida, pero se maneja defensivamente), retorna `defaultAesthetic: null` y `setDefaultAesthetic` es un no-op con `console.warn` en desarrollo.

### 2.3 Componentes

```ts
// src/features/profile/components/ProfileHeader.tsx
interface ProfileHeaderProps {
  name: string;
  email: string;
  createdAt: string; // ISO date, formateado como "Miembro desde {mes año}"
}
// Solo lectura — no hay endpoint de actualización de User en base-plan.MD §11 (ver gap §6)

// src/features/profile/components/DefaultAestheticSelector.tsx
interface DefaultAestheticSelectorProps {
  value: string | null;
  onChange: (aesthetic: string | null) => void;
  availableAesthetics: string[]; // mismo origen que OutfitFilterBar (spec 03 §2.3)
}

// src/features/profile/components/SignOutButton.tsx
// Sin props — usa useAuth().signOut() internamente, variant="destructive" (shadcn Button),
// requiere confirmación (Dialog, spec 00 §2.4) antes de ejecutar — evita cierre de sesión accidental
```

---

## 3. Flujo de Datos Interno

### 3.1 Secuencia — carga de `/profile`

```
/profile monta
        │
        v
useAuth() ──► status: 'loading' ──► Skeleton de ProfileHeader
        │
        ├─ status: 'unauthenticated' ──► redirect a /login (middleware de spec 06,
        │                                  esta pantalla asume que ya fue interceptado
        │                                  antes de montar — defensivo únicamente)
        │
        └─ status: 'authenticated', user: {id, email, name}
                │
                v
        ProfileHeader renderiza datos directamente de la sesión (sin fetch adicional)
                │
                v
        useProfilePreferences() lee localStorage[user.id] ──► DefaultAestheticSelector
        con el valor actual preseleccionado
```

### 3.2 Secuencia — cambio de estética por defecto

```
Usuario selecciona nueva estética en DefaultAestheticSelector
        │
        v
onChange(aesthetic) ──► useProfilePreferences().setDefaultAesthetic(aesthetic)
        │
        v
localStorage actualizado + toast de confirmación ("Preferencia guardada")
        │
        v
Próxima visita a /outfits ──► useOutfitFilters (spec 03 §2.2) inicializa
targetAesthetic desde getDefaultAesthetic(user.id) SOLO si la URL no trae
ya un filtro explícito (los query params de la URL siempre tienen prioridad
sobre la preferencia guardada)
```

### 3.3 Secuencia — cierre de sesión

```
Click "Cerrar sesión" ──► Dialog de confirmación
        │
        ├─ Cancelar ──► cierra el diálogo, sin efecto
        │
        └─ Confirmar ──► useAuth().signOut()
                            │
                            v
                    onboardingStore.reset() (spec 02 §2.1 — limpia estado
                    residual de sesión anterior) + router.push('/')
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- `getDefaultAesthetic`/`setDefaultAesthetic`: roundtrip correcto; aislamiento por `userId` (dos usuarios distintos no comparten clave); `getDefaultAesthetic` para un usuario sin preferencia guardada retorna `null` (no lanza, no retorna `undefined`).

**Integración (Vitest + RTL):**
- `ProfileHeader`: renderiza `name`, `email`, y `createdAt` formateado correctamente (fixture con fecha ISO conocida).
- `DefaultAestheticSelector`: seleccionar una opción llama a `onChange` con el valor correcto; valor `null` (des-seleccionar) también soportado.
- `useProfilePreferences`: con `useAuth` mockeado a `status: 'unauthenticated'`, `setDefaultAesthetic` no lanza y emite warning (no crash silencioso ni error no controlado).
- `SignOutButton`: requiere confirmación — click inicial NO llama a `signOut()`; solo el botón de confirmación dentro del `Dialog` lo hace.
- Integración cross-spec: guardar una estética en `/profile` y luego montar `useOutfitFilters` (spec 03) sin query params en la URL → el filtro inicial refleja la preferencia guardada.

**E2E (Playwright):**
- Flujo completo: login mock → `/profile` → cambiar estética por defecto → navegar a `/outfits` sin filtros explícitos en URL → verificar que el filtro aplicado corresponde a la preferencia.
- Cierre de sesión: confirmar en el diálogo → redirige a `/` → intentar acceder a `/wardrobe` directamente → redirige a `/login` (verifica que la sesión efectivamente se cerró).

---

## 5. Criterios de Aceptación

- [ ] `/profile` no dispara ninguna llamada de red para mostrar `name`/`email`/`createdAt` — se sirve 100% de la sesión ya resuelta.
- [ ] Preferencia de estética por defecto persiste en `localStorage`, aislada por `userId`, y se lee correctamente en `/outfits` cuando no hay filtro explícito en la URL.
- [ ] Los query params de `/outfits` siempre tienen prioridad sobre la preferencia guardada (comportamiento verificado en test de integración cross-spec).
- [ ] `SignOutButton` exige confirmación explícita antes de invocar `useAuth().signOut()`.
- [ ] Cierre de sesión limpia también el estado de `onboardingStore` (spec 02) para evitar fugas de estado entre sesiones de usuarios distintos en el mismo navegador.
- [ ] `ProfileHeader` no expone ningún control de edición de `name`/`email` (coherente con el gap de §6 — no se simula una funcionalidad que no puede persistir).
- [ ] Cobertura de tests ≥ 80% en `src/features/profile/`.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Gaps Explícitos

1. **Sin endpoint de actualización de `User`:** `base-plan.MD` §11 no define ningún `PATCH`/`PUT` sobre `User`. Por eso `ProfileHeader` es deliberadamente de solo lectura — implementar campos editables de nombre/email sin backend que los persista violaría la regla de "cero código funcional sin contrato real" de `CLAUDE.md`.
2. **`defaultAesthetic` no existe en el schema de `User`** (`base-plan.MD` §10.1 solo lista `id, email, name, created_at`). Se implementa como preferencia **local al navegador** (`localStorage`), explícitamente no sincronizada entre dispositivos. **Acción de seguimiento:** si el backend agrega este campo a `User`, esta spec debe actualizarse para leer/escribir vía API en vez de `localStorage`, y esa migración debe preservar (no descartar) el valor ya guardado localmente en el primer sync.
3. Esta spec consume `useAuth()` tal como lo implementa spec 06 (Supabase Auth) — sin lógica de proveedor propia aquí, solo el contrato.
