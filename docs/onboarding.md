# Onboarding — de cero a verde en < 5 min

## 1. Requisitos

- **Node 20 LTS** — `nvm use` lee `.nvmrc` (o instala 20 a mano). `engines.node >= 18.17.0`.
- **npm 10+** (viene con Node 20).
- Git.

## 2. Clonar e instalar

```bash
git clone https://github.com/ManuelMendoza0206/MACHINE-BULLS.git
cd MACHINE-BULLS
nvm use            # Node 20
npm ci             # instala EXACTO lo del lockfile + arma los git hooks (husky)
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
| `CLAUDE.md`                                | fuente operativa (stack, SDD, errores, decisiones §10) |
| `CONTRIBUTING.md`                          | reglas de PR y flujo, resumidas                        |
| `openspec/specs/frontend/`                 | specs — la verdad de los contratos                     |
| `docs/sprint-plans/sprint-1-manifest.md`   | estructura canónica del Sprint 1                       |
| `docs/sprint-plans/sprint-1-init-<vos>.md` | tu lista de tareas                                     |
| `docs/sprint-0/SCAFFOLD-VERIFICATION.md`   | estado del scaffold + follow-ups                       |
