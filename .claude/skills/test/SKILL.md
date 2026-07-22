---
name: test
description: >
  Write Playwright end-to-end tests (UI and API) for this SaaS template, derived from
  a spec's acceptance criteria rather than from the implementation. Use when the user
  or the Test teammate needs to add or update anything under e2e/.
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Test: Playwright E2E (UI + API)

## Important gap in this repo

**Only Playwright is configured.** There is no unit test runner (no Jest, no Vitest)
in `package.json`. If a spec's acceptance criteria genuinely need unit-level coverage
of isolated logic, don't silently add a test runner — flag it to the lead first, since
choosing one is a project-wide decision, not a per-test one. Everything below assumes
E2E coverage via Playwright, which is what this repo actually supports today.

## Structure

One spec file per concern under `e2e/`, following the two existing files:

- `e2e/api.spec.ts` — hits routes directly via the `request` fixture.
- `e2e/home.spec.ts` — renders pages via the `page` fixture.

## API test pattern

```typescript
import { test, expect } from "@playwright/test";

test.describe("Projects API", () => {
  test("cria e lista projects", async ({ request }) => {
    const name = `e2e-${Date.now()}`;

    const create = await request.post("/api/projects", { data: { name } });
    expect(create.status()).toBe(201);

    const list = await request.get("/api/projects");
    expect(list.status()).toBe(200);
    const { projects } = await list.json();
    expect(projects.some((p: { name: string }) => p.name === name)).toBe(true);
  });

  test("rejeita payload inválido", async ({ request }) => {
    const res = await request.post("/api/projects", { data: { name: "" } });
    expect(res.status()).toBe(400);
  });
});
```

## UI test pattern

```typescript
import { test, expect } from "@playwright/test";

test.describe("Projects page", () => {
  test("renderiza a lista", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });
});
```

- Prefer `getByRole` and `getByTestId` (see `data-testid="db-status"` in
  `e2e/home.spec.ts`) over CSS selectors — ask Frontend to add a `data-testid` if the
  page doesn't expose one you need.

## Deriving cases from the spec, not the code

Write each test from the requirement's acceptance criteria in the feature's
`requirements.md` (the `R#.#` items), not from reading Backend's or Frontend's
implementation — a test written by reading the code will pass regardless of whether
the code is actually correct. Map non-happy-path criteria (`IF <bad condition> THEN
...`) to explicit failure-case tests, same as the "rejeita payload inválido" example
above.

## Running tests

```bash
npm run test:e2e                              # full suite, auto-starts the app
npm run test:e2e:ui                           # interactive mode
npx playwright test e2e/api.spec.ts           # one file
npx playwright test -g "rejeita payload"      # by test name
```

- `playwright.config.ts`'s `webServer` runs `npm run dev` locally (reuses an already
  running server) and `npm run start` (production build) in CI — don't assume dev-only
  behavior in a test.
- Readiness is gated on `/api/health` responding — if the DB isn't up
  (`docker compose up -d db`, then `npm run db:migrate`), tests will hang waiting for
  the server rather than failing fast with a clear error.

## Reporting failures

When a test fails, report it to the responsible teammate (Backend for API/data
issues, Frontend for rendering issues) with concrete reproduction steps — the failing
command, the input, and the actual vs. expected result. Don't fix their code yourself.
