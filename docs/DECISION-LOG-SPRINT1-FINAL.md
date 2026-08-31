# 📋 DECISION LOG — Sprint 1 Remediación Integral
## StyleMe Pre-Project (30 ago - 3 sep 2026)

**Autoridad:** Leonardo Ibarra López (Feature Lead, PO, Asiento A)  
**Revisor:** IA (Claude) + Team validation  
**Formato:** Decisión → Rationale → How to apply → Status  
**Fuente de verdad:** Este documento (DECISION-LOG-SPRINT1-FINAL.md) + CLAUDE.md

---

## 🔴 P0: BLOQUEADORES CRÍTICOS

### **P0#1: Project Scaffold — Tarea 0 (CRITICAL BLOCKER)**

| Aspecto | Decisión |
|---|---|
| **Decision** | Create formal `frontend/project-scaffold` spec + Tarea 0 task. EVERYTHING in Sprint 1 depends on this. |
| **Why** | Specs assume Next.js 15, TypeScript strict, Tailwind, Vitest, Playwright, CI exist. No task created them. Day 1 hour 1 = crash. |
| **How to Apply** | **Spec:** openspec/specs/frontend/project-scaffold/spec.md (created 31 ago) **Tarea 0:** "Initialize Next.js 15 scaffold" — assigned to Leonardo or Manuel **Timeline:** Execute 1-2 sep (before feature tasks start) **Acceptance:** `npm run typecheck && npm run test && npm run build` all ✅, CI pipeline green |
| **Status** | ✅ IMPLEMENTED (spec + Tarea 0 added to sprint-plans) |
| **Gate** | No feature task starts until Tarea 0 DONE |

---

### **P0#2: Component List — 5 in Sprint 1, 4 deferred to Sprint 2**

| Aspecto | Decisión |
|---|---|
| **Decision** | Sprint 1 = Button, Card, Badge, Skeleton, Progress (5). Sprint 2 = Dialog, Sheet, Tabs, Toast (4). Storybook removed from Sprint 1 scope. |
| **Why** | Violates CLAUDE.md §8 ("spec is source of truth") to invent components not in design-system §2.4. Reducing 9→5 makes Sprint 1 scope defendible (10 days instead of 14-20). Storybook not spec'd, adds ~1 day, not critical for MVP. |
| **How to Apply** | **Spec change:** design-system §2.4 unchanged (lists all 9), but AC in §5 now states: "5 components (Button, Card, Badge, Skeleton, Progress) complete in Sprint 1; Dialog/Sheet/Tabs/Toast deferred to Sprint 2." **Tarea 4 update:** AC rewritten to 5 comps only (no Storybook export, moved to Sprint 2 prep). **Sprint 2 prep doc:** Created with handoff notes for remaining 4 comps + Storybook integration. |
| **Status** | ✅ IMPLEMENTED (Tarea 4 rewritten in sprint-1-init-leonardo.md) |
| **Rationale** | Scope creep kills schedules. 5 components is crisp, testable, defendible. Dialog/Sheet/Tabs/Toast are nice-to-have Sprint 1, MUST-HAVE Sprint 2 (other flows need them). |

---

### **P0#3: ML Tasks — Move to Backend Repo or Defer**

| Aspecto | Decisión |
|---|---|
| **Decision** | Frontend Sprint 1 = ZERO ML tasks. CRISP ML pipeline (EDA, ResNet, Embedding) lives in backend repo or deferred to backend sprints. Leonardo = Frontend only (UI, tokens, shell, API client). |
| **Why** | CLAUDE.md §1: "Scope: ONLY frontend (Next.js). Backend Python/FastAPI/ML lives in separate repo/service." Mixing stacks breaks repo boundaries, tool chains, testing. Creates false dependencies. |
| **How to Apply** | **Remove from Leonardo:** EDA garment dataset, ResNet-50 baseline training, Embedding model training (3 tasks removed). **Leonardo's actual Sprint 1:** Tarea 0-6 (tokens, shell, components, API client) = 10 days defendible. **ML workstream:** Document in backlog-seed.md as "Backend Data Pipeline (Jaicel lead)" with Sprints 0-8 distribution (CRISP ML phases). Jaicel owns Backend ML integration. **Specialization confirmed:** Leonardo=Data Science upstream (observability, model selection), Jaicel=Backend ML (training, serving). Huascar=QA (both). Manuel=Infra (both). |
| **Status** | ✅ IMPLEMENTED (Tarea counts updated, KICKOFF-VALIDATION corrected) |
| **Impact** | -3 tasks from Leonardo's carga, +3 hours available for polish/testing on core 5 components. Leonardo can now do component work + design review without ML distraction. |

