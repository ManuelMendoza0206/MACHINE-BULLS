# Spec 00 — Design System

**Estado:** Draft para implementación · **Depende de:** ninguna · **Consumido por:** todas las specs de UI (02, 03, 04)

Deriva de `docs/frontend-plan.md` §5 y `CLAUDE.md` §2, §6. Establece los tokens, utilidades y componentes base de shadcn/ui sobre los que se construye toda pantalla del producto. Ninguna spec posterior debe redefinir un token de color/espaciado/tipografía — solo consumirlos.

---

## 1. Propósito y SLA

**Propósito:** proveer una capa de primitivos visuales (tokens Tailwind + componentes shadcn/ui customizados) consistente con la personalidad "quiet confidence / image-forward" definida en `frontend-plan.md` §1, disponible en modo claro y oscuro desde el primer render.

**SLA de rendimiento:**
- Cero *layout shift* atribuible a tokens de tipografía/espaciado (CLS = 0 en Lighthouse para páginas que solo usan estos primitivos).
- `cn()` (merge de clases) debe ejecutar en O(1) percibido — sin cómputo pesado en cada render (memoización no necesaria dado que `clsx`+`tailwind-merge` son suficientemente rápidos, pero se prohíbe recalcular classNames dentro de loops de render sin memo si la lista supera 100 items).
- Cambio de tema (claro/oscuro) sin parpadeo (*FOUC*): la clase de tema se resuelve antes del primer paint (script inline en `app/layout.tsx` o `next-themes` con `suppressHydrationWarning`).

---

## 2. Contratos

### 2.1 Tokens de color (`tailwind.config.ts`)

Los valores exactos están fijados en `CLAUDE.md` §5.1 (no se repiten aquí para evitar desincronización — este archivo es la fuente de verdad de valores; `tailwind.config.ts` debe importarlos, no hardcodearlos duplicados).

```ts
// src/config/design-tokens.ts
export const colorTokens = {
  background: { light: '#FAFAF9', dark: '#0C0C0D' },
  foreground: { light: '#18181B', dark: '#F4F4F5' },
  muted: { light: '#F1F0EE', dark: '#1A1A1C' },
  mutedForeground: { light: '#71717A', dark: '#A1A1AA' },
  border: { light: '#E4E4E7', dark: '#27272A' },
  accent: { light: '#1C1C1E', dark: '#F4F4F5' },
  success: { light: '#16A34A', dark: '#22C55E' },
  warning: { light: '#D97706', dark: '#F59E0B' },
  destructive: { light: '#DC2626', dark: '#EF4444' },
} as const satisfies Record<string, { light: `#${string}`; dark: `#${string}` }>;

export type ColorToken = keyof typeof colorTokens;
```

`tailwind.config.ts` consume `colorTokens` vía CSS variables (`hsl(var(--background))` pattern estándar de shadcn) — no se listan aquí los valores HSL derivados; se generan por script/manualmente al implementar, validados por el test de contraste (§4).

### 2.2 Utilidad `cn`

```ts
// src/lib/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### 2.3 Escala tipográfica

```ts
// src/config/design-tokens.ts (cont.)
export const typeScale = {
  xs: 'text-xs',       // 12px — metadata, badges
  sm: 'text-sm',       // 14px — cuerpo secundario
  base: 'text-base',   // 16px — cuerpo
  lg: 'text-lg',       // 18px — subtítulos de card
  xl: 'text-xl',       // 20px — títulos de sección
  '2xl': 'text-2xl',   // 24px — títulos de página
  '3xl': 'text-3xl',   // 30px — hero (solo Landing)
  '4xl': 'text-4xl',   // 36px — hero (solo Landing, desktop)
} as const;
```

### 2.4 Componentes base a implementar (contrato de props mínimo)

Todos siguen convención shadcn/ui (`cva` para variantes, `forwardRef`, `asChild` vía Radix `Slot` donde aplique).

| Componente | Variantes requeridas | Usado por (adelanto) |
| :--- | :--- | :--- |
| `Button` | `variant: 'default'\|'secondary'\|'ghost'\|'destructive'`, `size: 'sm'\|'default'\|'lg'\|'icon'` | Todas las specs |
| `Card` + `CardHeader/Content/Footer` | — | `GarmentCard`, `OutfitCard` (spec 02, 03) |
| `Badge` | `variant: 'default'\|'success'\|'warning'\|'outline'` | Categoría, estética, confianza (spec 02) |
| `Skeleton` | `className` (dimensiones vía Tailwind) | Todos los estados de carga |
| `Progress` | `value?: number` (undefined = indeterminado) | VTON processing (spec 04) |
| `Dialog`, `Sheet` | estándar Radix | Confirmaciones, detalle rápido |
| `Tabs` | estándar Radix | `/wardrobe` (Mis prendas / Básicos) |
| `Toast` (sonner) | `success\|error\|info` | Confirmaciones no bloqueantes |

```ts
// Ejemplo de contrato — src/components/ui/badge.tsx
type BadgeVariant = 'default' | 'success' | 'warning' | 'outline';
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}
```

### 2.5 Contrato de Accesibilidad por Componente

