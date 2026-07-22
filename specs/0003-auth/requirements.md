# Requirements — Authentication

- **Status:** Implemented (with one scope change from the original draft — see R3.3/R4.3 and Open Questions)
- **Spec ID:** 0003
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Adds email/password authentication so requests carry a real identity instead of the
placeholder `getDefaultOrgId()` used today. Every authenticated user belongs to
exactly one organization (auto-created at sign-up), and organization-scoped API
routes derive `organizationId` from the session instead of trusting the client.

## 2. Goals

- A visitor can sign up with email + password; sign-up creates the user, creates a
  new organization owned by that user, and starts a session.
- A returning user can sign in and sign out.
- Every `src/app/api/**` route that reads/writes organization-scoped data derives
  `organizationId` from the session, never from the request body or query string.
- Pages and API routes that require a session are inaccessible without one.
- The sign-in/sign-up pages and their error messages follow this repo's existing i18n
  convention (locale-prefixed routes, message catalogs).

## 3. Non-goals

- OAuth/social login providers (Google, GitHub, …) — email/password only for v1.
- Multi-user organizations, invitations, or roles/permissions — one user per
  organization for this spec; team membership is a future spec.
- Password reset and email verification flows.
- Rate limiting / brute-force protection on auth endpoints (flagged as a follow-up
  hardening item, not blocking this spec).
- Migrating the existing `organizations` table to a library-provided
  "organization"/multi-tenancy plugin, if the chosen library has one.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Sign up

> As a visitor, I want to create an account with email and password, so that I can access the app as an authenticated user.

- **R1.1** WHEN a visitor submits a valid sign-up form (email + password meeting the
  policy), the system SHALL create a user, create a new organization owned by that
  user, and start an authenticated session.
- **R1.2** IF the email is already registered, THEN the system SHALL reject the
  sign-up with a clear validation error.
- **R1.3** IF the password doesn't meet the minimum policy, THEN the system SHALL
  reject the sign-up with a validation error.

### R2 — Sign in / sign out

> As a returning user, I want to sign in with my email and password and sign out when done, so that I can securely access and leave my account.

- **R2.1** WHEN a user submits valid credentials, the system SHALL start an
  authenticated session and redirect into the app.
- **R2.2** IF credentials are invalid, THEN the system SHALL reject the sign-in with
  a generic error that does not reveal whether the email exists.
- **R2.3** WHEN an authenticated user signs out, the system SHALL end the session and
  redirect to a public page.

### R3 — Session-derived organization scoping

> As Backend, I want every data-mutating request's organization id to come from the session, so that a client can never act on an organization it doesn't belong to.

- **R3.1** WHEN an authenticated request reaches a `src/app/api/**` route that
  reads/writes organization-scoped data **and has opted into session-based
  protection**, the system SHALL derive `organizationId` from the session, never
  from the request body or query string. — **Scope change during implementation**:
  `todos` (the only existing organization-scoped resource) deliberately does **not**
  opt in — see R4.3.
- **R3.2** IF a request to an organization-scoped, session-protected route has no
  valid session, THEN the system SHALL respond `401`. Demonstrated by
  `GET /api/account`, the reference protected route (`todos` remains unprotected, see
  R4.3).
- **R3.3** the system SHALL remove `getDefaultOrgId()` (in
  `src/app/api/todos/route.ts`) and any other placeholder org-resolution logic once
  session-derived scoping is in place. — **Not done, by design**: `getDefaultOrgId()`
  (relocated to `src/lib/organization.ts`, used via `resolveOrganizationId()` in
  `src/lib/crud.ts`) stays in place because `todos` stays public — see R4.3 and the
  Open Questions resolution below.

### R4 — Route protection

> As the app, I want pages and API routes that require a signed-in user to be inaccessible otherwise, so that unauthenticated visitors can't view or modify tenant data.

- **R4.1** WHEN an unauthenticated visitor requests a protected page, the system
  SHALL redirect to the sign-in page.
- **R4.2** WHEN an unauthenticated request hits a protected API route, the system
  SHALL respond `401` instead of rendering/returning data.
- **R4.3** the sign-in page, sign-up page, the existing homepage, and `/api/health`
  SHALL remain accessible without a session. **Extended during implementation**:
  `/api/todos` and the homepage's todo list/form (spec 0005) also remain fully public
  — the homepage's demo depends on them, and gating them would break it for
  anonymous visitors. `/account` (page) and `/api/account` (route) are the new
  protected surfaces that actually demonstrate R3.2/R4.1/R4.2 for real.

### R5 — Locale-aware auth UI

> As a user in either supported locale, I want the sign-in/sign-up pages and auth error messages in my language, so the experience is consistent with the rest of the app.

- **R5.1** the sign-in and sign-up pages SHALL live under `src/app/[locale]/` and
  source their strings from the message catalogs (`src/i18n/messages/{locale}.json`),
  following the existing i18n convention.

## 5. Constraints & assumptions

- Library: this draft assumes **Better Auth** (native Drizzle adapter, TypeScript-first
  design fits this stack directly) — confirm vs. Auth.js (NextAuth v5) before the plan
  is approved.
- Session strategy: cookie-based sessions (the chosen library's default).
- One organization per user, auto-created at sign-up — reuses the existing
  `organizations` table; a new `organizationId` FK is added to the auth library's user
  table rather than adopting a library-provided multi-tenant/organization plugin.
- Auth's own tables (user/session/account/verification, or equivalent for the chosen
  library) are added via Drizzle and go through the existing `db:generate`/`db:migrate`
  flow like any other schema change.
- `middleware.ts` (next-intl's locale middleware) is left as-is; route protection is
  implemented at the Server Component/route-handler level via a shared session helper,
  not by extending the i18n middleware's matcher — keeps the two concerns separate.

## 6. Open questions

- [x] Confirm **Better Auth** vs **Auth.js (NextAuth v5)** as the library. — Confirmed:
  Better Auth.
- [x] Confirm the minimum password policy (length/complexity). — Confirmed: minimum
  8 characters (`emailAndPassword.minPasswordLength: 8`), no complexity rules.
- [x] Confirm which existing routes/pages become protected vs. remain public — this
  draft assumes home, sign-in, sign-up, and `/api/health` stay public; `/api/todos`
  (and any future CRUD resource) becomes protected. — **Resolved differently**:
  `/api/todos` and the homepage's todo demo **stay public** (not protected) — protecting
  them would break the anonymous-visitor demo experience built in spec 0005. Auth
  ships as real infrastructure with its own protected reference surface (`/account`,
  `GET /api/account`) instead of gating the existing public resource.
