---
name: backend
description: >
  Implement backend work for this Next.js + Drizzle + Zod SaaS template — add or change a
  domain table, generate/apply a Drizzle migration, or create/update a Next.js API route
  handler. Use when the user or the Backend teammate needs to touch src/db/schema.ts,
  drizzle/, src/app/api/**, or src/lib/env.ts.
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Backend: schema, migrations, API routes

This template's backend is three layers, always touched in this order: **schema →
migration → route**. Skip the order and the route will reference columns that don't
exist yet in the real database.

## Step 1 — Schema change (`src/db/schema.ts`)

`src/db/schema.ts` is the single source of truth for the database — every shared type
(`Todo`, `NewTodo`, …) is inferred from it, never hand-written.

Standard shape for a new domain table:

```typescript
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

Rules, matching the existing `todos` table:

- Primary key is always `uuid("id").primaryKey().defaultRandom()`.
- **Every domain table is multi-tenant**: a required `organizationId` FK to
  `organizations.id` with `onDelete: "cascade"`. There is no exception to this in the
  current schema — don't add a table without it.
- Timestamps are `timestamp(..., { withTimezone: true }).notNull().defaultNow()`.
- Always export `$inferSelect`/`$inferInsert` types — these *are* the shared types
  Frontend and Test consume. Update them here first, before finishing the route, so
  downstream work isn't blocked on you.

## Step 2 — Migration

```bash
npm run db:generate   # reads src/db/schema.ts, writes SQL into drizzle/
npm run db:migrate    # applies pending migrations (scripts/migrate.ts)
```

- Never hand-edit a generated file under `drizzle/`. If a migration looks wrong, fix
  the schema and regenerate.
- `db:migrate` must succeed locally against `docker compose up -d db` before you touch
  the route — the API layer assumes the table already exists.

## Step 3 — Zod schemas (`src/lib/schemas/<resource>.ts`)

Insert/update schemas live in their own module, not inline in the route file —
Frontend imports the same schema for client-side validation (see the `frontend`
skill's "Client-side forms" section), and a `route.ts` file may only export HTTP
method handlers plus a small set of route-config fields, so it can't itself export a
schema for anyone else to import.

```typescript
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
});

export const updateProjectSchema = createProjectSchema.partial();
```

## Step 4 — API routes via `createCrudHandlers` (`src/lib/crud.ts`)

New resources don't hand-write route handlers — `src/lib/crud.ts`'s
`createCrudHandlers()` factory builds list (paginated/sorted/filtered), get-by-id,
create, update, and delete from a config object. `src/app/api/todos/` is the
reference implementation to copy:

```typescript
// src/app/api/projects/_crud.ts  (the "_" prefix keeps Next.js from routing this file)
import { projects } from "@/db/schema";
import { createProjectSchema, updateProjectSchema } from "@/lib/schemas/projects";
import { createCrudHandlers } from "@/lib/crud";

export const projectsCrud = createCrudHandlers({
  table: projects,
  insertSchema: createProjectSchema,
  updateSchema: updateProjectSchema,
  allowedSort: ["name", "createdAt"],
  allowedFilters: { name: "text" }, // "text" → ilike, "exact" → eq
  defaultSort: { column: "createdAt", direction: "desc" },
});
```

```typescript
// src/app/api/projects/route.ts
import { projectsCrud } from "./_crud";
export const { GET, POST } = projectsCrud.collection;
```

```typescript
// src/app/api/projects/[id]/route.ts
import { projectsCrud } from "../_crud";
export const { GET, PATCH, DELETE } = projectsCrud.item;
```

What the factory guarantees, so you don't have to re-derive it per resource:

- Every query is scoped by `organizationId` — there's no config option that skips it.
  This comes from `resolveOrganizationId()` in `src/lib/crud.ts`, which still
  intentionally uses the `getDefaultOrgId()` placeholder (`src/lib/organization.ts`)
  unconditionally — resources built on `createCrudHandlers` stay public by default
  (see `todos`). If a **new** resource should require a session, don't wire that
  through `crud.ts` — call `getSession()`/`requireSessionOrRedirect()` from
  `src/lib/auth.ts` directly in that resource's own route, the way
  `src/app/api/account/route.ts` does (see Step 5).
- Get/update/delete respond `404` (never `403`) for a missing id **or** one belonging
  to another organization — don't leak cross-tenant existence.
- Invalid payload → `400` with `{ error, details: parsed.error.flatten() }`, same
  convention as before.
- Every response uses a `{ data, ... }` envelope: `{ data: <row> }` for
  get/create/update, `{ data: <row[]>, page, pageSize, total }` for list. Don't invent
  a resource-specific key (`{ projects: [...] }`) — the whole point is a uniform shape
  across resources.
- List query params: `page`/`pageSize` (offset-based), `sort` (a bare column name, or
  `-column` for descending — must be in `allowedSort` or the request `400`s), and any
  key declared in `allowedFilters`.
- `created!.id` style non-null assertions after `.returning()` are still expected
  where you drop to raw Drizzle outside the factory — `noUncheckedIndexedAccess` is on,
  and a `.returning()` after a single insert is known to produce exactly one row.
- Drizzle's table generics are hard to express precisely in a fully generic factory
  like this — `crud.ts` uses a deliberately loose internal type for the table
  parameter (documented in the file itself). This is a template/reference
  implementation, not a published library; don't take it as a model for how to type a
  general-purpose generic Drizzle helper elsewhere.

## Step 5 — Protecting a route with a session (opt-in, not automatic)

`createCrudHandlers` resources are public by default (see Step 4). A resource that
should require sign-in doesn't go through `crud.ts` at all — call the session helpers
from `src/lib/auth.ts` directly:

```typescript
// Route Handler — 401 instead of throwing/redirecting
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  // session.user.organizationId is guaranteed present here
  return NextResponse.json({ data: { organizationId: session.user.organizationId } });
}
```

```typescript
// Server Component / page — redirects to sign-in instead of 401ing
import { headers } from "next/headers";
import { requireSessionOrRedirect } from "@/lib/auth";

export default async function ProtectedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await requireSessionOrRedirect(await headers(), locale);
  // ...
}
```

- `getSession()` provisions the user's organization the first time it's needed (see
  the Auth bullet in `CLAUDE.md`) — never assume `session.user.organizationId` might
  legitimately be `null` once you have a session.
- `src/app/api/account/route.ts` and `src/app/[locale]/account/page.tsx` are the
  reference implementations for these two patterns.

## New environment variables

Add required env vars to the Zod schema in `src/lib/env.ts`, not via ad-hoc
`process.env.X` reads elsewhere — it validates at import time and fails fast on boot
if something's missing.

## Common mistakes to avoid

| Mistake | Correct approach |
| --- | --- |
| Adding a domain table without `organizationId` | Every domain table is tenant-scoped — no exceptions |
| Hand-editing a file in `drizzle/` | Change `schema.ts` and re-run `npm run db:generate` |
| Trusting `organizationId` from the request body | Always derive it server-side via `resolveOrganizationId()` in `src/lib/crud.ts` |
| Reading env vars directly from `process.env` | Add them to the schema in `src/lib/env.ts` |
| Skipping `db:migrate` before testing a new route | The route will fail at runtime against a table that doesn't exist yet |
| Hand-writing `GET`/`POST`/etc. for a new resource | Use `createCrudHandlers()` from `src/lib/crud.ts` — see Step 4 |
| Exporting a schema or other value from a `route.ts` file | Route Handlers may only export HTTP methods + route config; put shared schemas in `src/lib/schemas/` |
| Gating an existing public resource (e.g. `todos`) behind a session without checking first | `/api/todos` is intentionally public (spec 0003) since the homepage demo depends on it — confirm with the lead before changing that |
