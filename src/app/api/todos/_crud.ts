import { todos } from "@/db/schema";
import { createTodoSchema, updateTodoSchema } from "@/lib/schemas/todos";
import { createCrudHandlers } from "@/lib/crud";

export const todosCrud = createCrudHandlers({
  table: todos,
  insertSchema: createTodoSchema,
  updateSchema: updateTodoSchema,
  allowedSort: ["title", "done", "createdAt"],
  allowedFilters: { title: "text", done: "exact" },
  defaultSort: { column: "createdAt", direction: "desc" },
});
