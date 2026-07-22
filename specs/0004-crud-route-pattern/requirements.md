# Requirements — Repeatable CRUD Route Pattern

- **Status:** Implemented (R2.2's cross-tenant half not yet verifiable — see tasks.md)
- **Spec ID:** 0004
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Extracts a shared, reusable pattern for resource API routes — paginated/sorted/filtered
list, get-by-id, create, update, delete — so that adding a new resource (clients,
users, companies, …) doesn't mean re-writing the same Zod-validate → Drizzle-query →
`NextResponse.json` boilerplate each time. `todos` is rebuilt on the new pattern as the
reference implementation, gaining get-by-id/update/delete it doesn't have today.

## 2. Goals

- A single reusable helper lets any resource's route files get list (paginated,
  sorted, filtered), get-by-id, create, update, and delete without duplicating query
  logic.
- The list endpoint has one consistent query-param convention (`page`, `pageSize`,
  `sort`, per-field filters) across every resource.
- Every query the helper builds is scoped by `organizationId` automatically — there is
  no code path that queries a scoped table without it.
- `src/app/api/todos/route.ts` (and a new `src/app/api/todos/[id]/route.ts`) are
  rebuilt on the shared helper as the reference implementation.

## 3. Non-goals

- Building UI list/detail pages for any specific resource — this spec is API-layer
  only.
- A complex filter DSL (multi-field boolean queries, ranges) — basic per-field
  equality/`ILIKE` filters only for v1.
- Bulk operations (batch update/delete/import/export).
- GraphQL or tRPC — stays plain REST-ish route handlers matching the existing
  convention.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Paginated, sorted list

> As Backend, I want a shared list-query builder, so every resource's list endpoint behaves consistently without duplicated query logic.

- **R1.1** WHEN a list endpoint receives `page`/`pageSize` query params, the system
  SHALL return that page of results plus the total count.
- **R1.2** WHEN a list endpoint receives a `sort` query param matching an
  allowed column for that resource, the system SHALL order results accordingly
  (ascending by default, a `-` prefix for descending).
- **R1.3** IF a list endpoint's `sort` query param references a column not in that
  resource's allow-list, THEN the system SHALL respond `400`.
- **R1.4** WHEN a list endpoint receives a filter query param matching an allowed
  filterable field, the system SHALL apply it (`ILIKE` for text fields, exact match
  otherwise); unrecognized filter keys SHALL be ignored rather than causing an error.

### R2 — Get single resource

> As Backend, I want a shared get-by-id handler, so each resource doesn't hand-roll the same "find or 404" logic.

- **R2.1** WHEN a GET request targets a valid id within the caller's organization, the
  system SHALL return that resource.
- **R2.2** IF the id doesn't exist, or exists but belongs to a different organization,
  THEN the system SHALL respond `404` (not `403`, to avoid leaking existence across
  tenants).

### R3 — Create / update / delete

> As Backend, I want shared create/update/delete handlers, so validation, org-scoping, and response shape stay consistent across resources.

- **R3.1** WHEN a create request has a valid payload per that resource's Zod schema,
  the system SHALL insert the row scoped to the caller's organization and return
  `201` with the created row.
- **R3.2** WHEN an update request has a valid payload for an id within the caller's
  organization, the system SHALL update the row and return the updated row.
- **R3.3** WHEN a delete request targets an id within the caller's organization, the
  system SHALL delete it and return `204`.
- **R3.4** IF a create/update payload fails Zod validation, THEN the system SHALL
  respond `400` with `{ error, details: parsed.error.flatten() }`, matching the
  existing convention in `src/app/api/todos/route.ts`.

### R4 — Organization scoping is automatic, not opt-in

> As Backend, I want the CRUD helper to always scope by organization, so a new resource can't accidentally be built without tenant isolation.

- **R4.1** the shared list/get/update/delete helpers SHALL require an
  `organizationId` filter on every query they build — there SHALL be no parameter or
  code path that bypasses it.

### R5 — Todos migrated as the reference implementation

> As Backend, I want the existing `todos` resource rebuilt on the new pattern, so it's a working example, not just documentation.

- **R5.1** `src/app/api/todos/route.ts` and a new `src/app/api/todos/[id]/route.ts`
  SHALL be rebuilt using the shared CRUD helper, gaining get-by-id, `PATCH`, and
  `DELETE` that the resource doesn't have today.
- **R5.2** the existing assertions in `e2e/api.spec.ts` for `todos` SHALL keep passing,
  updated only where the response shape intentionally changes (e.g. the list
  endpoint's pagination envelope).

## 5. Constraints & assumptions

- Depends on spec 0003 (Auth) for real `organizationId` resolution from a session.
  Until 0003 ships, the helper accepts an `organizationId`-resolver function injected
  by the caller, defaulting to the existing `getDefaultOrgId()` placeholder — this
  spec is not blocked on auth landing first. **Resolved during implementation**:
  `resolveOrganizationId()` is a single internal function in `src/lib/crud.ts`
  (not a per-resource config field, since there's only one notion of "current org"
  system-wide) — its body is the one place to swap in session-derived scoping.
- Pagination response envelope (draft): `{ data: T[], page, pageSize, total }` —
  confirm naming before implementation. **Resolved**: confirmed, and extended to
  every CRUD response (not just lists) — `{ data: <row> }` for get/create/update —
  for a uniform shape across a resource's whole route set.
- Sort/filter allow-lists are declared explicitly per resource (not inferred
  automatically from the Drizzle schema), so internal-only columns are never
  accidentally exposed as sortable/filterable.
- Offset-based pagination (`page`/`pageSize`), not cursor-based — simpler, adequate at
  this template's scale.

## 6. Open questions

- [x] Confirm the pagination response envelope shape (`{ data, page, pageSize, total
  }` vs. a `meta` wrapper, etc.). — Confirmed, and used as the envelope for every
  response, not just lists.
- [x] Confirm where the shared helper should live — this draft assumes `src/lib/crud.ts`.
  — Confirmed.
- [x] Offset vs. cursor-based pagination — this draft assumes offset for v1; revisit if
  a resource grows large enough for it to matter. — Confirmed offset for now.
