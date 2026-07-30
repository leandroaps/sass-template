# Requirements — Upgrade to Next.js 16

- **Status:** Implemented
- **Spec ID:** 0018
- **Author:**
- **Last updated:** 2026-07-30

## 1. Summary

Upgrades the app's core framework from `next@^15.5.20` to the current Next.js
16 stable line, plus every directly-coupled dependency that Next 16's own
breaking changes or peer-dependency ranges force a bump on (`react`/
`react-dom`, `eslint-config-next`, `@playwright/test`, `next-intl`). Covers
the two mechanical renames Next 16 requires (`middleware.ts` → `proxy.ts`,
`next lint` → a direct ESLint invocation) and confirms — by inspection, not
assumption — which of Next 16's other breaking changes simply don't apply to
this codebase today.

## 2. Goals

- The app builds, typechecks, lints, and runs on `next@16.x` (stable, not
  canary/beta) with no behavioral regression in i18n routing, auth, or the
  existing UI.
- Every dependency whose installed version no longer satisfies Next 16's own
  peer-dependency range (`react`, `react-dom`, `@playwright/test`) or whose
  Next-coupled release line needs to track the new major
  (`eslint-config-next`) is bumped to a version that does.
- The two Next 16 renames this app is actually affected by —
  `src/middleware.ts` → `src/proxy.ts`, and the removed `next lint` command
  — are applied, with `npm run lint`/`npm run ci:verify` continuing to work.
- Every other Next 16 breaking change (removed AMP support, `next/legacy/
  image`, `serverRuntimeConfig`/`publicRuntimeConfig`, `experimental.ppr`/
  `dynamicIO`, parallel-route `default.js`, `revalidateTag()`'s new
  signature, `images.domains`) is explicitly confirmed inapplicable to this
  codebase or migrated, not silently skipped.
- Existing CI (`quality` job) and the full Playwright E2E suite keep passing
  after the bump.

## 3. Non-goals

- Enabling any of Next 16's new *opt-in* capabilities — Cache Components
  (`cacheComponents: true`), the stable React Compiler (`reactCompiler:
  true`), or Turbopack filesystem caching (`turbopackFileSystemCacheForDev`).
  This spec gets the app running correctly on the v16 baseline; adopting new
  capabilities on top of that baseline is a deliberate, separate decision
  for a future spec.
- Migrating the Cloudflare deploy target off Containers onto an edge/
  serverless adapter (`@opennextjs/cloudflare`/`next-on-pages`) — spec 0008
  already rejected this explicitly; this spec keeps the same Node
  `output: "standalone"` build running in the same Docker container
  unchanged in shape.
- Bumping ESLint from v9 to v10, or making it a hard requirement to fully
  reconcile every finding `eslint-config-next@16.x`'s re-bundled
  `eslint-plugin-react`/`eslint-plugin-jsx-a11y` might surface across the
  *existing* codebase (built without those rules active — see CLAUDE.md's
  "Known gap" note on this). `eslint-config-next@16.x` only requires
  `eslint >=9.0.0`, so no ESLint major bump is forced by this spec either
  way.
- Any new feature work, UI change, database schema change, or route change —
  this is a framework/dependency version bump only.
- Bumping unrelated pinned dependencies (`typescript`, `zod`,
  `@hookform/resolvers`, `drizzle-orm`/`drizzle-kit`, `better-auth`,
  `tailwindcss`, `wrangler`, `@cloudflare/containers`) — none of these carry
  a version constraint tied to `next`'s major version; touching them is a
  separate decision outside this spec's scope.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks
can reference it.

### R1 — Core framework upgraded

> As the maintainer, I want the app running on Next.js 16 stable, so the codebase stays on a supported release line and can adopt v16-only capabilities later.

- **R1.1** the system SHALL run on `next@^16.x` (the current stable
  dist-tag, not a canary/beta/preview release) in place of `next@^15.5.20`.
- **R1.2** `react`/`react-dom` SHALL be at a version satisfying Next 16's own
  peer range (`^19.0.0` at minimum).
- **R1.3** IF this app uses a Next.js API that v16 removed or now requires
  called asynchronously (sync `cookies()`/`headers()`/`draftMode()`, sync
  `params`/`searchParams`, `next/legacy/image`, AMP APIs,
  `serverRuntimeConfig`/`publicRuntimeConfig`, the `experimental.ppr`/
  `experimental.dynamicIO` config flags, `export const experimental_ppr`),
  THEN it SHALL be migrated to the v16-supported form before the upgrade is
  considered done — and IF an inspection confirms the app doesn't use one of
  these at all, THEN that SHALL be recorded as a verified no-op rather than
  left unchecked.

