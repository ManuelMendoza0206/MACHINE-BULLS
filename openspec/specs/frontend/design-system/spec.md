# Frontend Design System

## Purpose

Provide design tokens (colors, typography, spacing) and base UI components (Button, Card, Badge, Skeleton, Progress) that are consistent across light/dark themes and accessible by default. No other component or spec may redefine tokens — only consume them.

---

## Requirements

### Requirement: Design tokens with WCAG AA contrast

`src/config/design-tokens.ts` is the authoritative token source (mirrored by `docs/context/frontend-plan.md` §5.1).
The system SHALL guarantee that every **text pair** meets WCAG AA (≥ 4.5:1 for normal text) in
both light and dark themes. Text pairs are: `foreground/background`, `mutedForeground/muted`,
`accentForeground/accent`, `successForeground/success`, `warningForeground/warning`,
`destructiveForeground/destructive`. Non-text tokens (`border`, `input`) are not held to 4.5:1;
focus rings and other non-text UI affordances SHALL meet ≥ 3:1 (WCAG 1.4.11) and are checked
separately when introduced.

> The light-theme `mutedForeground`, `success` and `destructive` values were tuned one step
> darker to satisfy this (see `CLAUDE.md` §10). Dark-theme values are unchanged.

#### Scenario: Every text pair meets AA in both themes

- **GIVEN** the six text pairs above, in light and dark
- **WHEN** the WCAG contrast ratio is computed for each
- **THEN** every ratio is ≥ 4.5:1

#### Scenario: globals.css stays in sync with the tokens

- **GIVEN** each `--token` line in `src/app/globals.css`
- **WHEN** compared to `hexToHslChannels(colorTokens[name][theme])`
- **THEN** they are equal (the CSS is a faithful projection of the token source)

#### Acceptance Criteria

- [ ] `src/config/design-tokens.ts` defines the 7 base + 5 `*Foreground` token pairs (light/dark)
- [ ] `tests/unit/config/design-tokens.contrast.test.ts` checks the six text pairs (both themes) and the globals.css sync
- [ ] The test runs in CI and fails if any text pair < 4.5:1 or globals.css drifts
- [ ] `getContrastRatio` is validated against known values (black/white = 21:1) first

---

### Requirement: Theme switching without FOUC

The system SHALL switch between light and dark themes without Flash of Unstyled Content (FOUC) or hydration mismatch.

#### Scenario: Theme toggle on load

- **WHEN** page loads with system prefers-color-scheme = dark
- **THEN** content renders in dark theme from first paint (no light flash)

#### Scenario: Theme toggle after user action

- **WHEN** user clicks theme toggle button
- **THEN** document.documentElement classList changes, all elements re-render with new colors in same frame (no flicker)

#### Scenario: Preference persists

- **WHEN** user toggles theme and closes browser
- **AND** reopens same page
- **THEN** theme matches previous selection from localStorage

#### Acceptance Criteria

- [ ] `suppressHydrationWarning` set on `<html>` tag
- [ ] Theme script injected in `<head>` BEFORE stylesheets (inline or preload)
- [ ] `next-themes` configured with `attribute="class"` and `enableSystem`
- [ ] E2E test verifies no FOUC on page reload
- [ ] localStorage persists theme preference

---

### Requirement: Utility function cn() for class merging

The system SHALL provide a `cn()` utility that merges Tailwind CSS classes without conflicts, using clsx + tailwind-merge.

#### Scenario: Merge conflicting Tailwind classes

- **WHEN** `cn('px-4', 'px-6')` is called
- **THEN** result is `'px-6'` (last value wins, no duplication)

#### Scenario: Merge conditional classes

- **WHEN** `cn('text-sm', { 'font-bold': true, italic: false })` is called
- **THEN** result is `'text-sm font-bold'` (truthy key included, falsy key excluded)

#### Scenario: Handle undefined and arrays

- **WHEN** `cn(['text-base', undefined], 'p-4', null)` is called
- **THEN** result is `'text-base p-4'` (undefined/null ignored, arrays flattened)

> Note: conflicting Tailwind utilities still collapse to the last one — `cn('text-sm', 'text-lg')` is `'text-lg'` (that is `tailwind-merge` doing its job, not a bug).

#### Acceptance Criteria

- [ ] `src/lib/utils/cn.ts` exports `cn` function using clsx + tailwind-merge
- [ ] 4 test cases: conflict, conditional, undefined, array (all pass)
- [ ] Test runs in < 50ms
- [ ] Test file: `tests/unit/lib/utils/cn.test.ts`

---

### Requirement: Contrast ratio calculator utility

The system SHALL provide a `getContrastRatio(hex1, hex2)` function that calculates WCAG contrast ratio between two colors.

#### Scenario: Calculate contrast for valid hex colors

- **WHEN** `getContrastRatio('#FAFAF9', '#18181B')` is called
- **THEN** result is a number >= 4.5 (light/dark pair)

#### Scenario: Known contrast pairs

- **WHEN** `getContrastRatio('#FFFFFF', '#000000')` is called (white/black)
- **THEN** result is 21 (maximum contrast)

#### Acceptance Criteria

- [ ] `src/lib/utils/getContrastRatio.ts` exported function
- [ ] Handles hex colors (no validation errors)
- [ ] Returns numeric ratio (ISO/IEC 40500 formula)
- [ ] Tests verify known pairs (white/black = 21, etc)
- [ ] Test file: `tests/unit/lib/utils/getContrastRatio.test.ts`

---

### Requirement: 5 core UI components

The system SHALL provide 5 base UI components (Button, Card, Badge, Skeleton, Progress) styled with design tokens, typed without `any`, and tested for basic rendering + accessibility.