Extiende las garantías que Radix ya provee por defecto (focus trap, `aria-*` de estado) con los requisitos específicos de StyleMe que sí deben verificarse por test:

| Componente | Requisito verificable | Test asociado (§4) |
| :--- | :--- | :--- |
| `Button` | Estado `disabled` expone `aria-disabled="true"` además de `disabled` nativo (necesario para lectores que no anuncian el atributo HTML puro en todos los contextos) | Integración |
| `Badge` | Cuando comunica un estado semántico (`success`/`warning`), el texto visible debe ser autosuficiente — el color nunca es el único portador de significado (ej. `"92% confianza"`, no solo un punto verde) | Revisión manual + snapshot de texto |
| `Skeleton` | `aria-busy="true"` en el contenedor padre mientras el skeleton está presente, removido al resolver | Integración |
| `Progress` | `role="progressbar"` con `aria-valuenow` (si el valor es determinado) o `aria-valuetext` descriptivo (si es indeterminado, ej. "Procesando") | Integración |
| `Dialog`/`Sheet` | Foco vuelve al elemento que abrió el diálogo al cerrarlo (no solo se atrapa dentro — también se restaura) | Integración (`userEvent`) |
| `Tabs` | Navegación por flechas (←/→) entre tabs, no solo `Tab` (comportamiento estándar Radix, se verifica que no fue roto por la customización) | Integración |

---

## 3. Flujo de Datos Interno

No hay flujo de datos en tiempo de ejecución (es una capa estática de presentación). El flujo relevante es de **build-time / mount-time**:

```
tailwind.config.ts (lee colorTokens)
        │
        v
  CSS variables globales (globals.css, :root y .dark)
        │
        v
  Componentes shadcn/ui (usan clases semánticas: bg-background, text-foreground...)
        │
        v
  next-themes (resuelve .dark en <html> antes del primer paint)
        │
        v
  Render sin FOUC, tema correcto desde el primer frame
```

---

## 4. Estrategia de Pruebas

**Unitarias (Vitest):**
- `colorTokens` — test de regresión: cada par `(foreground, background)` y `(mutedForeground, muted)` definido en §2.1 debe cumplir contraste WCAG AA (ratio ≥ 4.5:1 para texto normal) en ambos temas. Se usa una función `getContrastRatio(hex1, hex2): number` propia (sin dependencia externa) testeada primero con casos conocidos (blanco/negro = 21:1).
- `cn()` — casos: merge de clases conflictivas de Tailwind (`cn('p-2', 'p-4')` → `'p-4'`), clases condicionales `false`/`undefined` ignoradas.

**Integración (Vitest + RTL):**
- Cada componente base (`Button`, `Badge`, `Skeleton`, `Progress`) renderiza sin errores con cada variante declarada en su tipo, y aplica la clase esperada (snapshot de `className` no de pixel, para no ser frágil).
- `Dialog`/`Sheet`: foco se atrapa dentro del panel al abrir (test con `userEvent.tab()` verificando que el foco no escapa) — regla de accesibilidad de `frontend-plan.md` §8.

**Casos borde:**
- Tema oscuro forzado vía `data-theme="dark"` sin `prefers-color-scheme` del sistema → variables correctas igual.
- `Badge` sin `variant` → usa `default` sin lanzar error de tipos.

---

## 5. Criterios de Aceptación

- [ ] `tailwind.config.ts` deriva sus colores de `src/config/design-tokens.ts`, sin valores hex duplicados hardcodeados en el config.
- [ ] Todos los pares texto/fondo de §2.1 pasan el test de contraste AA en ambos temas (claro y oscuro).
- [ ] `cn()` implementado y cubierto por tests unitarios (mínimo 4 casos: merge simple, conflicto Tailwind, condicional falsy, array anidado).
- [ ] Los 8 componentes de §2.4 existen en `src/components/ui/`, tipados sin `any`, con las variantes exactas especificadas.
- [ ] Cambio de tema claro/oscuro no produce parpadeo visible (`suppressHydrationWarning` configurado, verificado manualmente en `npm run dev`).
- [ ] `npm run typecheck && npm run lint && npm run test` pasan en verde para todo el contenido de esta spec.
- [ ] Los 6 requisitos de accesibilidad de §2.5 están cubiertos por un test cada uno (no solo heredados implícitamente de Radix sin verificación propia).

---

## 6. Manifiesto de Archivos

```
src/config/design-tokens.ts
src/lib/utils/cn.ts
src/lib/utils/getContrastRatio.ts
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
src/components/ui/skeleton.tsx
src/components/ui/progress.tsx
src/components/ui/dialog.tsx
src/components/ui/sheet.tsx
src/components/ui/tabs.tsx
src/components/ui/sonner.tsx
tests/unit/lib/utils/cn.test.ts
tests/unit/lib/utils/getContrastRatio.test.ts
tests/unit/config/design-tokens.contrast.test.ts
tests/integration/ui/button.test.tsx
tests/integration/ui/badge.test.tsx
tests/integration/ui/skeleton.test.tsx
tests/integration/ui/progress.test.tsx
tests/integration/ui/dialog.test.tsx
tests/integration/ui/tabs.test.tsx
```