### R2 — Request-interception boundary renamed

> As the maintainer, I want `src/middleware.ts` renamed per Next 16's convention, so the app follows the current (not deprecated) file convention.

- **R2.1** the system SHALL rename `src/middleware.ts` to `src/proxy.ts` —
  Next 16's replacement; the old filename still works but is deprecated and
  slated for removal in a future version.
- **R2.2** the renamed file SHALL keep next-intl's `createMiddleware(routing)`
  default export and existing `config.matcher` (excluding `/api/**`)
  unchanged — next-intl's own migration guidance confirms no code change is
  needed beyond the rename itself.
- **R2.3** locale negotiation (cookie → `Accept-Language` → `pt-BR` default)
  and the redirect-to-locale-prefixed-path behavior SHALL be unchanged after
  the rename.

### R3 — Lint tooling migrated off the removed `next lint` command

> As the maintainer, I want `npm run lint` to keep working, so CI's quality gate doesn't silently break on the upgrade.

- **R3.1** the system SHALL replace `package.json`'s `"lint": "next lint"`
  script with a direct ESLint invocation against the existing
  `eslint.config.mjs` (`next lint` no longer exists in v16, and `next build`
  no longer runs linting as an implicit side effect either).
- **R3.2** `npm run ci:verify` (lint + typecheck) SHALL continue to pass
  after the bump. IF a version bump inside `eslint-config-next`'s own
  dependency tree surfaces a lint finding that didn't exist before (e.g.
  from `eslint-plugin-react`/`eslint-plugin-jsx-a11y` being re-included),
  THEN it SHALL either be fixed or explicitly deferred with a documented
  reason — never silently suppressed (e.g. via a blanket rule disable) just
  to make the command exit green.

### R4 — Dependent library versions realigned

> As the maintainer, I want every library whose compatibility is coupled to Next's major version bumped alongside it, so `npm install` produces no peer-dependency warnings.

- **R4.1** `eslint-config-next` SHALL be bumped to the Next-16-compatible
  release line.
- **R4.2** `@playwright/test` SHALL be bumped to satisfy Next 16's own
  peer-dependency floor on it.
- **R4.3** `next-intl` SHALL be bumped to a version confirmed compatible
  with Next 16's `proxy.ts` rename and Turbopack-as-default.
- **R4.4** `@types/react`/`@types/react-dom` SHALL track whatever
  `react`/`react-dom` version is chosen to satisfy R1.2.

### R5 — Turbopack-as-default doesn't regress the build

> As the maintainer, I want dev/build to keep working now that Turbopack (not webpack) is the implicit default, so the upgrade doesn't trade one working bundler for a broken one.

- **R5.1** WHEN `npm run dev`/`npm run build` run after the upgrade (no
  `--webpack` flag added), THEN next-intl's plugin
  (`createNextIntlPlugin`) SHALL still resolve `src/i18n/request.ts`
  correctly. IF it doesn't out of the box — a known, documented next-intl/
  Turbopack module-resolution issue — THEN the system SHALL add the
  documented `turbopack: {}` entry to `next.config.ts` rather than falling
  back to `--webpack`.
- **R5.2** the existing Docker multi-stage build (CLAUDE.md's 3-stage
  `deps`/`builder`/`runner` Dockerfile, `output: "standalone"`) SHALL keep
  producing a working image using Turbopack's production build, with no
  Dockerfile restructuring.

### R6 — No functional regression

> As the maintainer, I want existing behavior unchanged after the upgrade, so this is purely a version bump, not a rewrite.

- **R6.1** every existing Playwright E2E spec SHALL continue to pass after
  the upgrade. A test file may need a mechanical update only if an
  underlying API genuinely changed shape — never edited to paper over a real
  regression.
- **R6.2** i18n locale routing SHALL behave identically to before the
  upgrade (R2.3), verified by the existing locale-routing E2E coverage.
- **R6.3** `better-auth`'s Next.js adapter (`nextCookies`,
  `toNextJsHandler`) SHALL continue to set/read session cookies correctly
  now that `proxy.ts` runs on the Node.js runtime, verified by the existing
  auth E2E coverage plus a manual sign-up/sign-in smoke test.
