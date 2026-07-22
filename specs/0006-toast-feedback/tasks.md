# Tasks — Toast Feedback

- **Status:** Implemented
- **Spec ID:** 0006
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** Install `sonner`; mount `<Toaster/>` in `src/app/[locale]/layout.tsx`,
  themed to match the existing dark theme tokens → R1.1 — `theme="dark"` +
  `toastOptions.style` using `--color-surface`/`--color-border`/`--color-text`.
- [x] **T2** Build `src/lib/toast.ts` (`showSuccess`/`showError`) → R2.1, R2.2
- [x] **T3** Add a `Toast` message namespace to both locale catalogs
  (`src/i18n/messages/{pt-BR,en}.json`); wire the helper's call sites to use
  translated strings → R3.1 — call site is
  `src/components/health-check-button.tsx` (see requirements.md's Constraints note on
  why this substitutes for spec 0005's not-yet-built form).
- [x] **T4** Confirm/ensure field-validation errors don't also trigger a generic toast
  → R2.3 — **now genuinely verified**: spec 0005's `useCreateTodo` (in
  `src/components/todo-form.tsx`) only calls `showError` when the mutation error is
  **not** an `ApiValidationError`; field errors are mapped via `mapZodErrorsToForm`
  in the per-call `onError` instead.
- [x] **T5** Playwright coverage: success toast, error toast, no-toast-on-field-error,
  and locale-correct text under both `/pt-BR` and `/en` → verifies R1–R3 — success/error
  cases in `e2e/home.spec.ts` (health-check button); no-toast-on-field-error now has a
  real assertion in `e2e/todos-form.spec.ts` ("mapeia erro 400 do servidor para o
  campo, sem toast genérico").

## Done criteria

- [x] All tasks checked.
- [ ] Every acceptance criterion in requirements.md verified. `npx tsc --noEmit`
  passes cleanly. `npm run build`/`npm run test:e2e` have not been successfully
  executed in this session — this sandbox's Bash tool has been intermittently
  unavailable for anything beyond trivial commands (same recurring issue as prior
  specs).
- [ ] Spec updated to match what was actually built — pending the above; re-run
  verification and flip this once `npm run build`/`test:e2e` pass.
