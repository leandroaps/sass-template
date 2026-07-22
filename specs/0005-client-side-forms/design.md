# Design — Client-Side Forms with Zod

- **Status:** Draft
- **Spec ID:** 0005
- **Implements:** requirements.md

## 1. Overview

`createTodoSchema` moves out of `src/app/api/todos/route.ts` into
`src/lib/schemas/todos.ts`, re-exported from the route file so the API's public
surface doesn't change. A thin `useZodForm` hook wraps `react-hook-form`'s `useForm`
with `zodResolver(schema)` pre-wired. A `mapZodErrorsToForm` helper takes the server's
`parsed.error.flatten()` shape and calls react-hook-form's `setError` per field. A new
`TodoForm` Client Component composes all three plus a TanStack Query `useMutation`, as
the reference implementation.

## 2. Architecture

```
src/lib/schemas/todos.ts        # createTodoSchema (moved from route.ts, re-exported there)
src/lib/forms/use-zod-form.ts   # useZodForm(schema, options) → useForm({ resolver: zodResolver(schema), ...options })
src/lib/forms/server-errors.ts  # mapZodErrorsToForm(details, setError)
src/components/todo-form.tsx    # "use client" — reference form using the above
```

Submit flow:

```
TodoForm
  │  react-hook-form validates locally against createTodoSchema (R2.1)
  ▼
useMutation({
  mutationFn: POST /api/todos,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] })  (R3.1)
  onError: (err) => {
    if (err is 400 with `details`) mapZodErrorsToForm(details, setError)   (R2.3)
    else surface a non-field error (→ spec 0006's toast)                  (R3.2)
  }
})
```

Submit button is disabled while `mutation.isPending` (R2.2).

## 3. Data model

None — this spec is purely client-side plumbing plus relocating an existing schema.

## 4. API

| Method | Path | Auth / permission | Description |
| ------ | ---- | ------------------ | ----------- |
| — | — | — | No API routes are added or changed; `POST /api/todos`'s behavior and response shape are unchanged, only its schema's file location moves. |

## 5. Migrations & data backfill

N/A.

## 6. Security & multi-tenancy

No change. Client-side validation with `createTodoSchema` is a UX improvement only —
the server route still independently validates every payload with the same schema, so
security doesn't rely on the client behaving correctly.

## 7. Testing strategy

Playwright, extending `e2e/`:

- Submitting the todo form with an empty title shows the inline error and sends no
  request (R2.1).
- Submitting a valid title shows the submit button disabled during the request, then
  the todo appears in the list without a manual page reload (R2.2, R3.1).
- Forcing a server-side `400` (e.g. via a title that passes client validation but
  fails a server-only rule, if any exists, or by temporarily bypassing client
  validation in the test) results in the field-level error appearing (R2.3).

## 8. Risks & alternatives considered

- **Alternative considered:** Conform, which leans into progressive enhancement via
  Server Actions and also integrates with Zod. Not chosen for this draft because
  `react-hook-form` pairs more directly with the TanStack Query client-mutation model
  already documented in the `frontend` skill — flagged as an open question rather than
  decided unilaterally.
- **Risk:** relocating `createTodoSchema` touches a Backend-owned file
  (`src/app/api/todos/route.ts`). Per the agent-team workflow, that specific move
  (T1 in tasks.md) should be done/approved by Backend even though the rest of this
  spec is Frontend work.
