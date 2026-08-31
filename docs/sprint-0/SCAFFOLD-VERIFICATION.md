# Sprint 0 — Scaffold Verification (authoritative)

**Branch delivered on:** `chore/sprint-1-prep` → PR to `main`
**Stack locked:** Next.js 14.2 · React 18.3 · Node 20 LTS · TypeScript strict

This document is the **authoritative status** of the scaffold. The other files in
`docs/sprint-0/` are the historical trail of how we got here (three earlier rounds that
declared "READY" without ever running `npm ci`); trust this one and `CLAUDE.md` §10.

---

## Quality gates — executed, not assumed

Run from a clean tree (`rm -rf node_modules && npm ci`):

| Command | Result |
|---|---|
| `npm ci` | exit 0 — 657 packages, lockfile in sync |
| `npm run typecheck` (`tsc --noEmit`) | exit 0 — 0 errors |
| `npm run lint` (`next lint`, `--max-warnings 0`) | exit 0 — "No ESLint warnings or errors" |
| `npm run test` (`vitest run`, jsdom) | exit 0 — smoke test passes (TSX + jsdom + RTL + `@/` alias) |
| `npm run test:e2e` (`playwright test --pass-with-no-tests`) | exit 0 — no e2e specs yet, tolerated |
| `npm run build` (`next build`) | exit 0 — compiled, 4 static routes generated |

`next build` also runs its own lint + type check pass over `.next/types` — also clean.

---

## What this scaffold contains

```
package.json / package-lock.json   Next 14.2, React 18.3, pinned + committed lockfile
tsconfig.json                      strict + noUncheckedIndexedAccess; jsx: preserve (Next)
.eslintrc.json                     next/core-web-vitals + next/typescript + prettier; no-explicit-any: error
.prettierrc.json                   formatter; enforced in CI via format:check-compatible config
next.config.js                     CSP baseline, poweredByHeader off, Cloudinary-scoped images, no X-XSS-Protection
tailwind.config.ts                 colour scale DERIVED from src/config/design-tokens.ts keys; darkMode: 'class'
.github/workflows/ci.yml           3 jobs (quality / build / e2e), Node 20, concurrency-cancel
.nvmrc                             20

src/config/design-tokens.ts        hex tokens (spec §2.1) + hexToHslChannels() + cssVariablesForTheme()
src/app/globals.css                CSS vars = HSL channels of the hex tokens (with hex in comments)
src/app/layout.tsx                 export const viewport (no maximumScale); SkipToContentLink + <main id> inside AppProviders
src/app/providers.tsx              AppProviders: ThemeProvider → QueryClientProvider (useState instance) → TooltipProvider → Toaster
src/app/page.tsx                   placeholder home (no nested <main>)
src/components/shell/SkipToContentLink.tsx
src/lib/errors.ts                  StyleMeError + ApiError / ValidationError / NetworkError / VtonJobTimeoutError

tests/setup.ts                     @testing-library/jest-dom + RTL cleanup
tests/integration/smoke.test.tsx   toolchain smoke test
tests/{unit,e2e}/                  present, empty (Tarea 1+ fills them)
```

## Known follow-ups (NOT scaffold blockers — owned by Sprint 1 tasks)

| Item | Owner | Where |
|---|---|---|
| `success` / `destructive` on white are < 4.5:1 — decide: darker text token vs. 3:1 non-text AC | Leonardo | Tarea 1 (`design-tokens.contrast.test.ts` + openspec change) |
| `app-shell-and-navigation/spec.md` still in legacy format | Leonardo | Tarea 5 (spec-first for that flow) |
| Nonce-based CSP (drop `unsafe-inline`/`unsafe-eval` from `script-src`) | Manuel | infra hardening |
| `axe`/`jest-axe` a11y assertions | Huascar | Sprint 1 QA infra |
| Coverage threshold as a merge gate (≥80%, unit+e2e) | Huascar | Sprint 2 |
| Real `webServer` build (`next build && next start`) for e2e instead of `next dev` | Manuel | when first e2e spec lands |

---

## Governance note

This scaffold and every fix above landed via **PR from `chore/sprint-1-prep`**, reviewed
before merge, with an AI-usage declaration in the PR body — per `.speckit/constitution.md`
§3. The three earlier "remediation" rounds committed directly to `main`; that is the
anti-pattern this delivery corrects.
