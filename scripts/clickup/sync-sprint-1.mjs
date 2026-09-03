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
 *   node scripts/clickup/sync-sprint-1.mjs                          # dry run (all sections)
 *   node scripts/clickup/sync-sprint-1.mjs --apply                  # execute
 *   node scripts/clickup/sync-sprint-1.mjs --apply --no-create      # skip S0 task creation
 *   node scripts/clickup/sync-sprint-1.mjs --apply --list <id>      # force the list for S0 tasks
 *   node scripts/clickup/sync-sprint-1.mjs --apply --only=inreview,onhold   # re-run subset
 *     sections: retitle | tags | inreview | onhold | s0
 *
 * Tuning (env):
 *   CU_SLEEP_MS       delay between API calls (default 800; ClickUp free ~100 req/min)
 *   CU_REVIEW_STATUS  exact "in review" status name if auto-detection fails
 *   CU_HOLD_STATUS    exact "on hold" status name if auto-detection fails
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.clickup.com/api/v2';
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const CREATE = !argv.includes('--no-create');

// FIX: indexOf('--list') is -1 when absent → argv[0] ('--apply') was being used as the list id.
const _li = argv.indexOf('--list');
const FORCE_LIST = _li >= 0 ? (argv[_li + 1] ?? null) : null;

const _only = (argv.find(a => a.startsWith('--only=')) ?? '').slice('--only='.length);
const ONLY = _only ? new Set(_only.split(',').map(s => s.trim())) : null;
const want = section => !ONLY || ONLY.has(section);

const SLEEP_MS = Number(process.env.CU_SLEEP_MS ?? 800);
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// Throttled fetch with 429 backoff (honours Retry-After). Never silently drops a rate-limit.
async function cu(method, path, body, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30) * 1000;
      console.log(`         · 429 rate limit — esperando ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs + 500);
      continue;
    }
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
    await sleep(SLEEP_MS);
    return json;
  }
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

// Status names vary per Space. Resolve dynamically against each list's real statuses;
// env overrides win. Regexes are the fallback matchers.
const REVIEW_RE = /(in[\s-]?review|code[\s-]?review|pr[\s-]?review|reviewing|revisi[oó]n|en revisi)/i;
const HOLD_RE = /(on[\s-]?hold|hold|en espera|pausad|paused|stand[\s-]?by|blocked|bloquead)/i;

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

// list id -> [status names], cached
const _statusCache = new Map();
async function listStatuses(listId) {
  if (!listId) return [];
  if (_statusCache.has(listId)) return _statusCache.get(listId);
  const list = await cu('GET', `/list/${listId}`).catch(() => null);
  const names = (list?.statuses ?? []).map(s => s.status);
  _statusCache.set(listId, names);
  return names;
}

function resolveStatus(available, kind) {
  const override = kind === 'review' ? process.env.CU_REVIEW_STATUS : process.env.CU_HOLD_STATUS;
  const re = kind === 'review' ? REVIEW_RE : HOLD_RE;
  if (override) {
    const exact = available.find(s => s.toLowerCase() === override.toLowerCase());
    return exact ?? override; // trust the operator even if not in the cached list
  }
  return available.find(s => re.test(s)) ?? null;
}

/**
 * @param task full task object (needs .id, .status.status, .list.id)
 * @param kind 'review' | 'hold'
 */
async function setStatus(task, kind) {
  const available = await listStatuses(task.list?.id);
  const target = resolveStatus(available, kind);
  if (!target) {
    console.log(
      `  ${task.id}  ! sin estado tipo "${kind}" en la lista — disponibles: [${available.join(', ') || '?'}]`
    );
    console.log(`         → fijá CU_${kind === 'review' ? 'REVIEW' : 'HOLD'}_STATUS="<nombre exacto>" y re-corré`);
    return 'nostatus';
  }
  const cur = task.status?.status ?? '';
  if (cur.toLowerCase() === target.toLowerCase()) {
    console.log(`  ${task.id}  = ${target}`);
    return 'ok';
  }
  console.log(`  ${task.id}  "${cur}" -> "${target}"`);
  if (!APPLY) return 'dry';
  try {
    await cu('PUT', `/task/${task.id}`, { status: target });
    return 'done';
  } catch (e) {
    console.log(`         ! ${e.message.split('\n')[0]}`);
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
    if (APPLY) {
      try {
        await cu('PUT', `/task/${id}`, { name });
        console.log('         done');
      } catch (e) {
        console.log(`         ! ${e.message.split('\n')[0]}`);
      }
    }
  }
}

async function tags() {
  console.log('\n— Tags (repo:backend) —');
  for (const [id, wantTags] of Object.entries(ADD_TAGS)) {
    const cur = await cu('GET', `/task/${id}`).catch(() => null);
    if (!cur) {
      console.log(`  ${id}  ! not found`);
      continue;
    }
    const have = (cur.tags ?? []).map(t => t.name);
    const missing = wantTags.filter(t => !have.includes(t));
    if (!missing.length) {
      console.log(`  ${id}  = has ${wantTags.join(', ')}`);
      continue;
    }
    console.log(`  ${id}  + ${missing.join(', ')}`);
    if (APPLY) {
      for (const t of missing) {
        try {
          await cu('POST', `/task/${id}/tag/${encodeURIComponent(t)}`);
        } catch (e) {
          console.log(`         ! ${e.message.split('\n')[0]}`);
        }
      }
    }
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
    await setStatus(cur, 'review');
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
        await setStatus({ ...t, list: t.list ?? { id: list.id } }, 'hold');
      }
    }
  }
  console.log('  (revisá la lista de arriba; son ML/Data del repo backend)');
}

async function createS0() {
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
    if ((existing ?? []).some(t => t.name.startsWith(`[${code}]`))) {
      console.log(`  ${code}  = exists`);
      continue;
    }
    console.log(`  ${code}  create (${status})`);
    if (APPLY) {
      try {
        const created = await cu('POST', `/list/${target.id}/task`, {
          name: `[${code}] ${title.slice(0, 100)}`,
          priority: 3,
        });
        if (status !== 'to do') {
          const avail = await listStatuses(target.id);
          const exact = avail.find(s => s.toLowerCase() === status.toLowerCase());
          if (exact) await cu('PUT', `/task/${created.id}`, { status: exact });
          else console.log(`         · estado "${status}" no existe en la lista; queda en el default`);
        }
      } catch (e) {
        console.log(`         ! ${e.message.split('\n')[0]}`);
      }
    }
  }
}

// ── run ──────────────────────────────────────────────────────────────────────

console.log(`\n=== ClickUp Sprint 1 reconciliation — ${APPLY ? 'APPLY' : 'DRY RUN'} ===`);
if (ONLY) console.log(`(solo: ${[...ONLY].join(', ')})`);
console.log('');
try {
  await bootstrap();
  console.log(`workspace: ${TEAM.name} (${TEAM.id})\n`);
  if (want('retitle')) await retitle();
  if (want('tags')) await tags();
  if (want('inreview')) await inReview();
  if (want('onhold')) await onHold();
  if (want('s0') && CREATE) await createS0();
  console.log(`\n${APPLY ? 'applied.' : 'dry run — re-run with --apply to write.'}\n`);
} catch (e) {
  console.error(`\nx ${e.message}\n`);
  process.exit(1);
}
