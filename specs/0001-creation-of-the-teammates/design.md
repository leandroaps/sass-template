# Design — Agent Team Structure & Workflow

- **Status:** Implemented
- **Spec ID:** 0001
- **Implements:** requirements.md

## 1. Overview

For every feature spec placed in `specs/`, the team follows one path: the Lead reads the spec, drafts a plan, and stops — nothing gets built until the user explicitly approves that plan. Once approved, Backend goes first (schema + shared types + routes/server actions), Frontend builds UI against the now-frozen contract, and Test writes unit and Playwright tests from the spec's acceptance criteria, in parallel with Frontend. Ambiguity is resolved by checking existing project conventions before ever asking the Lead, and the Lead is asked before anyone guesses.

## 2. Architecture

Four roles, mapped onto this codebase's existing layout:

| Role         | Owns                                                                                                                          | Reads but doesn't own                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Lead**     | The plan for each spec (task breakdown, ownership, order, shared-type deltas); the approval checkpoint                        | Everything, for planning purposes                                      |
| **Backend**  | `src/app/api/**` route handlers, server actions, `src/db/schema.ts`, `src/db/index.ts`, and any shared request/response types | Frontend components, e2e tests                                         |
| **Frontend** | `src/app/**` pages/components (excluding `api/`), styling                                                                     | Backend route/data-layer code (reports mismatches, doesn't patch them) |
| **Test**     | `e2e/**` Playwright specs, unit tests colocated with the code they cover                                                      | —                                                                      |

Data/approval flow for a given spec:

```
spec in specs/<id>-<slug>/requirements.md (+ design.md, tasks.md)
        │
        ▼
   Lead drafts plan (tasks, ownership, order, shared-type changes)
        │
        ▼
   Lead presents plan to user  ──► user approves? ──No──► revise plan
        │ Yes
        ▼
   Backend: update shared types → implement backend
        │                              │
        ▼                              ▼
   Frontend: build UI against    Test: write unit + Playwright tests
   the approved/updated types    from acceptance criteria (parallel
                                   with Frontend, not blocked by it)
```

## 3. Data model

No new database tables or columns are introduced by this spec — it's a process/workflow spec, not a data feature.

The relevant existing convention this spec formalizes: types inferred from `src/db/schema.ts` (e.g. `Todo`, `NewTodo`) are the current form of "shared types" in this codebase. Backend is responsible for adding/changing these when a future spec's data contract changes; Frontend and Test import them rather than redeclaring shapes.

## 4. API

N/A — this spec defines the team's process, not an endpoint. Individual future specs in `specs/` will populate this table for their own `design.md`.

## 5. Migrations & data backfill

N/A — no schema change accompanies this spec.

## 6. Security & multi-tenancy

No change to the app's security model. When Backend implements future specs under this workflow, it must preserve the existing multi-tenancy convention already established in `src/db/schema.ts` (every domain table scoped by `organization_id`) rather than introducing new scoping patterns.

## 7. Testing strategy

This spec is process, not code, so "testing" it means confirming the workflow is actually followed on the next real spec that goes through the team:

- Verify R4 (approval gate): the Lead produces a plan and stops; no teammate's tool calls touch source files until the user has replied with explicit approval.
- Verify R2 (shared types ownership): when a spec changes the data contract, the diff touching `src/db/schema.ts` (or shared type module) is authored by Backend, and Frontend's diff only imports from it.
- Verify R3 (ambiguity escalation): when a teammate hits an ambiguous point, check that it looked for precedent in the existing codebase before any question reaches the Lead.
- Verify R5/R6: Test's cases map 1:1 to acceptance criteria IDs (e.g. `R1.1`) rather than to lines of implementation code; Frontend escalates API/spec mismatches instead of editing backend files.

## 8. Risks & alternatives considered

- **Risk:** Frontend and Test could stall waiting on Backend if shared types land late. _Mitigation:_ Backend updates shared types first, before full route implementation, specifically so Frontend/Test can start against the contract early (R2.1, R4.4).
- **Risk:** The approval gate (R4) could be skipped under time pressure, especially for small-looking specs. _Mitigation:_ R4.2/R4.3 make the gate unconditional — no "obviously small" exception — so the rule doesn't require judgment calls in the moment.
- **Alternative considered:** Let Frontend define provisional local types and reconcile with Backend's types later. Rejected — this is exactly the divergence R2.2 exists to prevent, and reconciliation costs tend to exceed the wait-time saved.
- **Alternative considered:** Allow teammates to ask the Lead first and check conventions only if the Lead is unavailable. Rejected per R3.1/R3.2 — checking existing patterns first is cheaper than round-tripping through the Lead and keeps the team consistent with established code even when the Lead is slow to respond.
