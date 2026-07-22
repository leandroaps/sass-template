# Tasks — Agent Team Structure & Workflow

- **Status:** Implemented
- **Spec ID:** 0001
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Stand up the four roles (Lead, Backend, Frontend, Test) with the responsibilities and boundaries in this spec → R1.1, R1.2, R1.3 — Lead is documented in root `CLAUDE.md` (§ Agent team workflow); Backend/Frontend/Test are `.claude/agents/{backend,frontend,test}.md` subagent definitions.
- [x] **T2** Establish the shared-types convention: Backend-owned location (`src/db/schema.ts` inferred types today; decide on a home for API request/response shapes per Open Question in requirements.md) that Frontend and Test import from, never redefine → R2.1, R2.2, R2.3 — documented in each agent file and in `CLAUDE.md`. Open question about a dedicated shared-types module (beyond `src/db/schema.ts`) is left open until a spec actually needs one.
- [x] **T3** Define and circulate the ambiguity-resolution checklist: check existing project conventions first, escalate to Lead only if still unresolved → R3.1, R3.2 — in the "Boundaries" section of each subagent file and in `CLAUDE.md`.
- [x] **T4** Wire the mandatory plan-approval gate into the Lead's workflow: draft plan → present to user → block all implementation until explicit approval is received → R4.1, R4.2, R4.3 — in `CLAUDE.md` § Agent team workflow; each subagent file also states it must not start until told the plan was approved.
- [x] **T5** Define the post-approval execution order: Backend updates shared types and implements first; Frontend builds against the approved contract; Test writes tests in parallel → R4.4 — in `CLAUDE.md` § Agent team workflow and the `backend`/`test` agent files.
- [x] **T6** Define Test's convention: derive test cases from acceptance criteria (not implementation), cover backend/frontend with unit tests and Playwright for e2e, report failures with repro steps → R5.1, R5.2, R5.3 — `.claude/agents/test.md`.
- [x] **T7** Define Frontend's escalation path for API/spec mismatches (report to Lead, never patch backend directly) → R6.1 — `.claude/agents/frontend.md`.

## Done criteria

- [x] All tasks checked.
- [x] Every acceptance criterion in requirements.md verified (each maps to a stated rule in `CLAUDE.md` and/or the relevant `.claude/agents/*.md` file — see per-task notes above).
- [x] Spec updated to match what was actually built (this file, plus Status bumped to Implemented in requirements.md/design.md).
