# Design — Repeatable CRUD Route Pattern

- **Status:** Draft
- **Spec ID:** 0004
- **Implements:** requirements.md

## 1. Overview

A generic factory in `src/lib/crud.ts` builds the handlers for a resource's collection
route (`GET` list, `POST` create) and item route (`GET` one, `PATCH` update, `DELETE`)
from a small config object: the Drizzle table, its Zod insert/update schemas, an
allow-list of sortable/filterable columns, and an `organizationId` resolver. Each
resource's `route.ts` becomes a thin file that supplies that config and re-exports the
returned handlers — `todos` becomes the reference implementation new resources copy.

## 2. Architecture

```
src/lib/crud.ts
  ├─ resolveOrganizationId(request)
  │     → calls spec 0003's getSession() once it lands; getDefaultOrgId() until then
  ├─ parseListParams(searchParams, { allowedSort, allowedFilters })
  │     → { page, pageSize, sort: { column, direction } | null, filters: Record<string, string> }
  └─ createCrudHandlers({ table, insertSchema, updateSchema, allowedSort, allowedFilters })
        → returns { GET, POST } for the collection route
        → returns { GET, PATCH, DELETE } for the [id] route

src/app/api/todos/route.ts        # imports createCrudHandlers, exports { GET, POST }
src/app/api/todos/[id]/route.ts   # (new) exports { GET, PATCH, DELETE }
```

Request flow for a list request:

```
GET /api/todos?page=0&pageSize=20&sort=-createdAt
  │
  ▼
resolveOrganizationId(request) → 401 if none (once spec 0003 lands)
  │
  ▼
parseListParams(searchParams, todosListConfig)
  │  sort column not in allow-list → 400 (R1.3)
  ▼
Drizzle query: WHERE organizationId = ? [AND filters] ORDER BY [sort] LIMIT/OFFSET
  │
  ▼
{ data, page, pageSize, total }
```

## 3. Data model

No new tables. The requirement that every scoped query includes `organizationId`
(R4.1) applies to whichever table a resource's config points at — already true of
`todos` today.

## 4. API

Generic shape produced by the factory for any resource `<resource>`:

| Method | Path | Auth / permission | Description |
| ------ | ---- | ------------------ | ----------- |
| GET | `/api/<resource>` | session (org-scoped) | List — paginated, sorted, filtered (R1) |
| POST | `/api/<resource>` | session (org-scoped) | Create (R3.1) |
| GET | `/api/<resource>/[id]` | session (org-scoped) | Get one (R2) |
| PATCH | `/api/<resource>/[id]` | session (org-scoped) | Update (R3.2) |
| DELETE | `/api/<resource>/[id]` | session (org-scoped) | Delete (R3.3) |

Applied concretely to `todos`:

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/todos` | List, replaces today's unpaginated `db.select().from(todos)` |
| POST | `/api/todos` | Create (unchanged behavior, now via the shared factory) |
| GET | `/api/todos/[id]` | **New** |
| PATCH | `/api/todos/[id]` | **New** |
| DELETE | `/api/todos/[id]` | **New** |

## 5. Migrations & data backfill

N/A — no schema change.

## 6. Security & multi-tenancy

R4 is the core guarantee: `createCrudHandlers` builds every query starting from
`eq(table.organizationId, organizationId)` — there is no config option that omits it,
and get/update/delete all 404 (not just filter silently) when the id belongs to
another organization, so cross-tenant existence isn't leaked (R2.2).

## 7. Testing strategy

Test covers each acceptance criterion once against the generic helper (via the
`todos` reference implementation, since there's no second resource yet):

- List returns the right page/count (R1.1); `sort=-createdAt` orders correctly
  (R1.2); an unknown sort column 400s (R1.3); a recognized filter narrows results,
  an unrecognized one is silently ignored (R1.4).
- Get-by-id returns the resource for its own org, 404s for another org's id or a
  nonexistent id (R2.1, R2.2).
- Create/update/delete behave per R3.1–R3.4, including the existing "rejeita payload
  inválido" case migrated to the new handler.
- `e2e/api.spec.ts`'s existing todos assertions are updated for the new list envelope
  and extended with get/update/delete/cross-org-404 cases (R5.2).

## 8. Risks & alternatives considered

- **Risk:** building a generic abstraction before there are 2+ real resources to
  generalize from is a common over-engineering trap. *Mitigation:* `todos` gaining
  get/update/delete (which it lacks today) is real, immediate value independent of
  whether a second resource ever uses the helper — it's not purely speculative.
- **Alternative considered:** keep hand-writing each resource's route file
  independently (today's state). Rejected because the user explicitly wants a
  repeatable pattern in place before adding clients/users/companies, to avoid three
  near-duplicate implementations.
- **Risk:** the `organizationId`-resolver injection point (to not block on spec 0003)
  could be forgotten and left on the `getDefaultOrgId()` placeholder. *Mitigation:*
  spec 0003's task list explicitly includes swapping every route using
  `resolveOrganizationId` over to session-derived scoping (see spec 0003 tasks.md).