#### Scenario: Button component renders with variants

- **WHEN** `<Button variant="default">Click me</Button>` is rendered
- **THEN** button appears with default styling and responds to click

#### Scenario: Card component as container

- **WHEN** `<Card><CardContent>Text</CardContent></Card>` is rendered
- **THEN** card wraps content with proper spacing and borders

#### Scenario: Badge component with semantic color

- **WHEN** `<Badge variant="success">Active</Badge>` is rendered
- **THEN** badge displays green background + white text (success colors from tokens)

#### Scenario: Skeleton component for loading

- **WHEN** `<Skeleton className="h-12 w-full" />` is rendered
- **THEN** it shows an animated pulse and exposes `role="status"` + `aria-busy="true"` + an accessible name
- **AND** for a grid of skeletons, the recommended pattern is one wrapper with `role="status"` and `aria-hidden` on each item

#### Scenario: Progress component with value

- **WHEN** `<Progress value={65} />` is rendered
- **THEN** progress bar shows 65% filled, `role="progressbar"`, `aria-valuenow="65"`

#### Acceptance Criteria

- [ ] All 5 components exist in `src/components/ui/[component].tsx`
- [ ] Each component is typed (Props interface, no `any`)
- [ ] Each component uses `cn()` for class merging
- [ ] Each component has test file in `tests/integration/ui/[component].test.tsx`
- [ ] Tests verify: render without error, correct classes applied, basic a11y (aria attributes)
- [ ] Coverage > 50% for all 5 components
- [ ] `npm run test -- src/components/ui` passes

---

### Requirement: App layout with shell components

The system SHALL provide root layout with providers (theme, query client), skip link, main content area, and error boundary.

#### Scenario: Layout renders without hydration error

- **WHEN** page loads (SSR + hydration)
- **THEN** no hydration mismatch, no console errors

#### Scenario: Skip link appears on Tab

- **WHEN** user presses Tab key on page load
- **THEN** SkipToContentLink becomes visible (sr-only → focus:not-sr-only)
- **AND** pressing Enter jumps to `<main id="main-content">`

#### Scenario: Providers initialized once per session

- **WHEN** page renders and re-renders
- **THEN** QueryClient instance is created exactly once (via useState hook, not module singleton)
- **AND** theme context and TanStack Query context are available to all children

#### Acceptance Criteria

- [ ] `src/app/layout.tsx` has `suppressHydrationWarning` on `<html>`
- [ ] `src/app/providers.tsx` exports `AppProviders` (Client Component)
- [ ] QueryClient instantiated via `useState(() => new QueryClient(...))`
- [ ] TooltipProvider + Toaster + ThemeProvider all composed
- [ ] SkipToContentLink rendered before main
- [ ] E2E test: Tab key activates skip link
- [ ] `npm run typecheck` passes (no TS errors)

---

### Requirement: Accessibility compliance (WCAG 2.1 AA)

The system SHALL meet WCAG 2.1 AA accessibility standards for all components and layout.

#### Scenario: Keyboard navigation

- **WHEN** user navigates page with Tab, Shift+Tab, Enter, Escape
- **THEN** all interactive elements receive focus, focus indicators are visible, focus order is logical

#### Scenario: Semantic HTML

- **WHEN** screen reader scans page
- **THEN** landmarks are present (skip link, main, nav), heading hierarchy is correct, buttons have accessible text

#### Scenario: Color is not sole indicator

- **WHEN** Badge shows status (success = green)
- **THEN** text label also indicates status (e.g., "Active", not color alone)

#### Scenario: Focus is restored after modal close

- **WHEN** Dialog closes
- **THEN** focus returns to element that opened it (not lost in document)

#### Scenario: Loading states communicate to screen readers

- **WHEN** Skeleton or Progress is displayed
- **THEN** `aria-busy="true"` or `role="progressbar"` signals state to AT

#### Acceptance Criteria

- [ ] 6 a11y test cases covering keyboard, semantic HTML, color usage, focus, loading states
- [ ] `tests/integration/ui/[component].test.tsx` includes a11y assertions (aria attributes, roles)
- [ ] axe-core or similar linter runs in CI and reports 0 violations
- [ ] E2E test suite includes keyboard navigation test
- [ ] Lighthouse a11y score >= 90 on sample pages

---

## File Manifest

```
src/config/design-tokens.ts
src/lib/utils/cn.ts
src/lib/utils/getContrastRatio.ts
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
src/components/ui/skeleton.tsx
src/components/ui/progress.tsx
src/components/shell/SkipToContentLink.tsx
src/app/layout.tsx
src/app/providers.tsx
src/app/globals.css

tests/unit/config/design-tokens.contrast.test.ts
tests/unit/lib/utils/cn.test.ts
tests/unit/lib/utils/getContrastRatio.test.ts
tests/integration/ui/button.test.tsx
tests/integration/ui/card.test.tsx
tests/integration/ui/badge.test.tsx
tests/integration/ui/skeleton.test.tsx
tests/integration/ui/progress.test.tsx
tests/integration/shell/skiplink.test.tsx
tests/integration/layout.test.tsx
```

---

## References

- `docs/context/frontend-plan.md` §1, §5 (design system vision, token spec)
- `docs/sprint-plans/sprint-1/sprint-1-init-leonardo.md` (Tareas 1-5: tokens, theme, layout, components, shell)
- `CLAUDE.md` §2 (tech stack: TypeScript strict, Tailwind, shadcn/ui)

---

**Status:** Ready for Sprint 1 implementation (Tarea 1 start 26 ago 2026).
**Owner:** Leonardo Ibarra López (Feature Lead).
**Last updated:** 31 ago 2026.
