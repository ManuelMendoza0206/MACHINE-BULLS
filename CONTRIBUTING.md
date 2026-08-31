# Contributing — StyleMe Frontend

La versión operativa completa vive en `CLAUDE.md`. Esto es el resumen para un humano
que abre el repo por primera vez. Onboarding paso a paso: `docs/onboarding.md`.

## Reglas no negociables (`.speckit/constitution.md` §3)

- `main` está protegida. **Cero commits directos.** Todo cambio entra por Pull Request.
- **≥ 1 revisor que no sea el autor** aprueba antes del merge (asignado por `.github/CODEOWNERS`).
- Cada PR **declara el uso de IA** (qué %/secciones y qué pruebas lo validaron).
- Rechazo automático si el diff trae credenciales/secretos/datos personales, o pruebas en rojo,
  o criterios de aceptación incompletos.
- **Prohibido pegar secretos** (API keys, tokens) en prompts de herramientas de IA.

## Flujo (Spec-Driven Development)

```
SPEC (openspec/specs/)  →  TEST en rojo  →  CÓDIGO mínimo  →  REFACTOR  →  PR
```

Ningún archivo en `src/` se implementa sin una Requirement en `openspec/specs/frontend/` que
lo defina. Cambiar una spec sigue el flujo del CLI de OpenSpec (`openspec/changes/<nombre>/`).

## Ramas y commits

- Una rama por Tarea: `feat/tareaN-<slug>` o `chore/<slug>`, desde `main`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org) — `feat(tarea1): ...`,
  `chore(sprint-0): ...`, `fix: ...`, `docs: ...`. El hook `commit-msg` lo verifica.

## Antes de abrir el PR

```bash
npm run verify      # typecheck + lint + test + build
npm run test:e2e
```

Los hooks de git ayudan localmente (no reemplazan CI):

| Hook         | Qué corre                                               |
| ------------ | ------------------------------------------------------- |
| `pre-commit` | `lint-staged` (prettier + eslint --fix sobre lo staged) |
| `commit-msg` | `commitlint` (Conventional Commits)                     |
| `pre-push`   | `npm run typecheck`                                     |

`--no-verify` solo en emergencias; CI es el gate real (`quality` / `build` / `e2e`).

## PR

La plantilla (`.github/pull_request_template.md`) pide: objetivo, spec + tarea ClickUp,
verificaciones ejecutadas, **declaración de uso de IA**, y el checklist. No la borres.

## DoD de una tarea

- [ ] `verify` + `test:e2e` en verde; CI verde en el PR
- [ ] Cada requisito de spec citado, cubierto por test
- [ ] Cero `any`; cero color hardcodeado fuera de `design-tokens.ts` / `globals.css`
- [ ] PR aprobado por un par ≠ autor, con declaración de IA
- [ ] Evidencia enlazada en la tarjeta de ClickUp
