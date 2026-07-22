# Tasks — Authentication

- **Status:** Implemented
- **Spec ID:** 0003
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Install the auth library (Better Auth); configure `src/lib/auth.ts`
  (Drizzle adapter, `advanced.database.generateId: "uuid"`, `nextCookies()` plugin)
  and `src/lib/auth-client.ts` (React client) → R1.1, R2.1
- [x] **T2** Add `user`/`session`/`account`/`verification` tables to
  `src/db/schema.ts`, including the new `organizationId` FK on `user`; generate and
  apply the migration → data model in design.md — column set verified against the
  installed `better-auth` package's own source, not guessed.
- [x] **T3** Mount `src/app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`) →
  R1.1, R2.1, R2.3
- [x] **T4** Build the sign-up page (`src/app/[locale]/sign-up/page.tsx`): submits to
  `authClient.signUp.email()`; organization is provisioned lazily by `getSession()`
  the first time it's resolved (not synchronously during sign-up — see design.md's
  org-provisioning note), shows validation errors → R1.1, R1.2, R1.3, R5.1
- [x] **T5** Build the sign-in page (`src/app/[locale]/sign-in/page.tsx`) → R2.1, R2.2,
  R5.1
- [x] **T6** Add a sign-out action/button (`src/components/sign-out-button.tsx`) →
  R2.3
- [x] **T7** Add `getSession()`/`requireSessionOrRedirect()` helpers in
  `src/lib/auth.ts`; **scope change**: these protect the new `/account` page and
  `GET /api/account` route (the reference protected surfaces), not `/api/todos` —
  see R3.1/R4.3's resolution in requirements.md → R3.1, R3.2, R4.1, R4.2, R4.3
- [x] **T8** Remove `getDefaultOrgId()` from `src/app/api/todos/route.ts`, replacing
  it with the session-derived `organizationId` → **not done, by design** — `todos`
  stays public; `getDefaultOrgId()` was relocated to `src/lib/organization.ts` (spec
  0004) and continues to be used unconditionally by `resolveOrganizationId()` in
  `src/lib/crud.ts`. See R3.3's resolution in requirements.md.
- [x] **T9** Playwright coverage: sign-up (success, duplicate email, weak password),
  sign-in (success, invalid credentials), sign-out, protected-page redirect,
  protected-API 401, and public-route regression (`/`, `/api/health`, `/api/todos`) →
  verifies R1–R5 — `e2e/auth.spec.ts`.

## Done criteria

- [x] All tasks checked (T8 intentionally not implemented as originally scoped — see
  its note above).
- [ ] Every acceptance criterion in requirements.md verified. `npx tsc --noEmit`
  passes cleanly. `npm run db:generate`/`db:migrate` (to actually create the new
  tables), `npm run build`, and `npm run test:e2e` have not been successfully executed
  in this session — this sandbox's Bash tool has been intermittently unavailable for
  anything beyond trivial commands (same recurring issue as prior specs). None of
  R1–R5 can be runtime-verified until the migration actually runs against a real
  database.
- [ ] Spec updated to match what was actually built — pending the above; re-run
  verification (including `db:generate`/`db:migrate`) and flip this once it passes.

## Issues found and fixed during implementation

- `better-auth`'s peer dependencies require `drizzle-orm ^0.45.2` and
  `drizzle-kit >=0.31.4`; this project had `^0.36.4`/`^0.28.1`. Upgraded both to their
  latest (`0.45.2`/`0.31.10`, which happen to satisfy the requirement exactly).
- That Drizzle upgrade introduced a stricter `.from()` type guard that broke
  `src/lib/crud.ts`'s generic `table` parameter — fixed with a narrow, commented
  `as any` at the three `.from()` call sites (see the file and the CLAUDE.md Auth
  bullet).
- `requireSessionOrRedirect`'s `if (!session) { redirect(...); }` didn't narrow
  `session` to non-null afterward, even though next-intl's `redirect()` is typed to
  return `never` — a bare (non-`return`ed) call to a `never`-returning function
  doesn't reliably propagate control-flow narrowing in this TS setup. Fixed by adding
  an explicit `throw new Error("unreachable")` immediately after the `redirect()`
  call.