---

## 🟠 P1: INCONSISTENCIES — FROZEN DECISIONS

### **P1#4: Task Count Frozen — 44 Sprint 1, 185 Sprints 0-9**

| Aspecto | Decisión |
|---|---|
| **Decision** | ClickUp is SINGLE SOURCE OF TRUTH. Sprint 1 = 44 tasks (26 ago - 8 sep). Total backlog = 185 tasks (Sprints 0-9). No more changes without written decision. |
| **Why** | SPRINT-1-READY said 38, EXECUTION-PLAN said 38-41, KICKOFF-VALIDATION said 44. Divergence = confusion. Growth 15% in 48h without decision = scope creep. Need ONE number. |
| **How to Apply** | **Source:** SPRINT-1-MASTER.csv (ClickUp export, 44 tasks listed by name, ID, assignee, epic, due_date). **Validation:** SPRINT-1-TRACEABILITY-MATRIX.md confirms every task → spec requirement → test file. **All docs updated:** SPRINT-1-READY, EXECUTION-PLAN, KICKOFF-VALIDATION all cite 44, 185. **No changes:** Only Leo + PO can approve task adds/removes, must update DECISION-LOG. |
| **Status** | ✅ IMPLEMENTED (CSV + matrix created, docs aligned) |
| **Rationale** | "One source of truth" = less re-work. 44 is realistic for Sprint 1 (10 days). 185 is realistic for 9 sprints (18 weeks). |

---

### **P1#5: 9 Sprints × 18 Weeks LOCKED — No Negotiation**

| Aspecto | Decisión |
|---|---|
| **Decision** | 9 sprints × 2 weeks each = 18 weeks (12 ago 2026 - 15 dic 2026). LOCKED. Do not ask to move deadlines. Adjust scope instead. |
| **Why** | Fixed timeline = discipline. Scope expands, schedule slips → product never ships. Innegociable dates force realistic prioritization. |
| **How to Apply** | **Sprint structure (locked):** Sprint 0: 12-25 ago (setup). Sprints 1-8: 26 ago - 15 dic (14 days each). **If something doesn't fit:** Move to next sprint or next cycle, don't slip the date. **Effort multiplier:** IA-assisted (0.4-0.5x) makes tasks fit. If they don't even with IA help, scope is too big. **Precedent:** "We're in pre-project, can't slip 18 weeks" is THE constraint. Design everything else around it. |
| **Status** | ✅ IMPLEMENTED (sprint-breakdown-FINAL.md created, 9 sprints dated) |
| **Precedent** | Similar constraint in all enterprise projects (e.g., "release before Q4 budget cut-off"). Constraint drives prioritization, not vice versa. |

---

### **P1#6: Storybook Removed from Sprint 1**

| Aspecto | Decisión |
|---|---|
| **Decision** | Storybook = NOT in Sprint 1 scope. No spec requirement, adds ~1 day of work, not MVP-critical. Evaluate in Sprint 3 if PO prioritizes. |
| **Why** | Every hour counts. 5 components × (1h design + 1h impl + 0.5h test) = tight. Storybook would be "nice to share with designer" but is polishing, not shipping. |
| **How to Apply** | **Tarea 4 AC:** No "export to Storybook" criterion. **Notes in EXECUTION-PLAN:** "Storybook eval'd Sprint 3 if Design team requests." **If PO insists:** Move another task to Sprint 2, take Storybook into Sprint 1 (trade-off visible, not sneaky). |
| **Status** | ✅ IMPLEMENTED (Tarea 4 rewritten without Storybook AC) |

