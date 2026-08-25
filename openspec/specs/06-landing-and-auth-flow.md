# Spec 06 — Landing Page & Auth Flow

**Estado:** Draft para implementación · **Depende de:** spec 00 (design system) · **Consumido por:** spec 05 (middleware protege las rutas que envuelve el shell), spec 07 (contrato `useAuth()`)

Deriva de `docs/frontend-plan.md` §4.1 (Landing), §3.1 (entrada al onboarding), `base-plan.MD` §10.1 (entidad `User`). Cubre `/` (pública), `/login`, `/signup`.

---

## 1. Propósito y SLA

**Propósito:** comunicar la propuesta de valor de StyleMe en la landing, y proveer autenticación mínima viable (email + contraseña, con espacio para OAuth futuro) delegada a **Supabase Auth**.

### 1.1 Decisión de proveedor de autenticación [Decisión de diseño, confirmada]

Se usa **Supabase Auth** en vez de una implementación de credenciales propia. Justificación:
1. `base-plan.MD` §10.1 define `User` sin `password_hash` — indica que el backend no está diseñado para verificar credenciales él mismo.
2. `base-plan.MD` §6.1 ya compromete el stack a **PostgreSQL + pgvector** — exactamente la combinación que Supabase provee de forma gestionada (Postgres + pgvector + Auth + Storage), lo que minimiza infraestructura adicional a coordinar con el equipo backend.
3. Provee out-of-the-box: verificación de email, recuperación de contraseña, y una ruta directa a OAuth (Google, etc.) sin trabajo adicional de frontend cuando se decida habilitarlo.

**SLA de rendimiento:**
- `/` es un Server Component 100% estático — sin llamadas de red, LCP objetivo < 2.5s (hereda `frontend-plan.md` §9).
- Verificación de sesión (¿autenticado o no?) no debe bloquear el primer paint de `/`: la landing se muestra igual para ambos casos, con el CTA adaptando su destino (`/signup` vs `/wardrobe`) tras hidratar.
- Login/signup: feedback de error (credenciales inválidas, email ya registrado) visible en < 500ms tras la respuesta de Supabase — sin spinners genéricos sin contexto.

---

## 2. Contratos

### 2.1 Cliente Supabase (`src/lib/supabase/`)

```ts
// src/lib/supabase/client.ts — para uso en Client Components
export function createBrowserSupabaseClient(): SupabaseClient;

// src/lib/supabase/server.ts — para uso en Server Components / middleware
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies): SupabaseClient;
```
Vía `@supabase/ssr`, siguiendo el patrón oficial de cookies para Next.js App Router (necesario para que la sesión sea legible tanto en servidor como en cliente sin desincronización).

### 2.2 Contrato `useAuth()` (`src/features/auth/hooks/useAuth.ts`) — consumido por specs 05 y 07

```ts
interface AuthUser {
  id: string;       // Supabase auth.users.id — ver nota de reconciliación en §6
  email: string;
  name: string | null;
}

interface UseAuthResult {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult;
```
Internamente suscrito a `supabase.auth.onAuthStateChange`, sincronizado con el `AuthProvider` de nivel raíz (§2.5).

### 2.3 Schemas de formularios (`src/schemas/auth.ts`)

```ts
export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
export type SignupForm = z.infer<typeof SignupFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;
```
Validación client-side antes de invocar Supabase — reduce round-trips por errores de forma evidentes (campo vacío, email mal formado).

### 2.4 Funciones de auth (`src/features/auth/api/`)

```ts
export async function signUpWithEmail(form: SignupForm): Promise<AuthUser>;
export async function signInWithEmail(form: LoginForm): Promise<AuthUser>;
export async function signOut(): Promise<void>;
```
Traducen errores de Supabase (`AuthApiError`) a `ApiError` (spec 01 §2.1) con mensajes localizados — nunca se propaga el error crudo de Supabase a la UI.

### 2.5 `AuthProvider` (`src/features/auth/components/AuthProvider.tsx`)

