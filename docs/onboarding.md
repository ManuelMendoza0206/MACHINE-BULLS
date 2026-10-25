# Onboarding — de cero a verde en < 5 min

## 1. Requisitos

- **Node 22 LTS** (o `>=20.19`) — `engines.node` de `frontend/package.json`; CI corre en Node 22.
- **npm 10+** (viene con Node 20/22).
- Git.

## 2. Clonar e instalar

```bash
git clone https://github.com/ManuelMendoza0206/MACHINE-BULLS.git
cd MACHINE-BULLS/frontend
nvm use 22           # Node 22 (o >=20.19)
npm ci               # instala EXACTO lo del lockfile + arma los git hooks (husky)
cp .env.example .env.local   # y rellená NEXT_PUBLIC_API_BASE_URL
```

## 3. Verificar (esto es la "Tarea 0" del Asiento A)

```bash
npm run verify     # typecheck + lint + test + build  → todo exit 0
npm run test:e2e   # Playwright (instala Chromium la 1ª vez: npx playwright install chromium)
```

Salida esperada: todo verde. Si algo falla en tu entorno, abrí un issue (plantilla "Bug"),
**no** parchees `main`.

## 4. Correr la app

```bash
npm run dev        # http://localhost:3000
```

## 5. Empezar una tarea

```bash
cd frontend        # (ya estás acá si seguiste el paso 2)
git checkout -b feat/tareaN-<slug> main
# spec (openspec/specs/frontend/...) → test en rojo → código → verde
npm run verify && npm run test:e2e
git add -A && git commit -m "feat(tareaN): ..."   # los hooks corren solos
git push -u origin feat/tareaN-<slug>
# abrir PR (plantilla auto) → revisor ≠ autor → merge
```

## 6. VS Code

Acepta las extensiones recomendadas (`.vscode/extensions.json`): ESLint, Prettier,
Tailwind, EditorConfig, Vitest, Playwright. `format-on-save` ya está configurado.

## Mapa rápido

| Dónde                                      | Qué                                                    |
| ------------------------------------------ | ------------------------------------------------------ |
| `CLAUDE.md`                                | fuente operativa (§10.1 estado vigente, stack, SDD, errores, decisiones) |
| `CONTRIBUTING.md`                          | reglas de PR y flujo, resumidas                        |
| `openspec/specs/frontend/`                 | specs frontend — la verdad de los contratos            |
| `openspec/specs/backend/`                  | specs backend (FastAPI/ML)                             |
| `docs/sprint-plans/sprint-3/sprint-3-review.md` | review de QA más reciente con estado real          |
| `docs/sprint-plans/README.md`              | índice de sprints (qué está cerrado/en curso)          |
| `docs/clickup/clickup_estructura.md`       | estructura del tablero ClickUp + proceso               |
| `docs/sprint-plans/sprint-0/sprint-0-review.md`   | estado del scaffold + follow-ups                       |
