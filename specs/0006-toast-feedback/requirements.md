# Requirements — Toast Feedback

- **Status:** Implemented (see Constraints note on R2/R2.2/R2.3 scoping)
- **Spec ID:** 0006
- **Author:**
- **Last updated:** 2026-07-20

## 1. Summary

Adds a shared toast-notification convention so mutations (create/update/delete) give
visible success/error feedback instead of failing silently or only in the console,
mounted once at the app root and driven through message catalogs like the rest of the
UI.

## 2. Goals

- Exactly one toast renderer is mounted at the app root; any component can trigger a
  toast without its own setup.
- Every TanStack Query mutation shows a success toast on `onSuccess` and an error toast
  on `onError` for non-field-validation failures.
- Toast text is sourced from the message catalogs, matching every other user-facing
  string in this repo.
- One shared helper wraps the underlying toast library so call sites don't import it
  directly.

## 3. Non-goals

- An in-app notification center or persistent notification history — ephemeral toasts
  only.
- Toasts for non-mutation events (e.g. a "welcome back" toast on sign-in) unless
  requested later.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Toaster mounted once

> As Frontend, I want a single toast renderer mounted at the app root, so any component can trigger a toast without its own provider setup.

- **R1.1** the system SHALL mount exactly one toast renderer in
  `src/app/[locale]/layout.tsx`, styled to match the existing dark theme tokens
  (`--color-surface`, `--color-border`, `--color-text`, `--color-accent`).

### R2 — Mutation success/error feedback

> As a user performing a create/update/delete action, I want a toast confirming success or explaining failure, so I know the action actually happened.

- **R2.1** WHEN a TanStack Query mutation's `onSuccess` fires, the system SHALL show a
  success toast with a locale-appropriate message.
- **R2.2** WHEN a mutation's `onError` fires for a non-field-validation failure
  (network error, `5xx`), the system SHALL show an error toast — this fulfills spec
  0005's R3.2.
- **R2.3** Field-level validation errors (`400` + `details`, already surfaced inline
  per spec 0005's R2.3) SHALL NOT also trigger a generic error toast.

### R3 — Locale-aware messages

> As a user in either supported locale, I want toast text in my language, so the experience is consistent with the rest of the app.

- **R3.1** toast messages SHALL be sourced from the message catalogs
  (`src/i18n/messages/{locale}.json`), not hardcoded strings.

## 5. Constraints & assumptions

- Library: this draft assumes `sonner` — confirm vs. `react-hot-toast` (or another)
  before the plan is approved.
- A shared helper (e.g. `src/lib/toast.ts` wrapping `toast.success`/`toast.error`) is
  used everywhere instead of importing the toast library directly, matching the
  "one place to swap the implementation" precedent already used for env/db/i18n in
  this repo.
- Depends on spec 0005 (forms/mutations) for a concrete place to trigger toasts from,
  but the `<Toaster/>` mount and the helper itself can land independently before
  0005's forms exist. **Resolved during implementation**: since 0005 hadn't shipped
  yet, `src/components/health-check-button.tsx` (a `useMutation` re-checking
  `/api/health`) stood in as the concrete call site, proving R2.1/R2.2/R3.1. Now that
  spec 0005 has shipped (`src/components/todo-form.tsx`), R2.3 (no toast alongside a
  field-validation error) is genuinely verified too — see
  `e2e/todos-form.spec.ts`'s "sem toast genérico" assertion.

## 6. Open questions

- [x] Confirm `sonner` vs. `react-hot-toast` (or another library). — Confirmed:
  `sonner`.
- [x] Confirm default toast position and duration. — Confirmed: library defaults (no
  override).
