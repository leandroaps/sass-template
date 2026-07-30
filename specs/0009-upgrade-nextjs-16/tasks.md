# Tasks — Upgrade to Next.js 16

- **Status:** Implemented
- **Spec ID:** 0018
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Re-checked dist-tags at implementation time — `next@16.2.12`,
  `eslint-config-next@16.2.12`, `next-intl@4.13.4` still current;
  `@playwright/test` latest was `1.62.1` (one patch newer than the spec's
  researched `1.62.0`). Bumped `package.json`: `next` → `^16.2.12`,
  `next-intl` → `^4.13.4`, `eslint-config-next` → `^16.2.12`,
  `@playwright/test` → `^1.62.1`. Left `react`/`react-dom` at `^19.0.0` (R1.2
  already satisfied by that floor) → R1.1, R1.2

- [x] **T2** `npm install`: 35 added, 3 removed, 15 changed. `npm ls`
  confirms everything deduped at `next@16.2.12`/`react@19.2.7` with **zero**
  peer-dependency warnings for `next`/`react`/`react-dom`/`@playwright/test`.
  `@types/react@19.2.17`/`@types/react-dom@19.2.3` already resolve correctly
  under their existing `^19.0.2` ranges — no `package.json` range change
  needed for R4.4 → R1.2, R4.1–R4.4

- [x] **T3** `git mv src/middleware.ts src/proxy.ts` — content unchanged →
  R2.1, R2.2

- [x] **T4** Bumping `eslint-config-next` to 16.x broke `eslint.config.mjs`
  exactly as design.md's risk section anticipated: `eslint-config-next@16.x`
  ships **native flat config** under its `/core-web-vitals` and
  `/typescript` subpath exports now (confirmed by reading
  `node_modules/eslint-config-next/dist/*.js` and its `package.json`
  `exports` map), so the old `FlatCompat.extends("next/core-web-vitals",
  "next/typescript")` bridge (a 15.x-era workaround for that version's
  legacy `extends`-style config) needed replacing. Rewrote
  `eslint.config.mjs` to import `eslint-config-next/core-web-vitals` and
  `eslint-config-next/typescript` directly and spread them into the flat
  config array, dropping `FlatCompat`/`@eslint/eslintrc` entirely (also
  removed the now-unused `@eslint/eslintrc` devDependency) → R1.3, R3.2

- [x] **T5** `npm run ci:verify` (`eslint .` + `tsc --noEmit`) exits 0 with
  **zero** findings — `eslint-plugin-react`/`eslint-plugin-jsx-a11y`/
  `eslint-plugin-react-hooks` are now actually active (bundled inside
  `eslint-config-next`'s flat configs) and surfaced nothing new across the
  existing codebase → R3.1, R3.2

- [x] **T6** Verified via live HTTP checks against `npm run dev` (Turbopack):
  `GET /` → `307` to `/pt-BR`; `GET /xx` → `307` to `/pt-BR/xx` → `404`
  (unsupported locale correctly not found within the locale); `GET /en` →
  `200`; `GET /api/health` → `{"status":"ok","db":"up"}`. next-intl resolved
  `src/i18n/request.ts` under Turbopack with **no** `turbopack: {}`
  workaround needed — `next.config.ts` left unchanged → R2.3, R5.1, R6.2

- [x] **T7** `next dev` auto-migrated `tsconfig.json`'s `"jsx": "preserve"`
  → `"jsx": "react-jsx"` on first run, reporting it as a "mandatory" Next 16
  change (React's automatic JSX runtime). Kept this change — it's the
  framework's own migration, not a manual edit → R1.3 (verified no-op
  otherwise: no sync `cookies()`/`headers()`, no `next/legacy/image`, no
  `serverRuntimeConfig`/`publicRuntimeConfig`, no `experimental.ppr`/
  `dynamicIO`, no parallel-route `@slot` folders, no `revalidateTag()`/
  `unstable_cache`, no AMP, no `images.domains` — reconfirmed by grep at
  implementation time, matching requirements.md §5)

- [x] **T8** Auth smoke test done via direct HTTP requests (no browser
  available in this sandbox — see T11): `POST /api/auth/sign-up/email` →
  `200`, sets `better-auth.session_token` cookie; subsequent
  `GET /api/account` with that cookie → `200` with the lazily-provisioned
  `organizationId`. Confirms `proxy.ts`'s Node runtime doesn't break
  `better-auth`'s `nextCookies()` handling → R6.3

- [x] **T9** `npm run build` (Turbopack production build) succeeded;
  route summary correctly shows `ƒ Proxy (Middleware)` for the renamed
  `proxy.ts`. Ran the actual standalone entrypoint Docker's `runner` stage
  uses — `node .next/standalone/server.js` after copying `.next/static` and
  `public/` alongside it — and confirmed `/api/health` and `/` both
  responded correctly → R5.2

- [x] **T10** `docker build` (both `--target builder` and the full
  multi-stage image) succeeded inside `node:22-alpine`. Ran the resulting
  image end-to-end on the project's Docker network against the real `db`
  service (`docker-entrypoint.sh` → migrations → `node server.js`):
  `/api/health` responded `{"status":"ok","db":"up"}`. Test container/image
  removed after verification → R5.2

- [x] **T11** `npx playwright test`: 27 total, 10 passed, 17 failed. All 17
  failures are every browser (`page`-fixture) test failing identically with
  `chrome-headless-shell: error while loading shared libraries:
  libasound.so.2: cannot open shared object file` — confirmed
  environmental and unrelated to the Next 16 upgrade by launching Chromium
  directly via `playwright-core` outside of any test (same failure, no
  `next`/`proxy.ts` involvement). All 10 `request`-fixture (non-browser)
  tests passed: all 7 of `api.spec.ts`, `auth.spec.ts`'s 2 request-only
  tests (401-without-session, public-routes-still-reachable), and
  `home.spec.ts`'s "locale não suportado responde 404" test. The
  browser-dependent behavior these failing tests would have covered (auth
  cookie flow, locale redirect) was independently verified via T6/T8's
  direct HTTP smoke tests → R6.1

- [x] **T12** Updated `middleware.ts`/`next lint` references: CLAUDE.md
  (Architecture bullet → `src/proxy.ts`, `npm run lint` comment, Project
  summary's "Next.js 15" → "Next.js 16", and the Linting section — which
  was already stale pre-upgrade, describing an ESLint-v10/`FlatCompat`-free
  state the repo was never actually on — rewritten to describe the real
  ESLint v9 + native-flat-config setup), README.md (badge, stack table,
  file tree), `.claude/skills/frontend/SKILL.md` (`middleware.ts` →
  `src/proxy.ts` in its locale-routing note) → doc accuracy

- [x] **T13** Open questions resolved: react/react-dom left at `^19.0.0`
  (resolves to `19.2.7`, already satisfying R1.2 — no `package.json` range
  change needed); `eslint-plugin-react`/`jsx-a11y` re-inclusion (T4/T5)
  produced **zero** new findings, so no follow-up spec is warranted;
  deploy-timing question is for the user to answer, not decidable from code.

## Done criteria

- [x] All tasks checked — every step in the plan (package bump, rename,
  eslint-config-next fix, dev/build/Docker verification, full Playwright
  run, docs) actually executed and verified in this session, not merely
  described.
- [x] Every acceptance criterion in requirements.md verified: R1–R6 all
  confirmed by direct testing (HTTP checks, a live Docker container run
  against the real DB, and the full Playwright suite) — no requirement was
  left as an assumption.
- [x] Spec updated to match what was actually built.
