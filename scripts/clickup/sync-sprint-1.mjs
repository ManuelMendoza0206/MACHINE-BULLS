#!/usr/bin/env node
/**
 * Reconcile the StyleMe Sprint 1 ClickUp board with the repo docs.
 * Implements docs/sprint-plans/sprint-1-manifest.md §7.
 *
 * DRY RUN by default — prints every change without touching ClickUp.
 * Pass --apply to actually write.
 *
 * Token (never hardcode it here):
 *   - env CLICKUP_API_TOKEN, or
 *   - a file scripts/clickup/.token containing just the token (gitignored).
 *
 * Usage:
 *   node scripts/clickup/sync-sprint-1.mjs                 # dry run
 *   node scripts/clickup/sync-sprint-1.mjs --apply         # execute
 *   node scripts/clickup/sync-sprint-1.mjs --apply --no-create   # retitle/tag only
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.clickup.com/api/v2';
const APPLY = process.argv.includes('--apply');
const CREATE = !process.argv.includes('--no-create');

// ── token ────────────────────────────────────────────────────────────────────
function readToken() {
  if (process.env.CLICKUP_API_TOKEN) return process.env.CLICKUP_API_TOKEN.trim();
  try {
    return readFileSync(resolve(HERE, '.token'), 'utf8').trim();
  } catch {
    console.error(
      'No token. Set env CLICKUP_API_TOKEN or create scripts/clickup/.token (gitignored).'
    );
    process.exit(1);
  }
}
const TOKEN = readToken();
const headers = { Authorization: TOKEN, 'Content-Type': 'application/json' };

async function cu(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return json;
}

// ── the reconciliation plan (manifest §7) ────────────────────────────────────

/** Title corrections, keyed by ClickUp task id. */
const RETITLE = {
  '86e301ddn':
    'Los 5 componentes de §2.4 (Button, Card, Badge, Skeleton, Progress) en src/components/ui/, tipados sin any, usando cn(). Sin Storybook.',
  '86e301dpf':
    'GlobalError cubre las 4 ramas (ApiError, NetworkError, ValidationError, Error genérico), cada una con copy y fallback UI',
  '86e301dpw':
    'Cobertura medida en src/components/shell/ y src/app/providers.tsx (el gate ≥80% entra en Sprint 2 — P1#8)',
  '86e301dda':
    'Los 6 pares de texto cumplen contraste AA (≥4.5:1) en claro y oscuro + globals.css sincronizado con design-tokens.ts',
  '86e301de2':
    'Los requisitos de a11y de la Requirement "Accessibility compliance" cubiertos por test (aria-disabled Button, aria-busy Skeleton, role Progress, texto-no-solo-color Badge)',
  '86e302a2b':
    'Visual regression sobre los 5 componentes base (Button, Card, Badge, Skeleton, Progress), claro + oscuro; baselines en runner determinista (Docker/ubuntu)',
  '86e301dea':
    'Tests de la jerarquía de errores (src/lib/errors.ts ya existe desde el scaffold) — verificar que coincide con la spec CLAUDE.md §5',
};

/** Tags to add (merged with existing). */
const ADD_TAGS = {
  '86e3122fr': ['repo:backend'],
  '86e3122fv': ['repo:backend'],
  '86e3122fy': ['repo:backend'],
  '86e3122g5': ['repo:backend'],
};

/** Status moves — the two tasks already implemented on branches, awaiting PR review. */
const SET_STATUS = {
  '86e301dd8': 'in review',
  '86e301dda': 'in review',
  '86e301ddf': 'in review',
  '86e301ddw': 'in review',
  '86e301dpm': 'in review',
};

/** Sprint 0 tasks to create (traceability — constitution §5). */
const S0_TASKS = [
  [
    'S0-1',
    'Scaffold Next.js 14.2 + React 18.3 + Node 20; npm ci reproducible; verify en verde',
    'complete',
  ],
  ['S0-2', 'Design tokens WCAG-AA + tailwind.config derivado + sync globals.css', 'complete'],
  ['S0-3', 'Specs design-system y app-shell migradas a formato OpenSpec nativo', 'complete'],
  ['S0-4', 'CI ci.yml — 3 jobs (quality/build/e2e), Node 20, concurrency-cancel', 'complete'],
  [
    'S0-5',
    'Seguridad base: CSP enforced, headers, poweredByHeader off, imágenes acotadas',
    'complete',
  ],
  ['S0-6', 'Gobernanza: CODEOWNERS, pull_request_template.md, .gitattributes', 'complete'],
  [
    'S0-7',
    'Entorno dev: editorconfig, husky, lint-staged, commitlint, dependabot, issue templates, .vscode, CONTRIBUTING, onboarding',
    'complete',
  ],
  [
    'S0-8',
    'Configurar branch protection en main (require PR, review CODEOWNERS, status checks, sin push directo/force) + secreto CODECOV_TOKEN',
    'to do',
  ],
  [
    'S0-9',
    'Reconciliar tablero ClickUp con la documentación (este script) + exportar SPRINT-1-MASTER.csv',
    'to do',
  ],
];

