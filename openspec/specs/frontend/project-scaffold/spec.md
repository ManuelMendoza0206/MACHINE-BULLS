# Frontend Project Scaffold

## Purpose

Initialize a production-ready Next.js 14 project with TypeScript strict mode, Tailwind CSS, testing infrastructure (Vitest + Playwright), and CI/CD pipeline. This is the unconditional blocker before any feature work begins.

---

## Requirements

### Requirement: Next.js 14 project with TypeScript strict mode and ESLint

The scaffold SHALL establish a Next.js 14 App Router project with `strict: true` TypeScript configuration and zero ESLint warnings.

#### Scenario: Project initializes without errors
- **WHEN** `npm ci` is executed
- **THEN** all dependencies install successfully, `node_modules/` contains 400+ packages

#### Scenario: TypeScript compilation succeeds
- **WHEN** `npm run typecheck` is executed
- **THEN** exit code is 0, no errors or warnings reported

#### Scenario: ESLint passes with zero warnings
- **WHEN** `npm run lint` is executed
- **THEN** exit code is 0, zero warnings in output

#### Acceptance Criteria
- [ ] `package.json` defines Next.js 14, React 18.3, TypeScript 5.3+
- [ ] `tsconfig.json` sets `strict: true`, `noUncheckedIndexedAccess: true`, `jsx: react-jsx`
- [ ] `.eslintrc.json` extends `next/core-web-vitals`, enforces `no-explicit-any`, no hardcoded ports
- [ ] `npm ci && npm run typecheck && npm run lint` all exit 0
- [ ] No `node_modules` or `.next` in `.gitignore` (committed)

---

### Requirement: Tailwind CSS with design tokens configuration

The scaffold SHALL include Tailwind CSS configured to consume design tokens from `src/config/design-tokens.ts`, with CSS variable output in `src/app/globals.css`.

#### Scenario: Tailwind imports design tokens
- **WHEN** `tailwind.config.ts` is loaded
- **THEN** it imports `src/config/design-tokens.ts` and derives theme colors from it (not hardcoded)

#### Scenario: CSS variables generated from tokens
- **WHEN** `src/app/globals.css` is parsed
- **THEN** all color variables (background, foreground, accent, success, destructive, etc.) are defined as CSS vars referencing HSL values derived from hex tokens

#### Acceptance Criteria
- [ ] `tailwind.config.ts` exists and imports `design-tokens.ts`
- [ ] No hardcoded color hex/rgb values in Tailwind config
- [ ] `src/app/globals.css` defines `:root` and `.dark` blocks with CSS variables
- [ ] Variables match names in `design-tokens.ts` (background, foreground, muted, etc.)
- [ ] `npm run build` produces CSS with `--background`, `--foreground`, etc. in output

---

### Requirement: Testing infrastructure (Vitest + React Testing Library + Playwright)

The scaffold SHALL provide Vitest for unit/integration tests, React Testing Library for component testing, and Playwright for E2E tests, all configured and passing (even with zero tests).

#### Scenario: Vitest runs empty suite
- **WHEN** `npm run test` is executed (no .test.ts files yet)
- **THEN** exit code is 0, coverage report shows 0 files (no threshold breach)

#### Scenario: Playwright runs empty suite
- **WHEN** `npm run test:e2e` is executed (no .spec.ts files yet)
- **THEN** exit code is 0, html report generated, `passWithNoTests: true`

#### Acceptance Criteria
- [ ] `vitest.config.ts` configured with jsdom, React plugin, coverage providers, 0% thresholds
- [ ] `tests/setup.ts` exists (can be empty or minimal)
- [ ] `tests/` directory exists (empty for Sprint 1)
- [ ] `playwright.config.ts` configured with baseURL, webServer, `passWithNoTests: true`
- [ ] `tests/e2e/` directory exists (empty for Sprint 1)
- [ ] `npm run test && npm run test:e2e` both exit 0

---

### Requirement: GitHub Actions CI/CD pipeline

The scaffold SHALL include a GitHub Actions workflow that runs lint → typecheck → test --coverage → build → e2e in parallel jobs.

#### Scenario: CI runs on push to main
- **WHEN** a commit is pushed to main branch
- **THEN** GitHub Actions workflow is triggered, all jobs run (lint, typecheck, test, build, e2e)

