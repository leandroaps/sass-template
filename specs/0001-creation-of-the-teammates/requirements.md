# Requirements — Agent Team Structure & Workflow

- **Status:** Implemented
- **Spec ID:** 0001
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Defines a multi-agent team — one Lead plus Backend, Frontend, and Test teammates — that implements features from specs in `specs/`. Backend owns the shared types contract; Frontend and Test consume it. No teammate implements anything until the Lead's plan for a spec is explicitly approved by the user.

## 2. Goals

- Every spec in `specs/` is implemented by a team with clear, non-overlapping ownership (Backend / Frontend / Test).
- Shared types are changed in exactly one place (by Backend) whenever a spec changes the data contract, so Frontend and Test never redefine or fork them.
- No code is written until the Lead has presented an implementation plan and the user has explicitly approved it.
- Ambiguity in a spec is resolved by checking existing project conventions first, then escalating to the Lead — never by guessing.

## 3. Non-goals

- This spec does not define how feature specs themselves are written (see `specs/_templates/`).
- This spec does not cover CI/CD, deployment, or release processes.
- This spec does not implement any particular feature; it defines the standing process the team follows for every spec placed in `specs/`, present and future.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Team structure and roles

> As the Lead, I want a fixed team of Backend, Frontend, and Test teammates with defined responsibilities, so that every spec is implemented with clear ownership and no duplicated or dropped work.

- **R1.1** WHEN a new feature spec is added to `specs/`, the Lead SHALL assign implementation work to Backend, Frontend, and Test according to their defined roles.
- **R1.2** WHEN a teammate begins work on a spec, the teammate SHALL first read that spec and the current shared types before planning or building anything.
- **R1.3** the Frontend teammate SHALL NOT modify backend code (route handlers, server actions, or the data layer).

### R2 — Shared types as the backend/frontend contract

> As Backend, I want to own and update the shared types, so that Frontend and Test always build against one authoritative contract instead of redefining it.

- **R2.1** WHEN a spec changes the data contract, Backend SHALL update the shared types before Frontend or Test build against them.
- **R2.2** Frontend SHALL consume shared types as-is and SHALL NOT declare local copies or divergent redefinitions of them.
- **R2.3** IF Frontend needs a shape that isn't in the shared types, THEN Frontend SHALL request the change from Backend (via the Lead) rather than defining it locally.

### R3 — Ambiguity resolution

> As any teammate, I want a defined way to resolve unclear parts of a spec, so that I don't guess or stall on ambiguity.

- **R3.1** WHEN a spec is ambiguous, THEN the teammate SHALL first look at the existing project structure and established patterns for precedent.
- **R3.2** IF ambiguity remains after checking existing conventions, THEN the teammate SHALL ask the Lead rather than proceeding on an assumption.

### R4 — Mandatory plan approval gate

> As the user, I want to review and explicitly approve the Lead's implementation plan before any teammate writes code, so that I retain control over scope and approach for every spec.

- **R4.1** WHEN the Lead reads a spec in `specs/`, the Lead SHALL draft an implementation plan covering task breakdown, ownership per teammate, order of work, and any shared-type changes.
- **R4.2** the Lead SHALL present this plan to the user and SHALL NOT allow any teammate to start building or implementing until the user has explicitly approved it.
- **R4.3** IF a teammate has not received explicit confirmation that the plan was approved, THEN that teammate SHALL NOT make any code changes.
- **R4.4** WHEN the user approves the plan, THEN Backend SHALL update shared types and implement first, Frontend SHALL build against the now-approved contract, and Test SHALL write tests in parallel, derived from the spec.

### R5 — Test independence from implementation

> As Test, I want to derive tests from the spec's acceptance criteria rather than from the implementation, so that tests catch real bugs instead of just confirming whatever was built.

- **R5.1** WHEN writing a test for a requirement, Test SHALL derive the test case from that requirement's acceptance criteria in `requirements.md`, not from reading the implementation code.
- **R5.2** Test SHALL cover backend and frontend logic with unit tests and end-to-end/integration flows with Playwright.
- **R5.3** WHEN a test fails, Test SHALL report the failure to the responsible teammate with reproduction steps.

### R6 — Frontend/backend boundary

> As Frontend, I want a clear escalation path when the API doesn't match the spec, so that I never patch around backend gaps myself.

- **R6.1** IF the implemented API doesn't match the spec Frontend is building against, THEN Frontend SHALL report the discrepancy to the Lead instead of modifying backend code.

## 5. Constraints & assumptions

- The team operates within this existing Next.js + TypeScript + Drizzle codebase and must follow its established conventions (see `CLAUDE.md`) rather than introducing new architectural patterns.
- "Shared types" means the types Backend exposes for the data contract (e.g., Drizzle-inferred row types in `src/db/schema.ts` and any request/response shapes Backend defines for its API routes) — the single source Frontend and Test must consume.
- The approval gate in R4 applies per spec, not once globally — every new or changed spec goes through Lead plan → user approval → implementation.

## 6. Open questions

- [ ] Where should shared API request/response types (as opposed to DB row types already inferred in `src/db/schema.ts`) live — colocated with each route, or in a dedicated shared module?
- [ ] What format should the Lead use to present the plan for approval (inline chat, a `tasks.md` draft, something else)?
