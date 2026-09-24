# Sprint 0 — Review (12 – 25 ago 2026)

**Branch:** `chore/sprint-1-prep` → PR to `main`
**Stack locked at the time:** Next.js 14.2 · React 18.3 · Node 20 LTS · TypeScript strict
(superseded in Sprint 2, PR #15 — see `docs/adr/adr-sprint-0/ADR-001-stack-frontend.md`)

**Limpieza 24-sep-2026:** esta carpeta (`docs/sprint-0/`, antigua ubicación) tenía 7 documentos
adicionales de tres rondas de remediación pre-proyecto que declararon "READY"/"GO"/"PRODUCTION
READY" sin haber corrido `npm ci` — quedaron eliminados por no aportar nada que este archivo y
`GO-NO-GO.md` no cubran ya, y por generar confusión sobre cuál era la fuente de verdad. Este
archivo (renombrado de `SCAFFOLD-VERIFICATION.md`) y `GO-NO-GO.md` son los dos documentos
reales del Sprint 0 — junto con `CLAUDE.md` §10, que sigue siendo el registro de decisiones.

---

## Quality gates — executed, not assumed

From a clean tree (`rm -rf node_modules && npm ci`, Node 20 in CI / Node 24 locally):

| Command | Result |
|---|---|
| `npm ci` | exit 0 — 657 packages, lockfile in sync |
| `npm run typecheck` (`tsc --noEmit`) | exit 0 |
| `npm run lint` (`next lint --max-warnings 0`) | exit 0 — "No ESLint warnings or errors" |
| `npm run test` (`vitest run`, jsdom) | exit 0 — smoke test (TSX + jsdom + RTL + `@/` alias) |
| `npm run test:e2e` (`playwright test --pass-with-no-tests`) | exit 0 |
| `npm run build` (`next build`) | exit 0 — compiled, 4 routes |

Runtime check (`npm run start`, prod): all security headers present, CSP enforced,
no `X-Powered-By`, page renders.

---

## What this scaffold contains

```
package.json / package-lock.json   Next 14.2 + React 18.3, lockfile committed & in sync
tsconfig.json                      strict + noUncheckedIndexedAccess; jsx: preserve (Next)
.eslintrc.json                     next/core-web-vitals + next/typescript + prettier; no-explicit-any: error
.prettierrc.json / .gitattributes  formatter + LF normalization
next.config.js                     enforced CSP, security headers, Cloudinary-scoped images, poweredByHeader off
tailwind.config.ts                 colour scale DERIVED from design-tokens.ts keys; darkMode: 'class'
.github/workflows/ci.yml           3 jobs (quality / build / e2e), Node 20, concurrency-cancel
.github/CODEOWNERS                 fallback reviewer (constitution §3)
.github/pull_request_template.md   enforces PR structure + AI-usage declaration
.nvmrc                             20
.env.example                       NEXT_PUBLIC_API_BASE_URL + Supabase placeholders

src/config/design-tokens.ts        WCAG-AA hex tokens + hexToHslChannels() / cssVariablesForTheme()
src/app/globals.css                CSS vars = HSL channels of the hex tokens (hex in comments)
src/app/layout.tsx                 export const viewport (no maximumScale); one <main id="main-content">
src/app/providers.tsx              AppProviders: ThemeProvider → QueryClientProvider (useState) → TooltipProvider → Toaster
src/app/page.tsx                   placeholder home
src/components/shell/SkipToContentLink.tsx
src/lib/errors.ts                  StyleMeError + ApiError / ValidationError / NetworkError / VtonJobTimeoutError

tests/setup.ts                     @testing-library/jest-dom + RTL cleanup
tests/integration/smoke.test.tsx   toolchain smoke test
tests/{unit,e2e}/                  present, empty (Tarea 1+ fills them)
```

---

## Findings mitigated in this branch

| Finding | Resolution |
|---|---|
| `npm ci` failed (lockfile out of sync) | lockfile regenerated & committed |
| `npm run lint` crashed (`eslint-config-next` 15 vs Next 14) | pinned to 14.2; `.eslintrc` simplified |
| `npm run build` failed; `test:e2e` failed on empty suite | deps coherent; `--pass-with-no-tests` |
| Vitest env `node`, react plugin removed → no component tests | back to jsdom + `@vitejs/plugin-react` |
| `design-tokens.ts` was dead code; `globals.css` wrong hues | tailwind derives from tokens; HSL recomputed |
| **Palette pairs below WCAG AA** (`mutedForeground`/`muted` ≈ 4.3:1; text on `success` ≈ 3.4:1) | light `mutedForeground`/`success`/`destructive` moved one step darker; `warning` pair added; **all 6 text pairs ≥ 4.5:1 verified** (min 4.80:1) — `CLAUDE.md` §10 D1 |
| `app-shell-and-navigation/spec.md` in legacy format | migrated to OpenSpec native (Requirement + Scenario + AC) |
| `next.config.js`: `**` image wildcard, no real CSP, `X-XSS-Protection` | enforced CSP, Cloudinary-only images, `Permissions-Policy`, `poweredByHeader: false` |
| Nested duplicate `<main id="main-content">` in `page.tsx` | removed |
| `.env.example` name mismatch with spec | `NEXT_PUBLIC_API_BASE_URL` + Supabase placeholders |
| Docs claimed "9 components / Next 15 / commit to main / 44 tasks" | reconciled across CLAUDE.md, README, sprint prompt, scaffold spec |
| No PR template / CODEOWNERS enforcing "review ≠ author" | both added |
| Historical "READY/GO" docs at repo root | moved to `docs/sprint-0/` with an index |

---

## Follow-ups (NOT blockers — tracked, owned)

| Item | Owner | When |
|---|---|---|
| Contrast test file `tests/unit/config/design-tokens.contrast.test.ts` (tokens already AA; this is the guard) | Leonardo | Tarea 1 |
| Non-text contrast (focus ring ≥ 3:1) once a ring token exists | Leonardo | Tarea 4/5 |
| Nonce + `strict-dynamic` CSP on authenticated (dynamic) routes via `middleware.ts` — tested in Sprint 0, incompatible with static prerender, deferred | Manuel | infra hardening |
| `axe` / `jest-axe` a11y assertions | Huascar | Sprint 1 QA infra |
| Coverage as a merge gate (≥ 80%, unit + e2e merged) | Huascar | Sprint 2 |
| Per-path `CODEOWNERS` once every teammate's GitHub handle is confirmed | Manuel | Sprint 1 |
| `CODECOV_TOKEN` repo secret (upload is a silent no-op without it) | Manuel | Sprint 1 |

---

## Governance

Delivered via **PR from `chore/sprint-1-prep`**, reviewed before merge, AI-usage declared in the
PR body — `.speckit/constitution.md` §3. The three earlier rounds committed directly to `main`;
that is the anti-pattern this branch corrects.
