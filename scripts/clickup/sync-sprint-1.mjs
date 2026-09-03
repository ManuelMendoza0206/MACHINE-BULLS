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
 *   node scripts/clickup/sync-sprint-1.mjs                       # dry run
 *   node scripts/clickup/sync-sprint-1.mjs --apply               # execute
 *   node scripts/clickup/sync-sprint-1.mjs --apply --no-create   # skip S0 task creation
 *   node scripts/clickup/sync-sprint-1.mjs --list <id>           # force the list for S0 tasks
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.clickup.com/api/v2';
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const CREATE = !argv.includes('--no-create');
const FORCE_LIST = argv[argv.indexOf('--list') + 1] || null;

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
const headers = { Authorization: readToken(), 'Content-Type': 'application/json' };

async function cu(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return json;
}

// ── the reconciliation plan (manifest §7) ────────────────────────────────────

/** Title corrections, keyed by ClickUp task id. */
const RETITLE = {
  '86e301ddn':
    'Los 5 componentes de §2.4 (Button, Card, Badge, Skeleton, Progress) en src/components/ui/, tipados sin any, usando cn(). Sin Storybook.',
  '86e301dpf':
    'GlobalError cubre las 4 ramas (ApiError, NetworkError, ValidationError, Error genérico), match por error.name; sin fugar detalle técnico',
  '86e301dpw':
    'Cobertura medida en src/components/shell/ y src/app/providers.tsx (el gate ≥80% entra en Sprint 2 — P1#8)',
  '86e301dda':
    'Los 6 pares de texto cumplen contraste AA (≥4.5:1) en claro y oscuro + globals.css sincronizado con design-tokens.ts',
  '86e301de2':
    'Los requisitos de a11y de "Accessibility compliance" cubiertos por test (aria-disabled Button, role=status+aria-busy Skeleton, role=progressbar Progress, texto-no-solo-color Badge)',
  '86e302a2b':
    'Visual regression sobre los 5 componentes base (Button, Card, Badge, Skeleton, Progress), claro + oscuro; baselines en runner determinista (Docker/ubuntu)',
  '86e301dea':
    'Tests de la jerarquía de errores (src/lib/errors.ts ya existe desde el scaffold) — verificar que coincide con CLAUDE.md §5',
};

/** Tags to add (merged with existing). */
const ADD_TAGS = {
  '86e3122fr': ['repo:backend'],
  '86e3122fv': ['repo:backend'],
  '86e3122fy': ['repo:backend'],
  '86e3122g5': ['repo:backend'],
};

/**
 * Leonardo's 14 Asiento A tasks (design-system + app-shell) — the whole deliverable is
 * implemented on `feat/leonardo-sprint-1`, awaiting PR review → "in review".
 */
const LEONARDO_FRONTEND_IDS = [
  '86e301dd8',
  '86e301dda',
  '86e301ddf',
  '86e301ddn',
  '86e301ddw',
  '86e301ddy',
  '86e301de2',
  '86e301dp5',
  '86e301dp7',
  '86e301dp8',
  '86e301dpf',
  '86e301dpk',
  '86e301dpm',
  '86e301dpw',
];
const IN_REVIEW_STATUS = 'in review';

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

/** Titles that are NOT frontend Asiento A work (belong to the backend/ML repo). */
const OUT_OF_SCOPE_RE =
  /\b(EDA|ResNet|ResNet-?50|embedding|CLIP|dataset|entrenamiento|training|fine-?tun)/i;
const ON_HOLD_STATUS = 'on hold';

// ── helpers ──────────────────────────────────────────────────────────────────

let TEAM, SPACES;
async function bootstrap() {
  const { teams } = await cu('GET', '/team');
  TEAM = teams.find(t => /machine ?bulls/i.test(t.name)) ?? teams[0];
  ({ spaces: SPACES } = await cu('GET', `/team/${TEAM.id}/space`));
}

function leonardo() {
  const m = (TEAM.members ?? []).find(x =>
    /leo|leonardo|ibarra/i.test(`${x.user?.username} ${x.user?.email}`)
  );
  return m?.user ?? null;
}

async function allLists() {
  const out = [];
  for (const space of SPACES) {
    const { folders } = await cu('GET', `/space/${space.id}/folder`).catch(() => ({ folders: [] }));
    for (const f of folders) for (const l of f.lists ?? []) out.push({ ...l, space: space.name });
    const { lists } = await cu('GET', `/space/${space.id}/list`).catch(() => ({ lists: [] }));
    for (const l of lists) out.push({ ...l, space: space.name });
  }
  return out;
}

async function setStatus(id, status, currentStatus) {
  if ((currentStatus ?? '').toLowerCase() === status.toLowerCase()) return 'ok';
  console.log(`  ${id}  "${currentStatus}" -> "${status}"`);
  if (!APPLY) return 'dry';
  try {
    await cu('PUT', `/task/${id}`, { status });
    return 'done';
  } catch (e) {
    console.log(`         ! ${e.message.split('\n')[0]} (¿nombre de estado distinto en tu Space?)`);
    return 'err';
  }
}

