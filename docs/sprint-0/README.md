# docs/sprint-0/ — pre-project trail

**Authoritative:**
- [`SCAFFOLD-VERIFICATION.md`](./SCAFFOLD-VERIFICATION.md) — what the scaffold is, gate output, findings mitigated.
- [`GO-NO-GO.md`](./GO-NO-GO.md) — Sprint 1 start evaluation (PO).
- `CLAUDE.md` §10–11 — decisions of record.

Everything else in this folder is **historical**. It documents three rounds of
pre-project remediation (26–31 Aug 2026) that repeatedly declared the repo "READY" /
"GO" / "PRODUCTION READY" **before anyone had run `npm ci` or `npm run build`**. They are
kept for traceability, not as current fact — several of their "✅" claims were wrong at
the time of writing.

| File | What it is | Trust it? |
|---|---|---|
| `SCAFFOLD-VERIFICATION.md` | Real gate output, current stack | ✅ authoritative |
| `SPRINT-1-READY-FOR-EXECUTION.md` | Round-1 kickoff checklist | historical |
| `SPRINT-1-KICKOFF-VALIDATION.md` | Round-1 task inventory | historical (numbers superseded by ClickUp) |
| `SPRINT-1-PRE-PROJECT-COMPLETION-SUMMARY.md` | Round-1 "M0.5–M7 complete" | historical (references deleted docs) |
| `DOCUMENTATION-AUDIT-FINAL.md` | Round-2 "definitive" doc audit | historical (said 9 components / Next 15) |
| `REMEDIATION-AUDIT-REAL.md` | Round-2 blocker catalog | historical (partial fixes) |
| `SPRINT-1-PRE-PROJECT-READY.md` | Round-3 "PRODUCTION READY" | historical (`npm ci` still failed after it) |
| `VERIFICATION-COMPLETE.md` | Round-3 "all gates passing" | historical (only added a doc; lockfile still broken) |

Lesson, now in `CLAUDE.md` §10 P0#1 and the DoD: **a gate is green only when it has been
executed and its exit code observed.**