```ts
interface AuthProviderProps { children: React.ReactNode; }
export function AuthProvider({ children }: AuthProviderProps): JSX.Element;
```
Se monta dentro de `AppProviders` (spec 05 §2.1, orden: `ThemeProvider` → `QueryClientProvider` → `AuthProvider` → `TooltipProvider`) — expone el estado que consume `useAuth()`.

### 2.6 Middleware de protección de rutas (`src/middleware.ts`)

```ts
export const config = {
  matcher: ['/wardrobe/:path*', '/outfits/:path*', '/try-on/:path*', '/profile/:path*'],
};
export async function middleware(request: NextRequest): Promise<NextResponse>;
```
Verifica sesión vía `createServerSupabaseClient`; sin sesión válida → `redirect('/login?redirectTo=' + pathname)`. `/`, `/login`, `/signup` quedan explícitamente fuera del matcher (públicas).

### 2.7 Componentes de página

```ts
// src/app/page.tsx — Server Component estático (Landing)
// src/app/login/page.tsx, src/app/signup/page.tsx — Client Components (formularios)

// src/features/auth/components/AuthForm.tsx
interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess: (user: AuthUser) => void;
}
```

---

## 3. Flujo de Datos Interno

### 3.1 Secuencia — Signup

```
Usuario completa AuthForm (mode="signup")
        │
        v
SignupFormSchema.safeParse(input) ──► inválido ──► errores inline por campo
        │ válido
        v
signUpWithEmail(form) ──► supabase.auth.signUp({ email, password, options: { data: { name } } })
        │
        ├─ error (email ya registrado, password débil, etc.)
        │       └─► ApiError traducido ──► mensaje inline en el formulario
        │
        └─ success ──► sesión de Supabase creada (auth.users)
                │
                v
        [GAP — ver §6] reconciliación con la tabla `User` propia del backend
        (base-plan.MD §10.1) — requiere que exista una fila correspondiente
        con el mismo id antes de que /garments/upload u /outfits/recommend
        puedan asociar datos a este usuario
                │
                v
        onSuccess(user) ──► router.push('/onboarding')  [entra a spec 02]
```

### 3.2 Secuencia — Login

```
AuthForm (mode="login") ──► LoginFormSchema válido ──► signInWithEmail(form)
        │
        ├─ error (credenciales inválidas) ──► mensaje inline genérico
        │   ("Email o contraseña incorrectos" — nunca revelar cuál de los dos
        │   es incorrecto, práctica estándar de seguridad)
        │
        └─ success ──► onSuccess(user) ──► router.push(redirectTo ?? '/wardrobe')
                        (redirectTo viene del query param que fijó el middleware
                        si el usuario fue interceptado intentando entrar a una
                        ruta protegida sin sesión)
```

### 3.3 Secuencia — Protección de rutas (middleware)

```
Request a /wardrobe (o cualquier ruta del matcher)
        │
        v
middleware ──► createServerSupabaseClient(cookies) ──► supabase.auth.getUser()
        │
        ├─ sin sesión válida ──► redirect('/login?redirectTo=/wardrobe')
        └─ sesión válida ──► NextResponse.next() (continúa a la ruta solicitada)
```

### 3.4 Landing (`/`)