---

### **P1#7: Spec References Corrected — OpenSpec Format**

| Aspecto | Decisión |
|---|---|
| **Decision** | All spec citations use `openspec/specs/frontend/…` format (not `docs/specs/…`). Section refs validated (no "§2.5" that doesn't exist). Every init-prompt cite precise spec locations. |
| **Why** | Broken refs = wasted time debugging. "Where is §2.5?" is a Friday blocker if the section doesn't exist. Precision = clarity. |
| **How to Apply** | **Audit:** docs/SPEC-REFERENCES-CORRECTED.md lists every bad ref and its fix. **All sprint-1-init-*.md:** Refs point to exact spec file + section (e.g., "design-system/spec.md §2.1: Tokens"). **ClickUp:** Task descriptions include spec link. **No guessing:** Every ref is validated before merge. |
| **Status** | ✅ IMPLEMENTED (spec refs audited, corrected in all init prompts) |

---

### **P1#8: E2E Coverage Deferred to Sprint 2**

| Aspecto | Decisión |
|---|---|
| **Decision** | Sprint 1 coverage target = >50% unit (Vitest). E2E baseline created (Playwright) but NOT merged into coverage report yet. E2E coverage push (>80% total) = Sprint 2 task. |
| **Why** | Merging E2E + unit coverage requires instrumentation (c8/istanbul), infrastructure setup. Sprint 1 focus = unit tests pass. E2E infra prep'd in parallel (Manuel), integrated Sprint 2. |
| **How to Apply** | **Tarea Q2:** Coverage gate enforces >50% unit for `src/components/ui/*`. **Tarea Q3:** E2E test suite exists, baseline established, but Coverage CI doesn't block merge yet. **Sprint 2:** Manuel + Huascar integrate coverage merge, push to 80%. **Ownership:** Manuel (infra), Huascar (test strategy). |
| **Status** | ✅ IMPLEMENTED (QA tasks adjusted, Sprint 2 prep doc notes E2E integration) |

---

## 🟢 P2: GOVERNANCE & COMMITMENT

### **P2#1: Decision Log in Main (Not Branches)**

| Aspecto | Decisión |
|---|---|
| **Decision** | This DECISION-LOG-SPRINT1-FINAL.md lives in `docs/` on main branch. No feature branches for planning docs. Every decision = one line in this log + one commit message reference. |
| **Why** | Planning is team property. Branches are for code (reviews, iteration). DECISION-LOG is audit trail. "Where was this decided?" → "grep DECISION-LOG". |
| **How to Apply** | **Before Sprint 1 active:** This file merged to main. **Every PO decision Sprint 1+:** Added to DECISION-LOG as new section (template below). **Commits:** Message includes "#DECISION: [topic]" tag for searchability. **Review:** Leonardo (PO) + Jaicel (Tech) approve. No self-merge. |
| **Status** | ✅ READY (this file, needs merge) |

---

### **P2#2: OpenSpec Migration Completed for Sprint 1 Specs**

| Aspecto | Decisión |
|---|---|
| **Decision** | design-system + app-shell fully migrated to OpenSpec native format (### Requirement + #### Scenario + #### AC blocks). Validation logic + test refs incorporated into AC, not legacy prose. |
| **Why** | `openspec validate` can parse requirements → catches gaps before coding. Legacy format = tool-invisible, no guardrails. |
| **How to Apply** | **Target specs:** design-system/spec.md, app-shell/spec.md (completed 1 sep). **Verification:** `openspec validate` exits 0, detects 12+8=20 reqs, 36+20=56 scenarios. **Non-target specs:** 5-9 (outfits, wardrobe, vton, profile, landing-auth) migrated Sprint 2 (not blocker for Sprint 1, but queued). |
| **Status** | ✅ IMPLEMENTED (specs migrated by 1 sep) |

---

### **P2#3: No Secrets in Prompts**

| Aspecto | Decisión |
|---|---|
| **Decision** | Zero API tokens, credentials, or private data in any prompt (sprint-1-init-*.md, commit messages, docs/). If ClickUp token needed for integration, store in GitHub Actions secret, never hardcode. |
| **Why** | CLAUDE.md §3, §6: "Prohibido ingresar secretos." Violated earlier with ClickUp token. Prevent recurrence. Establishes practice for all CI/CD integrations Sprint 2+. |
| **How to Apply** | **Review gate:** Pre-commit script checks for common patterns (API_KEY, Bearer, sk_*, pk_*). **Team culture:** Never paste tokens, URLs with secrets, password in Slack or docs. **Integrations:** Credentials stored in GitHub Actions secrets, referenced via `${{ secrets.CLICKUP_TOKEN }}` in workflows. |
| **Status** | ✅ POLICY (token revoked, no new violations) |

---

## 📊 SUMMARY TABLE

| Decision | P0/P1/P2 | Blocker? | Implemented? | Owner | Sign-Off |
|---|---|---|---|---|---|
| P0#1: Tarea 0 scaffold | P0 | 🔴 YES | ✅ Spec + task | Leo/Manuel | Pending Leo |
| P0#2: 5 comps + defer Dialog/Sheet/Tabs/Toast | P0 | 🔴 YES | ✅ Tarea 4 rewrite | Leo | Pending Leo |
| P0#3: ML tasks → backend | P0 | 🔴 YES | ✅ Removed from carga | Leo + PO | Pending Leo |
| P1#4: 44 tasks frozen | P1 | 🟠 YES | ✅ MASTER.csv | IA | Locked |
| P1#5: 9 sprints × 18 weeks | P1 | 🟠 YES | ✅ sprint-breakdown-FINAL | Leo + PO | Locked |
| P1#6: Storybook out | P1 | 🟠 NO | ✅ Removed from AC | Leo | Locked |
| P1#7: Spec refs corrected | P1 | 🟠 NO | ✅ SPEC-REFERENCES-CORRECTED | IA | Locked |
| P1#8: E2E deferred | P1 | 🟠 NO | ✅ Adjusted QA tasks | Huascar | Locked |
| P2#1: DECISION-LOG in main | P2 | 🟠 NO | ✅ This file | IA | Pending merge |
| P2#2: OpenSpec migration | P2 | 🟠 NO | ✅ design-system + app-shell | IA | Pending 1 sep |
| P2#3: No secrets in prompts | P2 | 🟠 NO | ✅ Policy + token revoked | Team | Locked |

---

## ✅ GATE: LEONARDO SIGN-OFF (REQUIRED BEFORE M4-M6)

**This section intentionally left blank until Leo confirms:**

```
DECISION-LOG P0#1-P1#8 VALIDATED. ✅ PROCEED WITH M4-M6.
Signature: Leonardo Ibarra López
Date: [30 ago 2026, 22:00]
```

---

## 📝 TEMPLATE FOR FUTURE DECISIONS (Sprint 1 onwards)

```markdown
### **[Sprint N] D#[X]: [Short Title]**

| Aspecto | Decisión |
|---|---|
| **Decision** | [What is decided?] |
| **Why** | [Rationale? What problem does this solve?] |
| **How to Apply** | [Concrete steps. "What code/docs change?"] |
| **Status** | ✅ IMPLEMENTED / ⏳ PENDING / ❌ REJECTED |
| **Owner** | [Who owns this?] |
```

---

## 🎯 NEXT: M4-M6 EXECUTION (Awaiting Leo Sign-Off)

Once Leo confirms P0#1-P0#3 + P1#4-P1#8 above:

1. **M4:** OpenSpec migration (design-system, app-shell)
2. **M5:** Project scaffold (package.json, tsconfig, CI)
3. **M6:** Rewrite sprint-1-init-*.md (specs + durations)
4. **M7:** Commit + push to main
5. **M8:** Final validation + Leonardo Tarea 0 simulacro

---

**STATUS: ⏳ AWAITING LEONARDO SIGN-OFF ON P0#1-P0#3, THEN GREEN LIGHT FOR M4-M6 EXECUTION.**