// ── run ──────────────────────────────────────────────────────────────────────

const mode = APPLY ? 'APPLY' : 'DRY RUN';
console.log(`\n=== ClickUp Sprint 1 reconciliation — ${mode} ===\n`);

async function retitle() {
  console.log('— Retitles —');
  for (const [id, name] of Object.entries(RETITLE)) {
    const cur = await cu('GET', `/task/${id}`);
    if (cur.name === name) {
      console.log(`  ${id}  ✓ already correct`);
      continue;
    }
    console.log(`  ${id}  "${cur.name}"\n         → "${name}"`);
    if (APPLY) await cu('PUT', `/task/${id}`, { name });
  }
}

async function tags() {
  console.log('\n— Tags —');
  for (const [id, want] of Object.entries(ADD_TAGS)) {
    const cur = await cu('GET', `/task/${id}`);
    const have = (cur.tags ?? []).map(t => t.name);
    const missing = want.filter(t => !have.includes(t));
    if (!missing.length) {
      console.log(`  ${id}  ✓ has ${want.join(', ')}`);
      continue;
    }
    console.log(`  ${id}  + ${missing.join(', ')}`);
    if (APPLY)
      for (const t of missing) await cu('POST', `/task/${id}/tag/${encodeURIComponent(t)}`);
  }
}

async function statuses() {
  console.log('\n— Status —');
  for (const [id, status] of Object.entries(SET_STATUS)) {
    const cur = await cu('GET', `/task/${id}`);
    if ((cur.status?.status ?? '').toLowerCase() === status.toLowerCase()) {
      console.log(`  ${id}  ✓ ${status}`);
      continue;
    }
    console.log(`  ${id}  "${cur.status?.status}" → "${status}"`);
    if (APPLY) {
      try {
        await cu('PUT', `/task/${id}`, { status });
      } catch (e) {
        console.log(
          `         ⚠ ${e.message.split('\n')[0]} (¿nombre de estado distinto en tu Space?)`
        );
      }
    }
  }
}

async function createS0() {
  if (!CREATE) return;
  console.log('\n— Sprint 0 tasks —');
  // Discover the Deploy list (S0 work is infra/release).
  const { teams } = await cu('GET', '/team');
  const team = teams.find(t => /machine ?bulls/i.test(t.name)) ?? teams[0];
  const { spaces } = await cu('GET', `/team/${team.id}/space`);
  let listId;
  for (const space of spaces) {
    const { folders } = await cu('GET', `/space/${space.id}/folder`).catch(() => ({ folders: [] }));
    const folderLists = folders.flatMap(f => f.lists ?? []);
    const { lists } = await cu('GET', `/space/${space.id}/list`).catch(() => ({ lists: [] }));
    const all = [...folderLists, ...lists];
    const deploy = all.find(l => /deploy/i.test(l.name));
    if (deploy) {
      listId = deploy.id;
      console.log(`  list: ${space.name} / ${deploy.name} (${deploy.id})`);
      break;
    }
  }
  if (!listId) {
    console.log('  ⚠ no encontré una lista "Deploy" — pasá --list <id> o creá las S0 a mano');
    return;
  }
  const { tasks: existing } = await cu('GET', `/list/${listId}/task`);
  for (const [code, title, status] of S0_TASKS) {
    const name = `[${code}] ${title.slice(0, 90)}`;
    if (existing.some(t => t.name.startsWith(`[${code}]`))) {
      console.log(`  ${code}  ✓ exists`);
      continue;
    }
    console.log(`  ${code}  create (${status})`);
    if (APPLY) {
      const created = await cu('POST', `/list/${listId}/task`, { name, priority: 3 });
      if (status !== 'to do') await cu('PUT', `/task/${created.id}`, { status }).catch(() => {});
    }
  }
}

try {
  await retitle();
  await tags();
  await statuses();
  await createS0();
  console.log(`\n${APPLY ? '✅ applied' : 'ℹ dry run — re-run with --apply to write'}\n`);
} catch (e) {
  console.error(`\n✖ ${e.message}\n`);
  process.exit(1);
}
