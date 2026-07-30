# Design — Upgrade to Next.js 16

- **Status:** Draft
- **Spec ID:** 0018
- **Implements:** requirements.md

## 1. Overview

A version bump, not a rewrite: `next`/`react`/`react-dom` move to the
Next-16-compatible line, and every dependency whose compatibility is
coupled to Next's major (`eslint-config-next`, `@playwright/test`,
`next-intl`) moves alongside it. Two mechanical renames Next 16 itself
requires/deprecates are applied by hand rather than via the automated
codemod, since each is a one-line change with no ambiguity:
`src/middleware.ts` → `src/proxy.ts` (content unchanged), and
`package.json`'s `"lint": "next lint"` → a direct `eslint .` invocation.
`npx @next/codemod@canary upgrade latest` can still be run first to handle
the mechanical parts of the framework bump itself (import path fixes,
config-key renames) — it's a no-op for the two renames above since this
codebase doesn't hit most of the other v16 removals (confirmed in
requirements.md §5), but running it is still lower-risk than a fully manual
`npm install` for anything it *does* catch.

Every other Next 16 breaking change surfaced by this spec's research
(AMP removal, `next/legacy/image`, `serverRuntimeConfig`/
`publicRuntimeConfig`, `experimental.ppr`/`dynamicIO`, parallel-route
`default.js`, `revalidateTag()`'s signature, `images.domains`) was checked
against this specific codebase and confirmed not applicable — no migration
work exists for them, only the verification step itself (§7, R1.3).

## 2. Architecture

```text
package.json
  dependencies:
    next            ^15.5.20 -> ^16.2.12
    react            ^19.0.0 -> ^19.2.8   (see requirements.md open question)
    react-dom        ^19.0.0 -> ^19.2.8
    next-intl        ^4.13.2 -> ^4.13.4
  devDependencies:
    eslint-config-next ^15.1.0 -> ^16.2.12
    @playwright/test   ^1.49.1 -> ^1.62.0
    @types/react       ^19.0.2 -> matching react's chosen version
    @types/react-dom   ^19.0.2 -> matching react-dom's chosen version
  scripts:
    "lint": "next lint" -> "lint": "eslint ."
    (ci:verify already just chains "npm run lint && npm run typecheck" —
    unchanged, since it only calls the script name, not `next lint`
    directly)

src/middleware.ts -> src/proxy.ts   (git mv; content unchanged)
  import createMiddleware from "next-intl/middleware";
  import { routing } from "@/i18n/routing";

  export default createMiddleware(routing);

  export const config = {
    matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
  };
  — next-intl's own Next-16 migration guidance confirms this file's
  contents need zero changes beyond the rename: the default export stays a
  bare `createMiddleware(routing)` call, no renamed local function needed
  (Next 16 only cares that the *file* is named `proxy.ts` and has a default
  export, not that any internal identifier be literally named `proxy`).

next.config.ts   (no change expected — see requirements.md §5's confirmed-
  inapplicable list; only touched conditionally per R5.1)
  IF `npm run dev`/`npm run build` under Turbopack fails to resolve
  `src/i18n/request.ts` (a known, documented next-intl/Turbopack issue —
  see design.md §8), THEN add:
    const nextConfig: NextConfig = {
      output: "standalone",
      turbopack: {},   // next-intl/Turbopack module-resolution workaround
    };
  — added only if the failure actually reproduces during T7 (tasks.md), not
  preemptively, to keep the diff minimal and traceable to an observed cause.

CLAUDE.md
  Update the one line describing "A root `middleware.ts` resolves the
  active locale..." to say `src/proxy.ts` instead, so the doc doesn't go
  stale the moment this spec ships. No other CLAUDE.md content is expected
  to need a change (the Project/Architecture bullets don't otherwise name
  `next lint` or a specific Next minor).
```

No other application file changes — no route, schema, component, or test
*logic* changes. `e2e/**` files are exercised as-is (R6.1); any edit there
would only be to fix a genuine, mechanical API-shape break, and none is
anticipated per requirements.md §5's inspection.

## 3. Data model

None — no schema/migration changes.

## 4. API

None — no route changes. `src/app/api/**` is untouched by this spec; Next's
own request-handling internals change under the hood, but no route handler
in this codebase uses a Next 16-removed API (confirmed: async
`cookies()`/`headers()` already used everywhere, per requirements.md §5).

## 5. Migrations & data backfill

None.

## 6. Security & multi-tenancy

- `proxy.ts` (R2) now runs on the Node.js runtime instead of being
  Edge-capable — a broadening of what's available (Node APIs now usable),
  not a restriction, and this app's proxy logic is just next-intl's
  `createMiddleware(routing)`, which used no Edge-only API either way. No
  security-relevant behavior change.
- No new attack surface, no new env vars, no new credentials — this is a
  dependency-version change only.
- `better-auth`'s cookie-setting behavior (R6.3) is the one place a subtle
  regression could plausibly leak into a security-relevant path (a session
  cookie silently failing to be set/read under the new proxy runtime) —
  covered by an explicit smoke test rather than assumed safe from the
  absence of a peer-dependency warning (see requirements.md §5's note that
  `better-auth` declares no `next` peer range at all).

## 7. Testing strategy

Executed in this order so a failure is caught as early/cheaply as possible:

1. `npm run ci:verify` (lint via the new script + typecheck) — R1.3, R3.1,
   R3.2. Any new lint finding from `eslint-config-next@16.x`'s dependency
   tree is triaged here: fixed if small/clearly correct, or documented as
   deferred (R3.2) if the volume warrants a follow-up spec (see
   requirements.md's open question).
2. `npm run dev`; visit `/pt-BR` and `/en`, confirm locale
   negotiation/redirect still works under Turbopack (R2.3, R5.1, R6.2). If
   next-intl fails to resolve its request config under Turbopack, apply the
   `turbopack: {}` fallback from §2 and re-verify.
3. Manual sign-up/sign-in smoke test against the dev server — confirm a
   session cookie is set and a subsequent authenticated request succeeds
   (R6.3).
4. `npm run build && npm run start`; confirm the standalone server boots
   and serves the same pages correctly under a production build (R5.2).
5. `docker build` the existing Dockerfile through at least the `builder`
   stage, confirming Turbopack's production build succeeds inside the
   `node:22-alpine` image unchanged (R5.2) — this is the environment CI's
   `docker` job and the actual deploy pipeline (spec 0008) both depend on.
6. `npm run test:e2e` (full Playwright suite) — R6.1. Any failure is
   triaged as either a mechanical, expected API-shape change (fix the test)
   or a genuine regression (fix the app code, or if neither is immediately
   clear, flag it rather than guessing).

## 8. Risks & alternatives considered

- **Alternative considered:** stay on the `--webpack` flag to avoid
  Turbopack-related surprises entirely, since `next build --webpack`/`next
  dev --webpack` remain available. Rejected — Next 16 makes Turbopack the
  default and states webpack is the path being phased down; taking on the
  one small, already-documented next-intl/Turbopack resolution risk now
  (R5.1) is preferable to accumulating more drift before the *next* major,
  when webpack support may be gone entirely.
- **Risk:** `eslint-config-next@16.x` re-bundles `eslint-plugin-react`/
  `eslint-plugin-jsx-a11y`/`eslint-plugin-react-hooks` (confirmed via
  `npm view eslint-config-next@latest dependencies`) — this app's
  `eslint.config.mjs` already does `compat.extends("next/core-web-vitals",
  "next/typescript")`, so these plugins will actually run this time (unlike
  when CLAUDE.md's "Known gap" note was written, the repo is still on
  `eslint@^9.17.0`, not the v10 line that note was warning about
  incompatibility with — so no crash is expected, just potentially new,
  previously-unenforced findings). *Mitigation:* R3.2's explicit fix-or-
  defer allowance, sized during T6 (tasks.md) rather than guessed at here.
- **Risk:** `better-auth`'s Next.js adapter has no `next` peer-version pin,
  so a real incompatibility wouldn't show up as an install-time warning.
  *Mitigation:* R6.3's dedicated smoke test/E2E gate.
- **Risk:** Turbopack's production build behaving differently than
  webpack's inside the Docker `builder` stage specifically (different
  filesystem/caching assumptions in a container vs. local dev).
  *Mitigation:* §7 step 5 exercises the actual Docker build, not just local
  `npm run build`, before considering this spec done.
- **Deferred, not solved here:** Cache Components (`cacheComponents: true`)
  is arguably the more consequential change in Next 16 for an app shaped
  like this one — it turns off implicit Server Component caching entirely
  unless a component opts into `"use cache"`. This app already fetches
  fresh data per request in its Server Components (CLAUDE.md's documented
  pattern: "keep using that for data needed at initial render"), so
  enabling it is *expected* to be a no-op — which is exactly why it's not
  turned on here: verifying that expectation and deciding whether any page
  would actually benefit from opting specific pieces into caching is a
  deliberate, separate decision for a future spec once this baseline bump
  has shipped and settled.