#### Scenario: All jobs pass
- **WHEN** workflow completes
- **THEN** all 5 jobs show green (✓) in Actions tab, no skipped jobs

#### Acceptance Criteria
- [ ] `.github/workflows/ci.yml` exists with 5 jobs: lint, typecheck, test, build, e2e
- [ ] All jobs run on Ubuntu latest, Node 18.17.0
- [ ] Test job includes `--coverage` flag and codecov upload
- [ ] E2E job includes `npx playwright install --with-deps`
- [ ] Workflow file valid YAML (GitHub Actions lint passes)

---

### Requirement: Next.js security configuration

The scaffold SHALL configure Next.js with CSP headers, specific image hostnames (no wildcards), and environment variable safety.

#### Scenario: Image policy is specific
- **WHEN** `next.config.js` is evaluated
- **THEN** `images.remotePatterns` includes only specific hostname(s), no `**` wildcard

#### Scenario: CSP headers are present
- **WHEN** dev server runs and browser makes request
- **THEN** response includes `Content-Security-Policy` header with `default-src 'self'`

#### Acceptance Criteria
- [ ] `next.config.js` includes `remotePatterns` with specific hostnames (e.g., `images.example.com`)
- [ ] `headers` async function includes CSP policy (no report-only, enforced mode)
- [ ] No `wildcard`, `**`, or overly permissive patterns in CSP
- [ ] `.env.example` provided, `.env*` in `.gitignore`
- [ ] No secrets/tokens in `next.config.js`, `package.json`, or code

---

### Requirement: Development workflow and documentation

The scaffold SHALL provide a README with setup/dev/build/test commands and team member can start from zero to green in < 5 minutes.

#### Scenario: Developer clones and initializes
- **WHEN** new team member runs `git clone ... && npm ci`
- **THEN** all commands complete, repo is ready for `npm run dev`

#### Scenario: README explains stack
- **WHEN** developer reads `README.md` or `CLAUDE.md` §2
- **THEN** tech stack (Next.js 14, React 18.3, Tailwind, Vitest, Playwright, TypeScript strict) is documented with rationale

#### Acceptance Criteria
- [ ] `README.md` or `docs/onboarding.md` exists
- [ ] Documents: `npm ci`, `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`
- [ ] Section on "Tech Stack" explains why Next.js 14, React 18.3, not 19
- [ ] Section on "TypeScript & ESLint" explains strict mode + no `any`
- [ ] New developer can setup and run dev server in < 5 min with just the README

---

## File Manifest

```
MACHINE-BULLS/
├── package.json                      # Next 14, React 18.3, dependencies locked
├── package-lock.json                 # Committed, reproducible installs
├── tsconfig.json                     # strict: true, noUncheckedIndexedAccess
├── .eslintrc.json                    # no-explicit-any, explicit-function-return-type
├── .prettierrc                        # Formatter config
├── next.config.js                    # CSP headers, specific image hostnames
├── tailwind.config.ts                # Imports design-tokens.ts
├── vitest.config.ts                  # 0% thresholds, React + jsdom
├── playwright.config.ts              # passWithNoTests: true
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout, providers
│   │   ├── page.tsx                  # Home page (minimal)
│   │   └── globals.css               # CSS variables from design-tokens
│   ├── config/
│   │   └── design-tokens.ts          # Color, typography, spacing tokens
│   └── components/
│       └── shell/
│           └── SkipToContentLink.tsx # A11y skip link
├── tests/
│   ├── setup.ts                      # Vitest setup (can be empty)
│   └── e2e/                          # Empty directory (Playwright)
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions pipeline
├── .gitignore                        # node_modules, .next, .env*, secrets
├── .env.example                      # Template for env vars (no secrets)
├── README.md                         # Setup, dev, build, test, tech stack
└── CLAUDE.md                         # Operational decisions (already exists)
```

---

## References

- `CLAUDE.md` §2 (tech stack justification)
- `CLAUDE.md` §4 (directory structure)
- `docs/context/frontend-plan.md` (full product vision)

---

**Status:** Ready for Tarea 0 execution (Sprint 1 blocker).
**Owner:** Leonardo Ibarra López (Feature Lead).
**Last updated:** 31 ago 2026.
