# Frontend Project Scaffold

## Purpose

Initialize a production-ready Next.js 16 project with TypeScript strict mode, Tailwind CSS v4, testing infrastructure (Vitest + Playwright), and CI/CD pipeline. This is the unconditional blocker before any feature work begins.

---

## Requirements

### Requirement: Next.js 16 project with TypeScript strict mode and ESLint

The scaffold SHALL establish a Next.js 16 App Router project with `strict: true` TypeScript configuration and zero ESLint warnings.

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

- [ ] `package.json` pins Next.js 16, React 19, TypeScript 5.9+; `package-lock.json` committed and in sync (`npm ci` exits 0)
- [ ] `tsconfig.json` sets `strict: true`, `noUncheckedIndexedAccess: true`, `jsx: preserve` (Next convention)
- [ ] `.eslintrc.json` extends `next/core-web-vitals` + `next/typescript` + `prettier`; enforces `@typescript-eslint/no-explicit-any`
- [ ] `npm ci && npm run typecheck && npm run lint` all exit 0
- [ ] `.gitignore` excludes `node_modules`, `.next`, `coverage`, `.env*` (and is committed)

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

#### Scenario: Vitest runs the seed suite

- **WHEN** `npm run test` is executed
- **THEN** exit code is 0; the scaffold smoke test passes; no coverage threshold gates the run

#### Scenario: Playwright tolerates an empty suite

- **WHEN** `npm run test:e2e` is executed (no `.spec.ts` files yet)
- **THEN** exit code is 0 (the script passes `--pass-with-no-tests`)

#### Acceptance Criteria

- [ ] `vitest.config.ts` uses `environment: 'jsdom'`, `@vitejs/plugin-react`, v8 coverage, no thresholds (Sprint 1)
- [ ] `tests/setup.ts` wires `@testing-library/jest-dom` + RTL `cleanup`
- [ ] `tests/{unit,integration,e2e}/` exist; one smoke test proves TSX + jsdom + RTL + `@/` alias
- [ ] `test:e2e` script is `playwright test --pass-with-no-tests`; `playwright.config.ts` sets `baseURL` + `webServer`
- [ ] `npm run test && npm run test:e2e` both exit 0

---

### Requirement: GitHub Actions CI/CD pipeline

The scaffold SHALL include a GitHub Actions workflow that runs the quality gates on every push and PR to `main`.

#### Scenario: CI runs on PR to main

- **WHEN** a PR targets `main`
- **THEN** the workflow triggers and runs the `quality`, `build` and `e2e` jobs

#### Scenario: All jobs pass on the scaffold

- **WHEN** the workflow completes for the scaffold commit
- **THEN** every job is green, none skipped

#### Acceptance Criteria

- [ ] `.github/workflows/ci.yml` has 3 jobs: `quality` (lint + typecheck + test --coverage + codecov), `build`, `e2e`
- [ ] All jobs run on `ubuntu-latest`, Node 22; `concurrency` cancels superseded runs
- [ ] `e2e` job runs `npx playwright install --with-deps chromium` before `npm run test:e2e`
- [ ] `codecov` upload uses `CODECOV_TOKEN` secret and does not fail the job on upload error

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

