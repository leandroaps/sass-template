# Design — Authentication

- **Status:** Draft
- **Spec ID:** 0003
- **Implements:** requirements.md

## 1. Overview

Better Auth is mounted behind a single catch-all route handler and configured with
its Drizzle adapter against new `user`/`session`/`account`/`verification` tables.
Sign-up creates a user, auto-creates an organization owned by that user, and links
them via a new `organizationId` FK on the user table. Sign-in/sign-out are driven from
Client Components via Better Auth's React client. A shared server-side helper resolves
the current session and its `organizationId`, replacing `getDefaultOrgId()` everywhere
it's used.

## 2. Architecture

```
src/lib/auth.ts           # Better Auth server config (Drizzle adapter, session opts)
src/lib/auth-client.ts    # Better Auth React client (signUp/signIn/signOut, useSession)
src/app/api/auth/[...all]/route.ts   # Better Auth's Next.js catch-all handler

src/app/[locale]/sign-up/page.tsx    # Client Component form → authClient.signUp.email()
src/app/[locale]/sign-in/page.tsx    # Client Component form → authClient.signIn.email()

requireSession(request) / getSession(request)   # in src/lib/auth.ts
  → used by protected Server Components and route handlers
  → redirects (page) or 401s (API route) when no session
  → exposes session.user.organizationId for scoping
```

Request flow for a protected API route:

```
request → route handler
  │
  ▼
getSession(request) via Better Auth
  │
  ├─ no session → 401 (R3.2, R4.2)
  │
  └─ session found → organizationId = session.user.organizationId
                       → Zod-validate body → Drizzle query scoped by organizationId
                       → NextResponse.json(...)
```

`middleware.ts` (next-intl) is untouched — it only resolves locale. Auth gating happens
inside each protected page/route, not in middleware, per the constraint in
requirements.md.

## 3. Data model

New tables added to `src/db/schema.ts` (exact column set follows the chosen library's
Drizzle-adapter requirements; shape below is Better Auth's default):

| Table | Purpose | Key columns |
| --- | --- | --- |
| `user` | Account identity | `id`, `email` (unique), `emailVerified`, `name`, `image`, **`organizationId`** (new FK → `organizations.id`, `notNull`), `createdAt`, `updatedAt` |
| `session` | Active sessions | `id`, `userId` FK, `token`, `expiresAt`, `createdAt`, `updatedAt` |
| `account` | Credential storage (hashed password) | `id`, `userId` FK, `providerId`, `accountId`, `password` (hashed) |
| `verification` | Reserved for future email verification | `id`, `identifier`, `value`, `expiresAt` |

`organizations` (existing table) is unchanged. Every other domain table (`todos`, and
any future resource) keeps its existing `organizationId` FK — this spec only adds the
link from `user` to `organizations`, it doesn't touch domain tables.

## 4. API

| Method | Path | Auth / permission | Description |
| ------ | ---- | ------------------ | ----------- |
| POST | `/api/auth/sign-up/email` | public | Create user + organization, start session (R1.1–R1.3) |
| POST | `/api/auth/sign-in/email` | public | Start session (R2.1, R2.2) |
| POST | `/api/auth/sign-out` | session | End session (R2.3) |
| GET | `/api/auth/get-session` | — | Current session (used internally by `getSession()`) |
| GET/POST | `/api/todos` | **session (was: none)** | Now requires a session; `organizationId` comes from it (R3.1) |

The `/api/auth/**` paths above are handled entirely by Better Auth's catch-all route —
this table documents the effective endpoints, not hand-written handlers.

## 5. Migrations & data backfill

Standard flow: update `src/db/schema.ts` → `npm run db:generate` → review the generated
SQL in `drizzle/` → `npm run db:migrate`. No backfill needed (new tables, no existing
rows to migrate) except that `user.organizationId` is `NOT NULL` from creation, so no
nullable-then-backfill step is required since there are no pre-existing users.

## 6. Security & multi-tenancy

- Passwords are hashed by the auth library, never stored or logged in plaintext.
- Session cookie is `httpOnly` + `secure` (production) per the library's defaults.
- `organizationId` is **only** ever read from `session.user.organizationId` inside a
  route handler — R3.1 explicitly forbids accepting it from the request body/query.
- Sign-in error messages are intentionally generic (R2.2) to avoid user enumeration.
- Rate limiting on auth endpoints is explicitly out of scope (see Non-goals) but noted
  here as a known gap for a future hardening pass.

## 7. Testing strategy

Playwright, extending `e2e/`:

- Sign-up with a new email creates an account, an organization, and redirects into the
  app (R1.1).
- Sign-up with an already-registered email is rejected with a validation error (R1.2).
- Sign-up with a too-short password is rejected (R1.3).
- Sign-in with valid credentials succeeds (R2.1); with invalid credentials fails with a
  generic error (R2.2).
- Sign-out ends the session and redirects to a public page (R2.3).
- Visiting a protected page while signed out redirects to sign-in (R4.1); hitting
  `/api/todos` while signed out returns `401` (R3.2, R4.2).
- `/api/health` and the homepage remain reachable without a session (R4.3).

## 8. Risks & alternatives considered

- **Risk:** keeping the existing hand-rolled `organizations` table instead of adopting
  the auth library's own multi-tenancy/organization plugin (if it has one) means less
  out-of-the-box support if multi-user organizations are needed later. *Mitigation:*
  accepted for this spec per Non-goals; revisit as a dedicated spec if/when team
  membership becomes a real requirement — the `organizationId` FK on `user` is a small
  enough surface to migrate away from later.
- **Alternative considered:** Auth.js (NextAuth v5) — more widely adopted/battle-tested,
  but its Drizzle adapter and TypeScript ergonomics are less direct than Better Auth's
  for this stack. Left as an explicit open question in requirements.md rather than
  decided unilaterally, since it's a foundational dependency choice.
- **Risk:** gating routes at the Server Component/handler level (rather than in
  `middleware.ts`) means protection must be added to each new protected route
  individually. *Mitigation:* the shared `requireSession()` helper makes this a
  one-line addition per route; documented in the `backend`/`frontend` skills once
  implemented so it isn't forgotten on new resources.
