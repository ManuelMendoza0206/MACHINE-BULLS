# StyleMe Frontend

AI-powered fashion recommendation platform.

## Quick Start

### Prerequisites

- Node.js 18.17.0+ (check `.nvmrc`)
- npm 9.0.0+

### Installation

```bash
npm ci  # Use ci instead of install for reproducible builds
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Testing

```bash
# Unit tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run coverage

# E2E tests (Playwright)
npm run test:e2e
```

### Linting & Formatting

```bash
npm run lint    # Check for issues
npm run format  # Auto-fix formatting
npm run typecheck  # TypeScript validation
```

### Build

```bash
npm run build
npm start  # Serves the built app
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (ui/, shell/)
├── config/        # Configuration (design tokens)
├── lib/           # Utilities, API, errors
└── utils/         # Helper functions

tests/
├── unit/          # Vitest unit tests
├── integration/   # React + DOM tests
└── e2e/           # Playwright browser tests

openspec/
└── specs/         # Formal specification docs
    ├── frontend/
    └── backend/

docs/
├── context/       # Project context
├── clickup/       # Team coordination
├── sprint-plans/  # Sprint initialization docs
└── *.md           # Decision logs, planning
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + CSS variables
- **UI Components:** shadcn/ui + Radix
- **State:** Zustand, TanStack Query
- **Validation:** Zod
- **Testing:** Vitest, React Testing Library, Playwright
- **Code Quality:** ESLint, Prettier

## Specifications

All features are derived from formal specifications in `openspec/specs/frontend/`:

- `design-system/spec.md` — UI tokens, components, theme
- `app-shell-and-navigation/spec.md` — Layout, navigation, error handling
- `api-client-and-schemas/spec.md` — HTTP client, Zod schemas, error hierarchy
- `landing-and-auth-flow/spec.md` — Authentication
- `outfits-flow/spec.md` — Outfit composition
- `wardrobe-flow/spec.md` — Wardrobe management
- `vton-flow/spec.md` — Virtual try-on
- `profile-flow/spec.md` — User profile

## Development Standards

- ✅ **Strict TypeScript:** No `any`, all types explicit
- ✅ **Test-Driven:** Specs → tests → code
- ✅ **Accessibility:** WCAG AA compliance
- ✅ **Performance:** Lighthouse 90+
- ✅ **Security:** No hardcoded secrets, XSS/CSRF mitigations

## Contributing

1. Create a feature branch from `main`
2. Follow specs (openspec/specs/)
3. Write tests (unit + integration)
4. Run `npm run lint && npm run typecheck && npm run test`
5. Open PR (request review from @Leonardo-Ibarra + @Jaicel)

## License

Internal use only. Not for commercial distribution.