```
Render estático (Server Component) — hero, propuesta de valor (3 bloques), CTA
        │
        v
CTA "Empezar" — Client Component delgado que lee useAuth().status tras hidratar:
        ├─ 'authenticated' ──► href="/wardrobe"
        └─ 'unauthenticated' | 'loading' ──► href="/signup" (default seguro)
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- `SignupFormSchema`/`LoginFormSchema`: casos válidos e inválidos por campo (email malformado, password < 8 chars, nombre vacío).
- Traducción de errores Supabase → `ApiError`: dado un `AuthApiError` mock con distintos códigos (`invalid_credentials`, `user_already_exists`), verificar el mensaje localizado correspondiente.

**Integración (Vitest + RTL, con el cliente Supabase mockeado — no se golpea la red real de Supabase en tests):**
- `AuthForm` (signup): submit válido → `onSuccess` llamado con el `AuthUser` esperado.
- `AuthForm` (signup): Supabase mock rechaza con "email ya registrado" → mensaje inline visible, `onSuccess` NO se llama.
- `AuthForm` (login): credenciales inválidas → mensaje genérico (verificar que el texto NO distingue "email no existe" de "password incorrecta").
- `useAuth`: transiciones `loading → authenticated` y `loading → unauthenticated` reflejadas correctamente al resolver `onAuthStateChange` mockeado.
- Landing CTA: con `useAuth` mockeado en cada estado, verificar el `href` resultante del CTA principal.

**E2E (Playwright, contra un proyecto Supabase de test/staging — no producción):**
- Signup completo → redirige a `/onboarding`.
- Login con credenciales válidas → redirige a la ruta protegida originalmente solicitada (verificar el flujo completo de `redirectTo`).
- Intentar acceder a `/wardrobe` sin sesión → redirige a `/login` con el `redirectTo` correcto en la URL.
- Logout (spec 07) desde `/profile` → intento posterior de acceder a `/wardrobe` vuelve a redirigir a `/login`.

**Casos borde:**
- Doble submit del formulario (usuario hace doble click) — el botón debe deshabilitarse durante el estado `pending` de la mutación, evitando dos `signUp` concurrentes.
- Sesión expirada mientras el usuario navega (token vencido) — el middleware la detecta en la siguiente navegación protegida y redirige a `/login`; no se asume un mecanismo de refresh silencioso más allá del que Supabase SSR provee por defecto.

---

## 5. Criterios de Aceptación

- [ ] `useAuth()` implementado exactamente con el contrato de §2.2, consumido sin cambios por spec 05 (nav condicional futura si aplica) y spec 07.
- [ ] Middleware protege las 4 rutas del matcher de §2.6 y ninguna otra (Landing/login/signup permanecen públicas).
- [ ] Mensajes de error de login nunca distinguen "usuario no existe" de "contraseña incorrecta" (verificado por test).
- [ ] Formularios deshabilitan su botón de submit durante el estado pendiente (previene doble submit).
- [ ] `signUpWithEmail`/`signInWithEmail`/`signOut` nunca propagan un error crudo de Supabase a un componente — siempre `ApiError` traducido.
- [ ] Landing (`/`) no realiza ninguna llamada de red bloqueante; CTA se adapta post-hidratación según sesión.
- [ ] Cobertura de tests ≥ 85% en `src/features/auth/` (superficie de seguridad, estándar más alto que el resto del frontend).
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde.

---

## 6. Gap Explícito (crítico, bloqueante para integración real)

`base-plan.MD` §10.1 define una tabla `User` propia del backend (`id, email, name, created_at`), separada de `auth.users` de Supabase. **Ningún endpoint en §11 sincroniza ambas.** Debe resolverse con el equipo backend antes de que el signup real funcione end-to-end — dos alternativas, ninguna implementada aún en esta spec:

1. **Trigger a nivel de base de datos:** dado que ambos (backend y Supabase Auth) comparten el mismo Postgres, un trigger en `auth.users` (`AFTER INSERT`) inserta automáticamente la fila correspondiente en la tabla `User` del backend con el mismo `id`. Preferible: cero llamadas adicionales desde el frontend, consistencia garantizada a nivel de DB.
2. **Endpoint de sincronización explícito** (`POST /api/v1/users/sync`, no listado en `base-plan.MD` §11): el frontend lo invoca una vez tras `onSuccess` del signup, antes de redirigir a `/onboarding`.

Mientras no se confirme cuál, `signUpWithEmail` (§2.4) debe implementarse de forma que ambas alternativas sean *swappable* sin tocar `AuthForm`: la reconciliación es responsabilidad exclusiva de la función de API, no del componente.
