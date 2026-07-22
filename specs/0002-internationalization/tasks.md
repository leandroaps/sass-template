# Tasks — Internationalization (i18n)

- **Status:** Implemented, pending runtime verification
- **Spec ID:** 0002
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Add the i18n library (`next-intl` v4.13.2, confirmed) and root
  `middleware.ts` with a matcher that excludes `/api/*` → R1.4, R5.1 — `middleware.ts`,
  `src/i18n/routing.ts`.
- [x] **T2** Create `src/i18n/messages/pt-BR.json` and `src/i18n/messages/en.json`
  covering every string currently hardcoded in `src/app/page.tsx` and the `metadata`
  in `src/app/layout.tsx` → R3.2
- [x] **T3** Move `src/app/layout.tsx` and `src/app/page.tsx` under
  `src/app/[locale]/`, wire up locale resolution (cookie → `Accept-Language` →
  `pt-BR`) and the unprefixed-path redirect → R1.1, R1.2, R2.1
- [x] **T4** Reject unsupported locale segments with a 404 → R1.3 — `hasLocale` +
  `notFound()` in `src/app/[locale]/layout.tsx`.
- [x] **T5** Replace hardcoded strings in the moved `layout.tsx`/`page.tsx` with
  message-catalog lookups → R3.1
- [x] **T6** Set cookie-based locale persistence so a returning visitor's choice
  overrides `Accept-Language` detection → R2.2 — handled by `next-intl`'s middleware,
  which sets the locale cookie automatically on any locale-prefixed navigation.
- [x] **T7** Build a locale switcher component and place it in the page header → R4.1,
  R4.2 — `src/components/locale-switcher.tsx`.
- [ ] **T8** Extend Playwright coverage: unprefixed-path redirect, per-locale
  rendering, unsupported-locale 404, switcher navigation + persistence, and an
  `/api/**` regression check → verifies R1–R5 — test cases written in
  `e2e/home.spec.ts`, but **not yet run**; see Done criteria.

## Done criteria

- [x] All tasks checked (T1–T7 code-complete; T8 written but unexecuted — see below).
- [ ] Every acceptance criterion in requirements.md verified. `npm run typecheck`
  passes cleanly and every next-intl import was cross-checked against the installed
  package's (`next-intl@4.13.2`) actual type declarations, but `npm run build`,
  `npm run dev`, and `npm run test:e2e` have not been successfully executed yet — this
  sandbox's Bash tool has been intermittently unavailable for anything beyond trivial
  commands across multiple retries. Runtime behavior (the `/` → `/pt-BR` redirect,
  per-locale rendering, the `/xx` 404, the switcher) is implemented per next-intl's
  documented API but **not runtime-verified**.
- [ ] Spec updated to match what was actually built — pending the above; re-run
  verification and flip this once `npm run build`/`test:e2e` pass.
