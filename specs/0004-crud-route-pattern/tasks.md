# Tasks — Repeatable CRUD Route Pattern

- **Status:** Implemented (see Done criteria note on R2.2's cross-tenant half)
- **Spec ID:** 0004
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Build sort/pagination parsing in `src/lib/crud.ts`: `page`/`pageSize`
  parsing, `sort` parsing against a per-resource allow-list (400 on unknown column),
  filter parsing against a per-resource allow-list (ignore unknown keys) → R1.1,
  R1.2, R1.3, R1.4 — `parseSort`/`parsePagination`; filters use an explicit
  `Record<string, "text" | "exact">` map (declares *how* to filter each field) rather
  than inferring from Drizzle column-type metadata.
- [x] **T2** Build `createCrudHandlers({ table, insertSchema, updateSchema,
  allowedSort, allowedFilters, defaultSort? })` returning `{ collection: { GET, POST },
  item: { GET, PATCH, DELETE } }`, every query scoped by `organizationId` → R2.1,
  R2.2, R3.1–R3.4, R4.1
- [x] **T3** Add `resolveOrganizationId(request)`, defaulting to the existing
  `getDefaultOrgId()` placeholder until spec 0003 lands → constraint in
  requirements.md — `getDefaultOrgId()` relocated to `src/lib/organization.ts` since
  it's no longer todos-specific.
- [x] **T4** Add `src/app/api/todos/[id]/route.ts`; rebuild
  `src/app/api/todos/route.ts` on `createCrudHandlers` → R5.1 — via a shared
  `src/app/api/todos/_crud.ts` (`_`-prefixed so Next.js doesn't route it) that both
  route files import from.
- [x] **T5** Update `e2e/api.spec.ts` for the new list envelope and extend it with
  get/update/delete/cross-org-404 cases → R5.2 — added pagination-envelope,
  invalid-sort-column, and get/update/delete/404 cases. **Cross-org-404 not covered**:
  see Done criteria.

## Done criteria

- [x] All tasks checked.
- [ ] Every acceptance criterion in requirements.md verified. `npx tsc --noEmit`
  passes cleanly (after fixing two real issues along the way — see below). `npm run
  build`/`npm run test:e2e` have not been successfully executed in this session —
  this sandbox's Bash tool has been intermittently unavailable for anything beyond
  trivial commands (same recurring issue as prior specs). **R2.2's cross-tenant half**
  ("id belongs to a different organization → 404") is implemented (every query is
  scoped by `organizationId`, so this is true by construction) but has no Playwright
  assertion — there's no way to create a second organization through the running app
  yet (that's spec 0003's signup flow), and contriving direct-DB test setup would
  break from this repo's existing HTTP-level e2e testing style. Add that assertion
  once spec 0003 ships.
- [ ] Spec updated to match what was actually built — pending the above; re-run
  verification and flip this once `npm run build`/`test:e2e` pass.

## Issues found and fixed during implementation

- `db.select().from(table as never)` (an attempted workaround for Drizzle's generic
  table typing) actually broke type inference entirely (`never` has no iterator/no
  properties) — fixed by typing the `table` config field as `PgTableWithColumns<any> &
  { id: AnyPgColumn; organizationId: AnyPgColumn }` instead, which Drizzle's
  `.from`/`.insert`/`.update`/`.delete` all accept directly with no cast needed.
- `.insert(table).values(...)` still couldn't resolve against the generic `Table`
  parameter's inferred insert shape (a real limitation of generic code over Drizzle's
  table types, not a mistake) — resolved with a narrow, commented `as any` at that one
  call site.
