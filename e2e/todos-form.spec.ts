import { test, expect } from "@playwright/test";

test.describe("Todo form", () => {
  test("mostra erro inline para título vazio sem enviar requisição", async ({
    page,
  }) => {
    await page.goto("/pt-BR");

    let requestMade = false;
    await page.route("**/api/todos", async (route) => {
      if (route.request().method() === "POST") requestMade = true;
      await route.continue();
    });

    await page.getByTestId("todo-submit").click();

    await expect(page.getByTestId("todo-title-error")).toBeVisible();
    expect(requestMade).toBe(false);
  });

  test("cria uma tarefa e atualiza a lista sem reload manual", async ({
    page,
  }) => {
    await page.goto("/pt-BR");
    const title = `e2e-${Date.now()}`;

    await page.getByTestId("todo-title-input").fill(title);
    await page.getByTestId("todo-submit").click();

    await expect(page.getByTestId("todos").getByText(title)).toBeVisible();
  });

  test("mapeia erro 400 do servidor para o campo, sem toast genérico", async ({
    page,
  }) => {
    await page.goto("/pt-BR");

    await page.route("**/api/todos", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Payload inválido",
            details: { fieldErrors: { title: ["Título já utilizado"] } },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByTestId("todo-title-input").fill("qualquer coisa");
    await page.getByTestId("todo-submit").click();

    await expect(page.getByTestId("todo-title-error")).toHaveText(
      "Título já utilizado",
    );
    await expect(page.getByText("Algo deu errado, tente novamente")).toHaveCount(
      0,
    );
  });
});
