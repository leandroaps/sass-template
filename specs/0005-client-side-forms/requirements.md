# Requirements — Client-Side Forms with Zod

- **Status:** Implemented
- **Spec ID:** 0005
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Pairs the Zod schemas Backend already writes server-side with `react-hook-form` on the
client, so create/edit forms validate against the same rules as the API instead of
duplicating them, with inline field errors, submit-in-flight handling, and
server-side validation errors mapped back onto the right field. The `todos` create
flow — currently only reachable via `curl`/Playwright's `request` fixture, with no UI
— gets a real form as the reference implementation.

## 2. Goals

- A resource's create/edit form validates using the *same* Zod schema Backend defined
  for that route, imported rather than redefined.
- Field-level errors, in-flight submit state, and success/failure handling follow one
  shared pattern instead of ad-hoc `useState`.
- A `400` response with `{ error, details: parsed.error.flatten() }` (today's
  existing convention) is mapped onto the corresponding form fields, not just shown as
  a generic message.
- The todo create flow gets a working form built on this pattern.

## 3. Non-goals

- A schema-driven form generator/builder — forms stay hand-written per resource,
  following one consistent pattern, not auto-generated from the schema.
- Multi-step wizards or complex conditional fields.
- File uploads.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Shared schema between client and server

> As Frontend, I want to import Backend's Zod schema for a resource's create/update payload, so client-side validation never drifts from server-side validation.

- **R1.1** WHEN a create/edit form is built for a resource, Frontend SHALL import that
  resource's Zod schema from the location Backend exports it from, rather than
  redefining the validation rules.
- **R1.2** Backend SHALL export create/update Zod schemas from a location importable
  by both a route handler and a Client Component (Zod schemas have no server-only
  dependency and are safe in a client bundle).

### R2 — Form validation & UX

> As a user filling out a create/edit form, I want inline field errors and a disabled submit while in flight, so I get immediate feedback and can't double-submit.

- **R2.1** WHEN a field fails its Zod rule on blur or submit, the system SHALL show
  that field's error message inline, derived from the Zod issue.
- **R2.2** WHEN a form is submitting, the system SHALL disable the submit control
  until the request settles.
- **R2.3** IF the server rejects the payload with `400` and a `details` object (the
  existing `parsed.error.flatten()` shape), THEN the system SHALL map those field
  errors onto the corresponding form fields.

### R3 — Mutation integration

> As Frontend, I want form submission wired through TanStack Query's `useMutation`, so success/error handling and cache invalidation follow the existing convention.

- **R3.1** WHEN a create/update form submits successfully, the system SHALL invalidate
  the relevant list query (per the `queryKey` convention in the `frontend` skill) so
  the UI reflects the change without a manual refetch.
- **R3.2** WHEN a mutation fails for a reason other than field validation (network
  error, `5xx`), the system SHALL surface a non-field-specific error (the actual UI
  for this is spec 0006's toast feedback — this spec only needs to expose that the
  error occurred).

### R4 — Todos form as the reference implementation

> As Frontend, I want a real create-todo form, so the pattern has a working example instead of only being documented.

- **R4.1** the app SHALL include a create-todo form built on this pattern, using the
  existing `createTodoSchema` (relocated per R1.2) from `src/app/api/todos/route.ts`.

## 5. Constraints & assumptions

- Library: this draft assumes `react-hook-form` + `@hookform/resolvers`'s
  `zodResolver` — confirm vs. alternatives (e.g. Conform) before the plan is approved.
- Depends on the existing `todos` `POST` (and ideally spec 0004's pattern, if it has
  landed) for something to submit to; does not strictly require spec 0003 (Auth), but
  forms for future real resources (clients/users/companies) will need it for
  meaningfully scoped data.
- `createTodoSchema` currently lives inline in `src/app/api/todos/route.ts`; this spec
  relocates shared client+server schemas to an importable location without changing
  Backend's ownership of them (Backend still authors/updates the schema; Frontend only
  imports it) — this also intersects with spec 0001's still-open question about a
  dedicated shared-types module location.

## 6. Open questions

- [x] Confirm `react-hook-form` + `zodResolver` as the library choice. — Confirmed.
  Note: `@hookform/resolvers` had to be pinned to `^4` — the latest `^5` ships dual
  Zod v3/v4 typing that doesn't structurally match this project's installed Zod
  3.25.x and fails `tsc --noEmit`.
- [x] Confirm where shared client+server Zod schemas should live — this draft assumes
  `src/lib/schemas/<resource>.ts`, re-exported from the route file for backward
  compatibility. — Confirmed the location; **not** re-exported from the route file as
  originally drafted — Next.js `route.ts` files may only export HTTP method handlers
  and a small set of route-config fields, so re-exporting `createTodoSchema` from
  there fails the build. The route imports it directly from
  `src/lib/schemas/todos.ts` instead, same as the form does.
