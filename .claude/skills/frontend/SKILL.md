---
name: frontend
description: >
  Build Next.js App Router pages and components for this SaaS template, consuming
  Backend's shared Drizzle-inferred types and following the existing styling
  convention. Use when the user or the Frontend teammate needs to add or change
  anything under src/app/** (excluding src/app/api/**).
tools: Read, Write, Edit, Glob, Grep
---

# Frontend: pages, components, styling

Styling is Tailwind CSS v4 (utility classes) plus Server Components. Don't introduce a
different framework, a CSS-in-JS library, or a components library without checking
with the lead first.

## Server Components by default

`src/app/[locale]/page.tsx` is the reference pattern: an `async` Server Component that
queries data directly and renders it — no client-side fetch, no loading state needed
for the initial render.

```typescript
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { projects } from "@/db/schema";

export const dynamic = "force-dynamic"; // opt out of static rendering when data is live

async function getProjects() {
  return db.select().from(projects);
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, items] = await Promise.all([
    getTranslations("Projects"),
    getProjects(),
  ]);

  return (
    <main>
      <h1>{t("title")}</h1>
      <div className="card">
        {items.map((p) => (
          <p key={p.id}>{p.name}</p>
        ))}
      </div>
    </main>
  );
}
```

- Import `db` and query directly for a page's initial render data — this repo does not
  route the homepage's own reads through its API routes.
- Every new page/layout lives under `src/app/[locale]/`, not directly under
  `src/app/`. It receives `params: Promise<{ locale: string }>` (Next 15 async
  params) and must call `setRequestLocale(locale)` before rendering — see
  Internationalization below.
- Only add `"use client"` when you need interactivity (state, event handlers, effects,
  or a hook like TanStack Query's) — `src/components/locale-switcher.tsx` and
  `src/components/query-provider.tsx` are the existing examples; don't make a
  component client-side by default.
- For **client-side server-state** — interactive lists (search, pagination, sorting),
  mutations with optimistic updates, polling — use TanStack Query (`useQuery`/
  `useMutation` from `@tanstack/react-query`) against the relevant `src/app/api/**`
  route, instead of raw `fetch` + `useState`/`useEffect` or reimplementing the Drizzle
  query on the client. See Client-side data fetching below.
- For a one-off, non-cached mutation (e.g. a single form submit with no need to
  re-render a list afterward), a plain `fetch` call is still fine — reach for
  TanStack Query when there's a cache to invalidate or a list to keep in sync.

## Shared types

Import types from `src/db/schema.ts` (e.g. `Todo`, `Project`) for props and data
shapes. Never redeclare or fork a local version of a type Backend owns — if a shape
you need doesn't exist yet, that's a Backend change to request, not something to
invent locally.

## Styling convention — Tailwind CSS v4

There is no `tailwind.config.js` — configuration is CSS-first, in
`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0e1116;
  --color-surface: #171c24;
  --color-text: #e6e9ef;
  --color-muted: #8b94a3;
  --color-accent: #4cc38a;
  --color-border: #2a313d;
}
```

Any `--color-*` entry in `@theme` automatically becomes matching utilities —
`bg-surface`, `text-muted`, `border-border`, `text-accent`, etc. Use those utilities
directly on elements (see `src/app/[locale]/page.tsx`) instead of writing new CSS classes or
inline styles. If a design needs a color/spacing/radius that isn't a token yet, add it
to the `@theme` block rather than hardcoding a one-off value in a class list.

Tailwind's Preflight base reset is active (imported automatically by
`@import "tailwindcss"`), which strips default browser margin/font-size from
headings, paragraphs, and lists. Every heading and block of text needs its spacing and
type scale set explicitly with utilities (`text-2xl font-semibold`, `mt-2`, etc.) — it
won't come from the browser default anymore.

## Internationalization (next-intl)

Every user-facing string comes from a message catalog, never a hardcoded literal in a
component. Catalogs live in `src/i18n/messages/{locale}.json` (`pt-BR` and `en` today
— `pt-BR` is the default locale); routing config is `src/i18n/routing.ts`; locale-aware
`Link`/`usePathname`/`useRouter` come from `src/i18n/navigation.ts`, not `next/link` or
`next/navigation`.

- Fetch strings in a Server Component with `const t = await getTranslations("Namespace")`
  (from `next-intl/server`), then `t("key")`. Add a matching key to **both**
  `pt-BR.json` and `en.json` — never just one.
- `src/app/[locale]/layout.tsx` wraps `children` in `NextIntlClientProvider`
  (messages from `getMessages()`). This is required, not optional — any Client
  Component using `next-intl`'s hooks *or* the `Link`/`usePathname`/`useRouter` from
  `src/i18n/navigation.ts` throws `"No intl context found"` without it, since those
  navigation helpers rely on the client intl context internally even if the component
  never calls `useTranslations`/`useLocale` itself.
- Still prefer passing the active locale down as a prop (e.g.
  `<LocaleSwitcher activeLocale={locale} />` in `src/app/[locale]/page.tsx`) over
  calling `useLocale()` in a new Client Component — one less hook depending on the
  provider being present correctly, and the Server Component already has `locale` from
  `params`.
- `src/app/api/**` is explicitly excluded from locale routing (see `middleware.ts`'s
  matcher) and its response strings are out of scope for i18n — don't route API
  strings through the message catalogs.

## Client-side data fetching (TanStack Query)

`src/components/query-provider.tsx` mounts a `QueryClient` (via `useState`, so it
survives re-renders) and is wrapped around the whole app in
`src/app/[locale]/layout.tsx`, inside `NextIntlClientProvider`. Devtools only render
when `NODE_ENV !== "production"`. This is for **client-side** server-state — it does
not replace querying `db` directly in a Server Component for a page's initial render
(see Server Components above); reach for it once a list needs to search, paginate,
sort, or mutate without a full page reload.

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";

type Todo = { id: string; title: string; done: boolean };

function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async (): Promise<Todo[]> => {
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("Failed to load todos");
      const { todos } = await res.json();
      return todos;
    },
  });
}

export function TodoList() {
  const { data, isLoading, error } = useTodos();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Something went wrong.</p>;

  return (
    <ul>
      {data?.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

- `queryKey` should match the resource path (`["todos"]`, `["clients", id]`, …) so
  invalidation after a mutation is predictable: `queryClient.invalidateQueries({
  queryKey: ["todos"] })` inside a `useMutation`'s `onSuccess`.
- Fetch against this repo's own `src/app/api/**` routes, parsing the same response
  shapes Backend defined — don't bypass the API layer with a direct Drizzle import in
  a Client Component (that only works in Server Components/route handlers).
- Colocate a resource's query/mutation hooks near the component that uses them unless
  more than one page needs the same hook, in which case lift it to a shared file (e.g.
  `src/lib/queries/todos.ts`) rather than duplicating the `queryFn`.
- Every `useMutation` should call `showSuccess`/`showError` (see Toast feedback below)
  from `onSuccess`/`onError` — don't let a mutation fail silently.

## Toast feedback (sonner)

`src/lib/toast.ts` wraps `sonner`: call `showSuccess(message)` / `showError(message)`
from there — don't import `sonner` directly in a component, so the library stays
swappable from one place. Its `<Toaster/>` is mounted once in
`src/app/[locale]/layout.tsx`, themed with the same `--color-surface`/
`--color-border`/`--color-text` tokens as everything else; don't mount a second one.

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { showError, showSuccess } from "@/lib/toast";

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const t = useTranslations("Toast");

  return useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      showSuccess(t("todoCreated"));
    },
    onError: () => showError(t("genericError")),
  });
}
```

- Toast text always comes from the message catalogs (a `Toast` namespace, or a
  per-feature one) — never a hardcoded string, same rule as every other user-facing
  string in this repo.
- Don't also show a generic error toast for a `400` field-validation response that's
  already surfaced inline on a form (map those to fields instead) — a toast on top of
  an inline error is just noise.
- `src/components/health-check-button.tsx` is the reference call site: a small
  `useMutation` re-checking `/api/health` and toasting the result.

## Client-side forms (react-hook-form + Zod)

`src/components/todo-form.tsx` is the full reference implementation — a form paired
with the *same* Zod schema its API route validates with, so client and server
validation can never drift apart.

- The resource's create/update schema lives in `src/lib/schemas/<resource>.ts` (e.g.
  `createTodoSchema` in `src/lib/schemas/todos.ts`), imported by both
  `src/app/api/<resource>/route.ts` and the form component. **Don't re-export it from
  the route file** — a Next.js `route.ts` may only export HTTP method handlers
  (`GET`/`POST`/…) and a small set of route-config fields; anything else fails the
  build.
- `src/lib/forms/use-zod-form.ts`'s `useZodForm(schema, options)` wraps
  `useForm` with `zodResolver(schema)` pre-wired — use it instead of calling
  `useForm` directly whenever a form validates against a Zod schema.
- `src/lib/forms/server-errors.ts`'s `mapZodErrorsToForm(details, setError)` maps a
  `400` response's `details.fieldErrors` (the existing `parsed.error.flatten()` shape)
  onto the form. Call it from the **mutation's per-call `onError`** (the one passed to
  `mutate(data, { onError })`), not the mutation hook's own `onError` — only the
  call site has `setError` from the specific form instance.
- Split error handling this way to avoid a double error signal: the mutation hook's
  own `onError` only calls `showError` when the error is **not** a field-validation
  error (see `ApiValidationError` in `todo-form.tsx`); the per-call `onError` only maps
  fields. A validation failure gets exactly one thing — the inline field message —
  never also a generic toast.
- `@hookform/resolvers` is pinned to `^4`, not the latest `^5` — v5's Zod v3/v4 dual
  typing doesn't structurally match this project's installed Zod 3.25.x and fails to
  typecheck. If you ever bump it, re-verify `npx tsc --noEmit` first.

## Authentication (Better Auth)

`src/lib/auth-client.ts` exports `authClient` (and destructured `signIn`, `signUp`,
`signOut`, `useSession`) from `better-auth/react`. `src/app/[locale]/sign-up/page.tsx`
and `sign-in/page.tsx` are the reference forms — same `useZodForm` +
`useMutation` + toast pattern as Client-side forms above, just calling
`authClient.signUp.email(...)`/`authClient.signIn.email(...)` as the `mutationFn`.
Those calls resolve to `{ data, error }` (never throw for expected failures like bad
credentials) — check `error` before treating the call as successful.

- `authClient.useSession()` is the way to read session state in a Client Component —
  `src/components/auth-nav.tsx` is the reference (shows sign-in/up links when signed
  out, an account link when signed in; returns `null` while `isPending`).
- A protected **page** calls `requireSessionOrRedirect(await headers(), locale)` from
  `src/lib/auth.ts` (`src/app/[locale]/account/page.tsx` is the reference) — this
  redirects to `/sign-in` instead of rendering when there's no session. A protected
  **API route** calls `getSession(request.headers)` directly and returns its own `401`
  (see the `backend` skill's Step 5) — pages redirect, routes 401, don't mix the two.
- Don't add a second place that mounts Better Auth's React client or duplicates
  `useSession` logic — always go through `src/lib/auth-client.ts`.

## `data-testid` for the Test teammate

Add a `data-testid` on any element Test needs to assert against — see
`data-testid="db-status"` on the homepage, asserted in `e2e/home.spec.ts`. Coordinate
the testid name with what the spec's acceptance criteria describe, so Test isn't
guessing at selectors.

## Boundaries

- Never edit `src/app/api/**` or `src/db/**` — that's Backend's.
- If the API's actual response doesn't match what the spec describes, stop and report
  it to the lead. Don't adapt the UI to a guessed or undocumented shape.
