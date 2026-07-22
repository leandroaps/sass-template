import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("redireciona / para o locale padrão (pt-BR)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt-BR\/?$/);
  });

  test("renderiza em pt-BR e mostra banco conectado", async ({ page }) => {
    await page.goto("/pt-BR");
    await expect(
      page.getByRole("heading", { name: "SaaS Template" }),
    ).toBeVisible();
    await expect(page.getByTestId("db-status")).toHaveText("conectado");
  });

  test("mostra a seção de stack técnica com os itens esperados", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    const stack = page.getByTestId("tech-stack");
    await expect(stack).toBeVisible();
    await expect(stack.getByText("Next.js 15")).toBeVisible();
    await expect(stack.getByText("TanStack Query")).toBeVisible();
    await expect(stack.getByText("GitHub Actions")).toBeVisible();
  });

  test("renderiza em en e mostra banco conectado", async ({ page }) => {
    await page.goto("/en");
    await expect(
      page.getByRole("heading", { name: "SaaS Template" }),
    ).toBeVisible();
    await expect(page.getByTestId("db-status")).toHaveText("connected");
  });

  test("locale não suportado responde 404", async ({ request }) => {
    const res = await request.get("/xx");
    expect(res.status()).toBe(404);
  });

  test("o seletor de idioma navega para o outro locale mantendo a página", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    await page.getByRole("link", { name: "EN" }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByTestId("db-status")).toHaveText("connected");
  });

  test("botão de recheck mostra toast de sucesso em pt-BR", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Verificar conexão novamente" }).click();
    await expect(
      page.getByText("Conexão com o banco confirmada"),
    ).toBeVisible();
  });

  test("botão de recheck mostra toast de sucesso em en", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Recheck connection" }).click();
    await expect(page.getByText("Database connection confirmed")).toBeVisible();
  });

  test("botão de recheck mostra toast de erro quando a API falha", async ({
    page,
  }) => {
    await page.route("**/api/health", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ status: "degraded", db: "down" }),
      }),
    );

    await page.goto("/pt-BR");
    await page.getByRole("button", { name: "Verificar conexão novamente" }).click();
    await expect(
      page.getByText("Não foi possível conectar ao banco"),
    ).toBeVisible();
  });
});
