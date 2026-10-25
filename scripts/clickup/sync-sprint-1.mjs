#!/usr/bin/env node
/**
 * sync-sprint-1.mjs — Reconciliación del tablero ClickUp (Sprint 1)
 *
 * Contrato (docs/sprint-plans/sprint-1/sprint-1-manifest.md §7–§8):
 *   - Dry-run por defecto: solo AUDITA y reporta drift, no escribe en el tablero.
 *   - `--apply` escribe las correcciones seguras (retitular, etiquetar, borrar duplicado).
 *   - `--export-csv` escribe docs/clickup/SPRINT-1-MASTER.csv (evidencia de estado).
 *   - Credencial NUNCA versionada: env CLICKUP_API_TOKEN → scripts/clickup/.token → .env local.
 *
 * Dueño: Asiento D (Manuel). Uso:
 *   node scripts/clickup/sync-sprint-1.mjs              # auditoría (dry-run)
 *   node scripts/clickup/sync-sprint-1.mjs --apply      # corrige el tablero
 *   node scripts/clickup/sync-sprint-1.mjs --export-csv # snapshot CSV
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEAM_ID_DEFAULT = "90171461696";
const SPACE_DEFAULT = "90176873699"; // MachineBulls⚙️🐂

// ---------------------------------------------------------------------------
// Correcciones canónicas (sprint-1-manifest.md §3–§6)
// ---------------------------------------------------------------------------

// Retitular: ClickUp debe quedar EXACTAMENTE con estos títulos (se normalizan
// solo los ** de markdown para comparar).
const TITLE_FIXES = {
  "86e301ddn": {
    title: "Los 5 componentes de §2.4 (Button, Card, Badge, Skeleton, Progress), tipados sin `any`, usando `cn()`. Sin Storybook.",
    section: "manifest §3",
  },
  "86e301dpf": {
    title: "GlobalError cubre las 4 ramas (ApiError, NetworkError, ValidationError, Error genérico), cada una con copy y fallback UI",
    section: "manifest §3",
  },
  "86e301dpw": {
    title: "Cobertura medida en src/components/shell/ y src/app/providers.tsx (el gate ≥ 80% entra en Sprint 2 — P1#8)",
    section: "manifest §3",
  },
  "86e301dda": {
    title: "Los 6 pares de texto cumplen ≥ 4.5:1 en claro y oscuro + globals.css sincronizado con design-tokens.ts",
    section: "manifest §3",
  },
  "86e301de2": {
    title: "Los requisitos de a11y de la Requirement Accessibility compliance cubiertos por test (aria-disabled Button, aria-busy Skeleton, role Progress, texto-no-solo-color Badge)",
    section: "manifest §3",
  },
  "86e302a2b": {
    title: "Visual regression sobre los 5 componentes (Button, Card, Badge, Skeleton, Progress)",
    section: "manifest §5",
  },
};

// Solo descripción (corrección manual en la UI — el script solo recuerda el §)
const DESCRIPTION_NOTES = {
  "86e301dea": "manifest §4 — ref CLAUDE.md §3.3 → §5; la tarea es tests + verificar, errors.ts ya existe",
  "86e301de7": "manifest §4 — apiRequest<T> consume NEXT_PUBLIC_API_BASE_URL (D3)",
  "86e301e09": "manifest §6 — reescribir descripción: (a) endurecer ci.yml (audit, cache Playwright), (b) branch protection en main, (c) secreto CODECOV_TOKEN",
  "86e301e0m": "manifest §6 — Sentry: @sentry/nextjs (no react) + pino, en este repo; parte Python va al repo backend",
  "86e301e0t": "manifest §6 — fold del npm audit dentro del job quality del ci.yml",
  "86e302a5f": "manifest §6 — Prometheus/Grafana/docker-compose van al repo backend; aquí solo Web Vitals + slos.md",
  "86e302a5u": "manifest §6 — ídem 86e302a5f",
  "86e302a7u": "manifest §6 — changelog: 5 componentes (no 8) + auth es Supabase (no bcrypt)",
  "86e302a2n": "manifest §5 — gate cobertura: setup S1, enforcement como merge-gate S2 (P1#8)",
};

// Etiquetar repo:backend (tareas de Jaicel que NO cuentan como avance de este repo)
const BACKEND_TAG_IDS = ["86e3122fr", "86e3122fv", "86e3122fy", "86e3122g5"];
const BACKEND_TAG_NAME = "repo:backend";

// Duplicado a eliminar: "Tarea 6 / API skeleton" del Asiento A si existe con otro ID
// (los originales válidos son 86e301de7 / 86e301dea de Jaicel — manifest §3 + CLAUDE.md D4)
const VALID_API_SKELETON_IDS = ["86e301de7", "86e301dea"];
const isApiSkeletonDup = (t) =>
  /api skeleton/i.test(t.name) && /tarea ?6/i.test(t.name) && !VALID_API_SKELETON_IDS.includes(t.id);

// ---------------------------------------------------------------------------
// Credencial
// ---------------------------------------------------------------------------
function loadToken() {
  if (process.env.CLICKUP_API_TOKEN) return process.env.CLICKUP_API_TOKEN.trim();
  const tokenFile = path.join(REPO_ROOT, "scripts", "clickup", ".token");
  if (existsSync(tokenFile)) return readFileSync(tokenFile, "utf8").trim();
  // .env local (gitignoreado) — con el formato CLICKUP_API_TOKEN=pk_...
  const envFile = path.join(REPO_ROOT, ".env");
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .find((l) => /^CLICKUP_API_TOKEN\s*=/.test(l));
    if (line) return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
  console.error("ERROR: no hay credencial. Usa CLICKUP_API_TOKEN, scripts/clickup/.token o el .env local.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// API helper (ClickUp v2)
// ---------------------------------------------------------------------------
const TOKEN = loadToken();
async function api(apiPath, method = "GET", body = undefined) {
  const res = await fetch(`https://api.clickup.com/api/v2${apiPath}`, {
    method,
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${apiPath} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

const dump = (id) =>
  api(`/task/${id}`).catch(() => null) ?? null;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const EXPORT_CSV = args.has("--export-csv");
const TEAM_ID = process.env.CLICKUP_TEAM_ID || TEAM_ID_DEFAULT;
const SPACE_ID = process.env.CLICKUP_SPACE_ID || SPACE_DEFAULT;

const normalize = (s) => s.replaceAll("**", "").replace(/\s+/g, " ").trim();

async function main() {
  console.log(`ClickUp sync — espacio ${SPACE_ID}, modo: ${APPLY ? "APPLY" : "dry-run"}\n`);

  const team = await api(`/team`);
  const space = (await api(`/team/${TEAM_ID}/space`)).spaces.find((s) => s.id === SPACE_ID);
  if (!space) throw new Error(`Espacio ${SPACE_ID} no encontrado en el equipo ${TEAM_ID}`);
  console.log(`Equipo: ${team.teams?.[0]?.name ?? TEAM_ID} · Espacio: ${space.name}\n`);

  // 1. Recolectar tareas de todas las listas
  const lists = (await api(`/space/${SPACE_ID}/list?archived=false`)).lists ?? [];
  const allTasks = [];
  for (const list of lists) {
    const { tasks } = await api(`/list/${list.id}/task?subtasks=true&archived=false&page=0`);
    for (const t of tasks ?? []) allTasks.push({ ...t, listName: list.name });
  }
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  console.log(`Listas: ${lists.length} · Tareas (con subtasks): ${allTasks.length}\n`);

  let drift = 0;
  let fixed = 0;

  // 2. Retitular
  console.log("── Retitulado (manifest §3/§5) ──");
  for (const [id, fix] of Object.entries(TITLE_FIXES)) {
    const t = byId.get(id);
    if (!t) {
      console.log(`  ${id}: ❌ no existe en el tablero (${fix.section})`);
      drift++;
      continue;
    }
    if (normalize(t.name) === normalize(fix.title)) {
      console.log(`  ${id} "${t.name.slice(0, 60)}": ✅ correcto`);
      continue;
    }
    console.log(`  ${id} "${t.name.slice(0, 60)}": ❌ drift (${fix.section})`);
    drift++;
    if (APPLY) {
      await api(`/task/${id}`, "PUT", { name: fix.title });
      console.log(`     → retitulado ✔`);
      fixed++;
    }
  }

  // 3. Duplicado "Tarea 6"
  console.log("\n── Duplicado Tarea 6 / API skeleton (manifest §3) ──");
  const dups = allTasks.filter(isApiSkeletonDup);
  for (const t of dups) {
    console.log(`  ${t.id} "${t.name}": ❌ duplicado de ${VALID_API_SKELETON_IDS.join("/")}`);
    drift++;
    if (APPLY) {
      await api(`/task/${t.id}`, "DELETE");
      console.log(`     → eliminado ✔`);
      fixed++;
    }
  }
  if (!dups.length) console.log("  Sin duplicados ✅");

  // 4. Etiqueta repo:backend
  console.log("\n── Etiqueta repo:backend (manifest §4) ──");
  let tagExists = true;
  if (APPLY) {
    try {
      await api(`/space/${SPACE_ID}/tag`, "POST", {
        name: BACKEND_TAG_NAME,
        tag_fg: "#ffffff",
        tag_bg: "#7c3aed",
      });
      console.log(`  tag "${BACKEND_TAG_NAME}" creado (si no existía)`);
    } catch {
      tagExists = byId.size > 0; // tag ya existe en el espacio → ok
    }
  }
  for (const id of BACKEND_TAG_IDS) {
    const t = byId.get(id);
    if (!t) {
      console.log(`  ${id}: ❌ no existe`);
      drift++;
      continue;
    }
    const tagged = (t.tags ?? []).some((g) => g.name === BACKEND_TAG_NAME);
    if (tagged) {
      console.log(`  ${id}: ✅ etiquetado`);
      continue;
    }
    console.log(`  ${id} "${t.name.slice(0, 60)}": ❌ sin etiqueta ${BACKEND_TAG_NAME}`);
    drift++;
    if (APPLY && tagExists) {
      await api(`/task/${id}/tag/${encodeURIComponent(BACKEND_TAG_NAME)}`, "POST", { tag_name: BACKEND_TAG_NAME });
      console.log(`     → etiquetado ✔`);
      fixed++;
    }
  }

  // 5. Recordatorios de descripción (no automatizable de forma segura)
  console.log("\n── Descripciones a corregir a mano ──");
  for (const [id, note] of Object.entries(DESCRIPTION_NOTES)) {
    const t = byId.get(id);
    console.log(`  ${t ? "⚠️" : "❌"} ${id}: ${note}${t ? "" : " (no existe en el tablero)"}`);
  }

  // 6. Gobernanza: 0 tareas sin Assignee / sin Due / sin AC (constitution §5)
  console.log("\n── Gobernanza (constitution §5) ──");
  let violations = 0;
  for (const t of allTasks) {
    const reasons = [];
    if (!t.assignees?.length) reasons.push("sin Assignee");
    if (!t.due_date) reasons.push("sin Due date");
    const ac = (t.custom_fields ?? []).find((f) => /criterio/i.test(f.name ?? ""));
    if (ac && !ac.value) reasons.push(`sin ${ac.name}`);
    if (reasons.length) {
      violations++;
      console.log(`  ${t.id} [${t.listName}] "${t.name.slice(0, 60)}": ${reasons.join(", ")}`);
    }
  }
  if (!violations) console.log("  Sin violaciones ✅");

  // 7. Export CSV (evidencia del manifiesto §7)
  if (EXPORT_CSV) {
    const csvPath = path.join(REPO_ROOT, "docs", "clickup", "SPRINT-1-MASTER.csv");
    const head = "list,task_id,task_name,status,assignees,due_date,sprint,points";
    const rows = allTasks.map((t) =>
      [
        t.listName,
        t.id,
        t.name,
        t.status?.status ?? "",
        (t.assignees ?? []).map((a) => a.username).join("|"),
        t.due_date ? new Date(Number(t.due_date)).toISOString().slice(0, 10) : "",
        (t.custom_fields ?? []).find((f) => /^sprint$/i.test(f.name ?? ""))?.value?.name ?? "",
        t.points ?? "",
      ]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(","),
    );
    writeFileSync(csvPath, [head, ...rows].join("\n") + "\n", "utf8");
    console.log(`\nCSV exportado: docs/clickup/SPRINT-1-MASTER.csv (${rows.length} tareas)`);
  }

  console.log(`\nResumen: drift ${drift}${APPLY ? ` · corregidos ${fixed}` : ""} · violaciones gobernanza ${violations}`);
  if (!APPLY && drift > 0) {
    console.log("Para aplicar los cambios seguros: node scripts/clickup/sync-sprint-1.mjs --apply");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