- [ ] `next.config.js` `images.remotePatterns` lists specific hostname(s) only (`res.cloudinary.com`), no `**` wildcard
- [ ] `headers` sets an enforced (non report-only) CSP with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`
- [ ] `poweredByHeader: false`; no deprecated `X-XSS-Protection`
- [ ] `.env.example` provided, `.env*` in `.gitignore`
- [ ] No secrets/tokens in `next.config.js`, `package.json`, or code
- [ ] Follow-up noted: nonce-based CSP (drop `unsafe-inline`/`unsafe-eval`) — infra track

---

### Requirement: Development workflow and documentation

The scaffold SHALL provide a README with setup/dev/build/test commands and team member can start from zero to green in < 5 minutes.

#### Scenario: Developer clones and initializes

- **WHEN** new team member runs `git clone ... && npm ci`
- **THEN** all commands complete, repo is ready for `npm run dev`

#### Scenario: README explains stack

- **WHEN** developer reads `README.md` or `CLAUDE.md` §2
- **THEN** tech stack (Next.js 16, React 19, Tailwind v4, Vitest, Playwright, TypeScript strict) is documented with rationale

#### Acceptance Criteria

- [ ] `README.md` **and** `docs/onboarding.md` exist; `CONTRIBUTING.md` summarizes the PR flow
- [ ] Onboarding documents `nvm use`, `npm ci`, `npm run verify`, `npm run test:e2e`, `npm run dev`
- [ ] `README` "Tech Stack" explains why Next.js 16, React 19, Tailwind v4
- [ ] New developer goes from `git clone` to green in < 5 min with just `docs/onboarding.md`

---

### Requirement: Developer environment and local guard rails

The scaffold SHALL ship the shared editor config, git hooks and repo automation a professional
team expects, so that quality problems are caught before they reach CI.

#### Scenario: Bad commit message is rejected locally

- **WHEN** a developer commits with a message that is not Conventional Commits
- **THEN** the `commit-msg` hook (commitlint) rejects it before the commit is created

#### Scenario: Staged files are formatted and linted on commit

- **WHEN** a developer commits `.ts`/`.tsx` files
- **THEN** the `pre-commit` hook runs `lint-staged` (prettier + `eslint --fix`) on exactly those files

#### Scenario: Type errors are caught before push

- **WHEN** a developer pushes a branch with a TypeScript error
- **THEN** the `pre-push` hook (`npm run typecheck`) fails and blocks the push

#### Acceptance Criteria

- [ ] `.editorconfig` (LF, 2-space, UTF-8, final newline)
- [ ] `husky` v9 + `lint-staged`: `.husky/{pre-commit,commit-msg,pre-push}`; `prepare` script arms them on `npm ci`
- [ ] `commitlint.config.cjs` extends `@commitlint/config-conventional`
- [ ] `npm run verify` = `typecheck && lint && test && build` (single command)
- [ ] `.github/dependabot.yml` (npm + github-actions, weekly, grouped)
- [ ] `.github/ISSUE_TEMPLATE/` (task + bug) and `.github/pull_request_template.md`
- [ ] `.github/CODEOWNERS` so every PR needs a review from someone other than the author
- [ ] `.vscode/{extensions.json,settings.json}` committed (rest of `.vscode/` ignored)
- [ ] **Branch protection on `main`** configured in GitHub: require PR, require the `CODEOWNERS`
      review, require status checks (`quality`/`build`/`e2e`), block direct push and force-push
      _(repo-admin action — owned by the infra track / Asiento D)_

---

## File Manifest

```
MACHINE-BULLS/
├── package.json / package-lock.json  # Next 16 + React 19, lockfile committed & in sync
├── tsconfig.json                     # strict, noUncheckedIndexedAccess, jsx: preserve
├── eslint.config.mjs                 # next/core-web-vitals + next/typescript + prettier (flat config)
├── .prettierrc.json / .gitattributes # formatter + LF normalization
├── next.config.js                    # CSP baseline, Cloudinary-scoped images, poweredByHeader off
├── tailwind.config.ts                # colour scale derived from design-tokens.ts keys; darkMode: 'class'
├── vitest.config.ts                  # jsdom + @vitejs/plugin-react, v8 coverage, no thresholds
├── playwright.config.ts              # baseURL + webServer (dev)
├── .github/
│   ├── workflows/ci.yml              # 3 jobs: quality / build / e2e (Node 22)
│   ├── CODEOWNERS  dependabot.yml  pull_request_template.md
│   └── ISSUE_TEMPLATE/{task,bug_report,config}.yml
├── .husky/{pre-commit,commit-msg,pre-push}   # lint-staged / commitlint / typecheck
├── .editorconfig  commitlint.config.cjs  .nvmrc (22)
├── .vscode/{extensions.json,settings.json}
├── CONTRIBUTING.md  docs/onboarding.md
├── src/
│   ├── app/{layout,page,providers}.tsx, globals.css
│   ├── config/design-tokens.ts       # hex tokens + hexToHslChannels()
│   ├── components/shell/SkipToContentLink.tsx
│   └── lib/errors.ts                 # StyleMeError hierarchy
├── tests/{setup.ts, unit/, integration/smoke.test.tsx, e2e/}
├── .gitignore  .env.example  README.md  CLAUDE.md
```

---

## References

- `CLAUDE.md` §2 (stack) · §4 (directory structure) · §10 P0#1 (this scaffold's decision record)
- `docs/sprint-plans/sprint-0/sprint-0-review.md` (real gate output)
- `docs/context/frontend-plan.md` (product vision)

---

**Status:** Delivered and verified (see SCAFFOLD-VERIFICATION.md). Tarea 0 = confirm it builds in your environment.
**Owner:** Leonardo Ibarra López (Feature Lead).
**Last updated:** 17 sep 2026 — sync to Next 16 / React 19 / Tailwind v4 / Node 22 (PR #15).
