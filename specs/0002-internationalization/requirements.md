# Requirements — Internationalization (i18n)

- **Status:** Draft
- **Spec ID:** 0002
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Adds locale-based routing and message externalization to the Next.js frontend so the
app can be served in more than one language (starting with `pt-BR`, the current
hardcoded default, and `en`), with a visible switcher and sensible default-locale
detection for first-time visitors.

## 2. Goals

- Every user-facing UI string is sourced from a locale message catalog, not hardcoded
  in a component.
- Pages are reachable under a locale-prefixed URL (e.g. `/en`, `/pt-BR`) so a page's
  language is shareable and bookmarkable.
- A first-time visitor with no stored preference lands on a sensible default locale
  inferred from their browser (`Accept-Language`), falling back to `pt-BR`.
- A returning visitor's explicit locale choice is remembered and takes priority over
  browser-language detection.
- A visible control lets a visitor switch locale without leaving the current page.

## 3. Non-goals

- Localizing API response strings under `src/app/api/**` (e.g. `"Payload inválido"`
  in `src/app/api/todos/route.ts`) — those stay as-is; a future spec can cover
  API-level i18n if needed.
- RTL layout support — no RTL locale is in scope for initial rollout.
- Locale-aware currency/number/date formatting beyond whatever the chosen i18n
  library provides by default.
- Persisting a user's locale preference server-side (e.g., on an `organizations` or
  future `users` row) — cookie-based persistence only, since there is no auth yet.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Locale-based routing

> As a visitor, I want the app to route based on locale (e.g. `/en`, `/pt-BR`), so
> that I can access content in my language via a shareable URL.

- **R1.1** WHEN a request has no locale segment in the path, the system SHALL redirect
  to the equivalent path under the resolved locale (see R2).
- **R1.2** WHEN a request includes a supported locale segment, the system SHALL render
  that page using that locale's message catalog.
- **R1.3** IF a request includes an unsupported locale segment, THEN the system SHALL
  respond with a 404.
- **R1.4** the system SHALL NOT apply locale routing to `src/app/api/**` — API routes
  remain reachable at their current, unprefixed paths.

### R2 — Default locale detection

> As a first-time visitor, I want the app's default locale to be chosen from my
> browser's language preference when possible, so I land on a page in my language
> without extra clicks.

- **R2.1** WHEN a visitor with no stored locale preference requests an unprefixed
  path, the system SHALL infer a locale from the `Accept-Language` header, falling
  back to `pt-BR` if none of the supported locales match.
- **R2.2** WHEN a visitor has previously selected a locale, the system SHALL persist
  that choice (cookie) and use it on subsequent visits, taking priority over
  `Accept-Language` detection.

### R3 — Externalized UI strings

> As a developer, I want every user-facing string to come from locale message files,
> so that new locales can be added without touching component code.

- **R3.1** WHEN a component needs a user-facing string, the component SHALL read it
  from the active locale's message catalog rather than hardcoding it inline.
- **R3.2** the system SHALL ship message catalogs for at least `pt-BR` and `en` at
  initial rollout, covering every string currently hardcoded in `src/app/page.tsx` and
  the `metadata` in `src/app/layout.tsx`.

### R4 — Locale switcher

> As a visitor, I want a visible way to switch the site's language, so that I'm not
> stuck with whatever locale was auto-detected.

- **R4.1** WHEN a visitor selects a different locale from the switcher, the system
  SHALL navigate to the equivalent page under the new locale's path.
- **R4.2** WHEN a visitor switches locale via the switcher, the system SHALL persist
  that choice per R2.2.

### R5 — Backend untouched

> As Backend, I want API responses to remain in their current language, so that
> localizing the UI doesn't require touching route handlers as part of this spec.

- **R5.1** the system SHALL NOT require any change to `src/app/api/**` response
  strings, status codes, or shapes as part of this spec.

## 5. Constraints & assumptions

- Routing approach: URL-prefixed locales under the Next.js App Router
  (`src/app/[locale]/...`), which requires moving every existing page (currently just
  `src/app/page.tsx` and `src/app/layout.tsx`) under a `[locale]` dynamic segment.
  `src/app/api/**` is not moved (see R1.4).
- Library: this draft assumes `next-intl` (first-class App Router/Server Component
  support, actively maintained) — Backend/Frontend should confirm this with the lead
  before implementation, since it's a dependency choice, not just a code pattern.
- Default/fallback locale is `pt-BR`, matching the current hardcoded content and
  `<html lang="pt-BR">` in `src/app/layout.tsx`.
- Initial locale set is `pt-BR` and `en`. Additional locales can be added later by
  adding a message catalog file, without further route restructuring.

## 6. Open questions

- [x] Confirm `next-intl` as the i18n library (vs. `next-i18next` or a hand-rolled
  solution) before the plan is approved. — Confirmed: `next-intl` (v4), with
  URL-prefixed routing.
- [x] Should an unsupported locale segment 404 (current assumption, R1.3) or redirect
  to the default locale instead? — Confirmed: 404 (R1.3 as drafted).
- [x] Any locales beyond `pt-BR`/`en` needed for initial rollout? — No; `pt-BR`
  (default) and `en` only.
