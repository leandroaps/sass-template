# Design — Toast Feedback

- **Status:** Draft
- **Spec ID:** 0006
- **Implements:** requirements.md

## 1. Overview

`sonner`'s `<Toaster/>` is mounted once in `src/app/[locale]/layout.tsx`, alongside the
existing `NextIntlClientProvider`/`QueryProvider` stack, themed via its style props
using the existing CSS custom properties from `globals.css`. A thin `src/lib/toast.ts`
wraps `toast.success`/`toast.error` so mutation hooks call `showSuccess(message)` /
`showError(message)` instead of importing `sonner` directly.

## 2. Architecture

```
src/app/[locale]/layout.tsx
  └─ <NextIntlClientProvider>
       └─ <QueryProvider>
            └─ <Toaster theme="dark" style={{ ...token-based overrides }} />
            └─ {children}

src/lib/toast.ts
  ├─ showSuccess(message: string)  → toast.success(message, { ...shared options })
  └─ showError(message: string)    → toast.error(message, { ...shared options })
```

A mutation hook (from spec 0005 or any future resource) calls these from
`onSuccess`/`onError`:

```
useMutation({
  ...,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    showSuccess(t("todoCreated"));            // R2.1, R3.1
  },
  onError: (err) => {
    if (isFieldValidationError(err)) {
      mapZodErrorsToForm(err.details, setError);   // no toast — R2.3
    } else {
      showError(t("genericError"));           // R2.2, R3.1
    }
  },
})
```

## 3. Data model

None.

## 4. API

| Method | Path | Auth / permission | Description |
| ------ | ---- | ------------------ | ----------- |
| — | — | — | No API routes are added or changed by this spec. |

## 5. Migrations & data backfill

N/A.

## 6. Security & multi-tenancy

None — purely a UI feedback concern.

## 7. Testing strategy

Playwright:

- After a successful mutation (e.g. the todo form from spec 0005), a success toast
  with the expected text appears (R2.1).
- After a forced failure (network/`5xx`), an error toast appears (R2.2).
- After a `400` field-validation failure, **no** toast appears — only the inline field
  error from spec 0005 (R2.3).
- Toast text matches the active locale (assert under both `/pt-BR` and `/en`) (R3.1).

## 8. Risks & alternatives considered

- **Alternative considered:** `react-hot-toast` — very similar API and footprint.
  `sonner` is assumed in this draft for its more modern default styling and
  built-in promise-based toast helper, but it's a close call — left as an open
  question rather than decided unilaterally.
- **Risk:** a mutation hook forgetting to call `showError` on failure would silently
  swallow errors again. *Mitigation:* document the `showSuccess`/`showError` calls as
  a required part of the mutation pattern in the `frontend` skill once implemented,
  next to the existing TanStack Query section.
