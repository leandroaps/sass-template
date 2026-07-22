import { test, expect } from "@playwright/test";

test.describe("API", () => {
  test("healthcheck responde ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "up" });
  });

  test("cria e lista todos", async ({ request }) => {
    const title = `e2e-${Date.now()}`;

    const create = await request.post("/api/todos", { data: { title } });
    expect(create.status()).toBe(201);

    const list = await request.get("/api/todos");
    expect(list.status()).toBe(200);
    const { data } = await list.json();
    expect(
      data.some((t: { title: string }) => t.title === title),
    ).toBe(true);
  });

  test("rejeita payload inválido", async ({ request }) => {
    const res = await request.post("/api/todos", { data: { title: "" } });
    expect(res.status()).toBe(400);
  });

  test("lista todos retorna envelope de paginação", async ({ request }) => {
    const res = await request.get("/api/todos?page=0&pageSize=1");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ page: 0, pageSize: 1 });
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(typeof body.total).toBe("number");
  });

  test("rejeita coluna de ordenação desconhecida", async ({ request }) => {
    const res = await request.get("/api/todos?sort=unknownColumn");
    expect(res.status()).toBe(400);
  });

  test("busca, atualiza e remove um todo por id", async ({ request }) => {
    const title = `e2e-crud-${Date.now()}`;
    const create = await request.post("/api/todos", { data: { title } });
    expect(create.status()).toBe(201);
    const { data: created } = await create.json();

    const get = await request.get(`/api/todos/${created.id}`);
    expect(get.status()).toBe(200);
    const { data: fetched } = await get.json();
    expect(fetched.title).toBe(title);

    const update = await request.patch(`/api/todos/${created.id}`, {
      data: { done: true },
    });
    expect(update.status()).toBe(200);
    const { data: updated } = await update.json();
    expect(updated.done).toBe(true);

    const del = await request.delete(`/api/todos/${created.id}`);
    expect(del.status()).toBe(204);

    const getAfterDelete = await request.get(`/api/todos/${created.id}`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test("id inexistente retorna 404 em get/update/delete", async ({
    request,
  }) => {
    const missingId = "00000000-0000-0000-0000-000000000000";

    expect((await request.get(`/api/todos/${missingId}`)).status()).toBe(404);
    expect(
      (
        await request.patch(`/api/todos/${missingId}`, {
          data: { done: true },
        })
      ).status(),
    ).toBe(404);
    expect((await request.delete(`/api/todos/${missingId}`)).status()).toBe(
      404,
    );
  });
});