- **R6.4** the landing page's `next/image` usages (all currently marked
  `unoptimized`) SHALL keep rendering unchanged — v16's new
  optimizer-only defaults (`images.qualities`, `minimumCacheTTL`,
  `localPatterns`, `dangerouslyAllowLocalIP`, etc.) only apply to optimized
  images, so no `next.config.ts` `images` block is required by this spec.

## 5. Constraints & assumptions

- TypeScript stays pinned per CLAUDE.md's existing, documented constraint
  (`^5.9.3`, not the 6.x line `typescript-eslint` doesn't yet support) —
  Next 16 only requires TypeScript `>=5.1.0`, already comfortably satisfied,
  so this spec doesn't touch the TypeScript version.
- `zod` stays at `^3.25.76` and `@hookform/resolvers` stays pinned to `^4.x`
  — both existing, documented constraints unrelated to Next's own version;
  neither is touched by this spec.
- Dockerfile already uses `node:22-alpine` and CI's `actions/setup-node`
  already pins `node-version: 22` — both already satisfy v16's new
  `node >=20.9.0` floor; no change needed there.
- Confirmed by reading `next.config.ts`: it only sets `output: "standalone"`
  plus the next-intl plugin wrapper — none of the removed/renamed config
  keys (`experimental.turbopack`, `experimental.dynamicIO`,
  `experimental.ppr`, `images.domains`, `serverRuntimeConfig`/
  `publicRuntimeConfig`) are in use today, so no config-key migration is
  needed beyond R5.1's conditional `turbopack: {}` addition.
- Confirmed by search: no parallel-route (`@slot`) folders exist under
  `src/app/**` today, so v16's new `default.js` requirement for parallel
  route slots has nothing to migrate.
- Confirmed by search: no usage of `revalidateTag()`, `unstable_cache`, or
  `experimental_ppr` exists in `src/**` today, so the `revalidateTag()`
  signature change and PPR removal have nothing to migrate either.
- Confirmed by search: no sync `cookies()`/`headers()` access exists outside
  an `await` today — this app was already built against Next 15's
  already-async requirement.
- Real package versions available as of this spec's research (re-check
  `npm view <pkg> dist-tags.latest` before actually running `npm install` —
  these will have moved by implementation time):
  - `next@16.2.12` (peer: `react`/`react-dom` `^19.0.0`, `node >=20.9.0`)
  - `eslint-config-next@16.2.12` (peer: `eslint >=9.0.0`, `typescript
    >=3.3.1`)
  - `@playwright/test@1.62.0` (satisfies Next 16's own `^1.51.1` peer floor
    — current `^1.49.1` does not)
  - `next-intl@4.13.4`
  - `react@19.2.8`/`react-dom@19.2.8` (latest patch; R1.2 only strictly
    requires the `^19.0.0` peer floor, already met by the current
    `^19.0.0` — see open question below on whether to bump the patch)
- `better-auth`'s `package.json` declares no explicit peer-dependency range
  on `next` for its `better-auth/next-js` subpath (confirmed by inspecting
  the installed package) — so `npm install` won't warn either way about
  Next 16 compatibility; R6.3's smoke test/E2E coverage is what actually
  catches a regression here, not the package manager.

## 6. Open questions — resolved

- [x] Bump `react`/`react-dom` to latest `19.2.x`, or leave at the
  `^19.0.0` floor? **Resolved:** no action needed either way — the
  existing `^19.0.0` range in `package.json` already resolved to `19.2.8`
  in `package-lock.json` before this spec touched anything, so the "latest
  patch" outcome was already in place.
- [x] Would `eslint-config-next@16.x` re-including `eslint-plugin-react`/
  `eslint-plugin-jsx-a11y` surface enough new findings to need a follow-up
  spec? **Resolved:** zero new findings — see tasks.md T6. No follow-up
  needed. (The bump did surface a different, more serious problem — a
  crash, not findings — from bridging the now-native-flat config through
  the old `FlatCompat` layer; fixed as part of this spec, see T6.)
- [ ] Timing: any deploy-window constraint from whoever owns spec 0008's
  production approval gate, or is this upgrade free to land on `main`
  whenever CI is green? **Still open** — for the user to answer, not
  decidable from the code.