// ── sections ─────────────────────────────────────────────────────────────────

async function retitle() {
  console.log('— Retitles —');
  for (const [id, name] of Object.entries(RETITLE)) {
    const cur = await cu('GET', `/task/${id}`).catch(() => null);
    if (!cur) {
      console.log(`  ${id}  ! not found`);
      continue;
    }
    if (cur.name === name) {
      console.log(`  ${id}  = already correct`);
      continue;
    }
    console.log(`  ${id}  "${cur.name}"\n         -> "${name}"`);
    if (APPLY) await cu('PUT', `/task/${id}`, { name });
  }
}

async function tags() {
  console.log('\n— Tags (repo:backend) —');
  for (const [id, want] of Object.entries(ADD_TAGS)) {
    const cur = await cu('GET', `/task/${id}`).catch(() => null);
    if (!cur) {
      console.log(`  ${id}  ! not found`);
      continue;
    }
    const have = (cur.tags ?? []).map(t => t.name);
    const missing = want.filter(t => !have.includes(t));
    if (!missing.length) {
      console.log(`  ${id}  = has ${want.join(', ')}`);
      continue;
    }
    console.log(`  ${id}  + ${missing.join(', ')}`);
    if (APPLY)
      for (const t of missing) await cu('POST', `/task/${id}/tag/${encodeURIComponent(t)}`);
  }
}

async function inReview() {
  console.log('\n— Asiento A -> in review (deliverable on feat/leonardo-sprint-1) —');
  for (const id of LEONARDO_FRONTEND_IDS) {
    const cur = await cu('GET', `/task/${id}`).catch(() => null);
    if (!cur) {
      console.log(`  ${id}  ! not found`);
      continue;
    }
    if ((await setStatus(id, IN_REVIEW_STATUS, cur.status?.status)) === 'ok')
      console.log(`  ${id}  = ${IN_REVIEW_STATUS}`);
  }
}

async function onHold() {
  console.log('\n— Leonardo: tareas fuera de alcance de Asiento A -> on hold —');
  const leo = leonardo();
  if (!leo) {
    console.log('  ! no pude identificar a Leonardo en TEAM.members');
    return;
  }
  console.log(`  assignee: ${leo.username} (${leo.id})`);
  const lists = await allLists();
  const seen = new Set();
  for (const list of lists) {
    const { tasks } = await cu(
      'GET',
      `/list/${list.id}/task?subtasks=true&assignees[]=${leo.id}`
    ).catch(() => ({ tasks: [] }));
    for (const t of tasks) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      const frontend = LEONARDO_FRONTEND_IDS.includes(t.id) || /^\[?S0-/.test(t.name);
      if (frontend) continue;
      if (OUT_OF_SCOPE_RE.test(t.name)) {
        console.log(`  ${t.id}  [${list.space}/${list.name}]  "${t.name}"`);
        await setStatus(t.id, ON_HOLD_STATUS, t.status?.status);
      }
    }
  }
  console.log('  (revisá la lista de arriba antes de --apply; son ML/Data del repo backend)');
}

async function createS0() {
  if (!CREATE) return;
  console.log('\n— Sprint 0 tasks —');
  const lists = await allLists();
  const target = FORCE_LIST
    ? { id: FORCE_LIST, name: '(forzada)', space: '' }
    : lists.find(l => /deploy/i.test(l.name));
  if (!target) {
    console.log('  ! no encontré lista "Deploy" — pasá --list <id>');
    return;
  }
  console.log(`  list: ${target.space}/${target.name} (${target.id})`);
  const { tasks: existing } = await cu('GET', `/list/${target.id}/task`).catch(() => ({
    tasks: [],
  }));
  for (const [code, title, status] of S0_TASKS) {
    if (existing.some(t => t.name.startsWith(`[${code}]`))) {
      console.log(`  ${code}  = exists`);
      continue;
    }
    console.log(`  ${code}  create (${status})`);
    if (APPLY) {
      const created = await cu('POST', `/list/${target.id}/task`, {
        name: `[${code}] ${title.slice(0, 100)}`,
        priority: 3,
      });
      if (status !== 'to do') await setStatus(created.id, status, 'to do');
    }
  }
}

// ── run ──────────────────────────────────────────────────────────────────────

console.log(`\n=== ClickUp Sprint 1 reconciliation — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);
try {
  await bootstrap();
  console.log(`workspace: ${TEAM.name} (${TEAM.id})\n`);
  await retitle();
  await tags();
  await inReview();
  await onHold();
  await createS0();
  console.log(`\n${APPLY ? 'applied.' : 'dry run — re-run with --apply to write.'}\n`);
} catch (e) {
  console.error(`\nx ${e.message}\n`);
  process.exit(1);
}
