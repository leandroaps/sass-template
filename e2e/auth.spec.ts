import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test.describe("Auth", () => {
  test("cria conta, provisiona organização e acessa /account", async ({
    page,
  }) => {
    const email = uniqueEmail();

    await page.goto("/pt-BR/sign-up");
    await page.getByLabel("Nome").fill("E2E User");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/pt-BR\/account\/?$/);
    await expect(page.getByText(email)).toBeVisible();
    // Organization was provisioned lazily — some non-empty id is shown.
    await expect(page.getByText("Organização:")).toBeVisible();
  });

  test("rejeita e-mail duplicado no cadastro", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/pt-BR/sign-up");
    await page.getByLabel("Nome").fill("E2E User");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/account\/?$/);

    await page.goto("/pt-BR/sign-up");
    await page.getByLabel("Nome").fill("E2E User 2");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Rejected: stays on the sign-up form (doesn't navigate to /account)
    // and shows an inline error rather than silently succeeding.
    await expect(page).toHaveURL(/\/pt-BR\/sign-up\/?$/);
    await expect(page.locator("form p.text-accent")).toHaveCount(1);
  });

  test("rejeita senha curta no cadastro", async ({ page }) => {
    await page.goto("/pt-BR/sign-up");
    await page.getByLabel("Nome").fill("E2E User");
    await page.getByLabel("E-mail").fill(uniqueEmail());
    await page.getByLabel("Senha").fill("short");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/pt-BR\/sign-up\/?$/);
  });

  test("entra com credenciais válidas e sai", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/pt-BR/sign-up");
    await page.getByLabel("Nome").fill("E2E User");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/account\/?$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/?$/);

    await page.goto("/pt-BR/sign-in");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/account\/?$/);
  });

  test("rejeita credenciais inválidas no login", async ({ page }) => {
    await page.goto("/pt-BR/sign-in");
    await page.getByLabel("E-mail").fill(uniqueEmail());
    await page.getByLabel("Senha").fill("wrongpassword");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("E-mail ou senha inválidos")).toBeVisible();
    await expect(page).toHaveURL(/\/pt-BR\/sign-in\/?$/);
  });

  test("/account redireciona para /sign-in quando deslogado", async ({
    page,
  }) => {
    await page.goto("/pt-BR/account");
    await expect(page).toHaveURL(/\/pt-BR\/sign-in\/?$/);
  });

  test("/api/account responde 401 sem sessão", async ({ request }) => {
    const res = await request.get("/api/account");
    expect(res.status()).toBe(401);
  });

  test("rotas públicas continuam acessíveis sem sessão", async ({
    request,
  }) => {
    expect((await request.get("/api/health")).status()).toBe(200);
    expect((await request.get("/api/todos")).status()).toBe(200);
    expect((await request.get("/pt-BR")).status()).toBe(200);
  });
});
