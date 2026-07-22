# Design — Internationalization (i18n)

- **Status:** Draft
- **Spec ID:** 0002
- **Implements:** requirements.md

## 1. Overview

Every page moves under a `src/app/[locale]/` dynamic segment. A root `middleware.ts`
resolves the active locale (stored cookie → `Accept-Language` → `pt-BR` default) and
redirects unprefixed requests to the resolved locale's path. Pages read strings from
per-locale JSON message catalogs instead of hardcoding them. `src/app/api/**` is left
exactly where it is — the middleware explicitly excludes it from locale rewriting, so
none of the existing API contract changes.

## 2. Architecture

```
request →
  middleware.ts (next-intl middleware)
    │
    ├─ path starts with /api → pass through untouched (R1.4, R5.1)
    │
    └─ page path
         │
         ├─ has supported locale prefix (/en, /pt-BR) → render src/app/[locale]/...
         ├─ unsupported locale prefix → 404 (R1.3)
         └─ no locale prefix → resolve locale (cookie → Accept-Language → pt-BR)
                                 → redirect to /{locale}/<path> (R1.1, R2.1)
```

New/moved files:

| File | Change |
| --- | --- |
| `middleware.ts` (new, repo root) | `next-intl`'s middleware, `matcher` excludes `/api/*`, `/_next/*`, static assets |
| `src/i18n/messages/pt-BR.json` (new) | Portuguese message catalog (current default strings) |
| `src/i18n/messages/en.json` (new) | English message catalog |
| `src/i18n/request.ts` (new) | `next-intl`'s server config — resolves the active locale's messages per request |
| `src/app/layout.tsx` → `src/app/[locale]/layout.tsx` (moved) | sets `<html lang={locale}>` dynamically instead of the hardcoded `"pt-BR"`; wraps `children` in `NextIntlClientProvider` (messages from `getMessages()`) — required for any Client Component using next-intl's hooks or `src/i18n/navigation.ts`'s `Link`/`usePathname`/`useRouter`, not just for `useTranslations` |
| `src/app/page.tsx` → `src/app/[locale]/page.tsx` (moved) | reads its strings via `getTranslations` instead of the hardcoded Portuguese literals |
| `src/app/globals.css` | unchanged — styling isn't locale-specific |
| `src/app/api/**` | unchanged (R1.4, R5.1) |
| A locale switcher component (new, e.g. `src/components/locale-switcher.tsx`) | small Client Component in the header, one link per supported locale to the same page under a different prefix |

## 3. Data model

No database changes. Locale preference is stored client-side (cookie set by the
`next-intl` middleware / switcher), not persisted to `organizations` or any other
table — see Non-goals in requirements.md.

## 4. API

| Method | Path | Auth / permission | Description |
| ------ | ---- | ------------------ | ----------- |
| — | — | — | No API routes are added, removed, or changed by this spec (R1.4, R5.1). |

## 5. Migrations & data backfill

N/A — no schema change.

## 6. Security & multi-tenancy

No change. Locale is a presentation concern resolved per-request from a cookie/header;
it carries no tenant or auth implication and must not be used to bypass or alter any
`organization_id` scoping.

## 7. Testing strategy

Playwright, extending `e2e/`:

- Visiting `/` redirects to a locale-prefixed path (`R1.1`, `R2.1`) — assert via
  `page.goto("/")` then checking the resolved URL.
- Visiting `/en` and `/pt-BR` each render the homepage heading and status text in the
  expected language (`R1.2`, `R3.1`, `R3.2`).
- Visiting an unsupported locale segment (e.g. `/xx`) returns a 404 (`R1.3`).
- Using the locale switcher navigates to the equivalent path under the other locale
  and the choice persists across a subsequent visit (`R4.1`, `R4.2`, `R2.2`).
- `/api/health` and `/api/todos` remain reachable unprefixed and unchanged, as a
  regression guard that they weren't accidentally nested under `[locale]` (`R1.4`,
  `R5.1`) — reuse the existing assertions in `e2e/api.spec.ts`.

## 8. Risks & alternatives considered

- **Risk:** moving the only two existing route files under `[locale]` is a structural
  change that touches every current page at once. *Mitigation:* the existing
  `e2e/home.spec.ts` and `e2e/api.spec.ts` assertions must keep passing (updated only
  for the new locale-prefixed URL), giving a regression net before/after the move.
- **Alternative considered:** cookie-only locale switching with no URL prefix (no
  route restructuring needed). Rejected in this draft — URL-based locale is more
  standard for shareability/SEO and is what `next-intl` is built around — but flagged
  as an open question in requirements.md since it's a real trade-off worth the lead's
  and user's input.
- **Alternative considered:** `next-i18next`. Rejected in favor of `next-intl`, which
  has first-class App Router and React Server Component support; `next-i18next` was
  built for the Pages Router.
