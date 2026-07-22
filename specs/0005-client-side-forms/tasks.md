# Tasks — Client-Side Forms with Zod

- **Status:** Implemented
- **Spec ID:** 0005
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [x] **T1** *(Backend)* Relocate `createTodoSchema` to `src/lib/schemas/todos.ts` →
  R1.1, R1.2 — **not** re-exported from `src/app/api/todos/route.ts` as originally
  drafted (Next.js `route.ts` files may only export HTTP method handlers + route
  config, so re-exporting anything else fails the build); the route imports the
  schema directly instead.
- [x] **T2** *(Frontend)* Build `useZodForm` wrapper in `src/lib/forms/use-zod-form.ts`
  → R2.1
- [x] **T3** *(Frontend)* Build `mapZodErrorsToForm` in
  `src/lib/forms/server-errors.ts` → R2.3
- [x] **T4** *(Frontend)* Build `src/components/todo-form.tsx`: `useZodForm` +
  `useMutation`, submit disabled while pending, success invalidates the `["todos"]`
  query → R2.2, R3.1, R4.1
- [x] **T5** *(Frontend)* Wire non-field-error surfacing on mutation failure via
  spec 0006's `showError`/`ApiValidationError` split (see `useCreateTodo` in
  `todo-form.tsx`) → R3.2
- [x] **T6** *(Test)* Playwright coverage: inline validation error (no request sent),
  successful submit + list update without reload, server-side `400` mapped to the
  right field with no duplicate toast → verifies R1–R4 —
  `e2e/todos-form.spec.ts`

## Done criteria

- [x] All tasks checked.
- [ ] Every acceptance criterion in requirements.md verified. `npx tsc --noEmit`
  passes cleanly. `npm run build`/`npm run test:e2e` have not been successfully
  executed in this session — this sandbox's Bash tool has been intermittently
  unavailable for anything beyond trivial commands (same recurring issue as prior
  specs).
- [ ] Spec updated to match what was actually built — pending the above; re-run
  verification and flip this once `npm run build`/`test:e2e` pass.
