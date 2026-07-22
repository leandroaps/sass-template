"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { mapZodErrorsToForm } from "@/lib/forms/server-errors";
import { createTodoSchema } from "@/lib/schemas/todos";
import { showError, showSuccess } from "@/lib/toast";

type Todo = { id: string; title: string; done: boolean };
type CreateTodoInput = z.infer<typeof createTodoSchema>;
type FlattenedZodError = { fieldErrors: Record<string, string[] | undefined> };

export class ApiValidationError extends Error {
  details: FlattenedZodError;

  constructor(details: FlattenedZodError) {
    super("Validation failed");
    this.name = "ApiValidationError";
    this.details = details;
  }
}

function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async (): Promise<Todo[]> => {
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("Failed to load todos");
      const { data } = await res.json();
      return data;
    },
  });
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (res.status === 400) {
    const body = await res.json();
    throw new ApiValidationError(body.details);
  }
  if (!res.ok) {
    throw new Error("Failed to create todo");
  }

  const { data } = await res.json();
  return data;
}

function useCreateTodo() {
  const queryClient = useQueryClient();
  const t = useTranslations("Toast");

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      showSuccess(t("todoCreated"));
    },
    onError: (err) => {
      if (!(err instanceof ApiValidationError)) {
        showError(t("genericError"));
      }
    },
  });
}

export function TodoForm() {
  const t = useTranslations("Todos");
  const { data: todos, isLoading } = useTodos();
  const createTodoMutation = useCreateTodo();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useZodForm(createTodoSchema, { defaultValues: { title: "" } });

  const onSubmit = handleSubmit((data) => {
    createTodoMutation.mutate(data, {
      onSuccess: () => reset(),
      onError: (err) => {
        if (err instanceof ApiValidationError) {
          mapZodErrorsToForm(err.details, setError);
        }
      },
    });
  });

  return (
    <section
      className="mt-4 rounded-xl border border-border bg-surface px-4 py-5 sm:px-6"
      data-testid="todos"
    >
      <h2 className="text-sm font-semibold sm:text-base">{t("title")}</h2>

      {isLoading ? (
        <p className="mt-2 text-sm text-muted sm:text-base">{t("loading")}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {todos?.map((todo) => (
            <li
              key={todo.id}
              data-testid="todo-item"
              className="text-sm sm:text-base"
            >
              {todo.title}
            </li>
          ))}
          {todos?.length === 0 && (
            <li className="text-sm text-muted sm:text-base">{t("empty")}</li>
          )}
        </ul>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="flex-1">
          <input
            {...register("title")}
            placeholder={t("titlePlaceholder")}
            data-testid="todo-title-input"
            className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text"
          />
          {errors.title && (
            <p
              className="mt-1 text-xs text-accent"
              data-testid="todo-title-error"
            >
              {errors.title.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={createTodoMutation.isPending}
          data-testid="todo-submit"
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text hover:bg-surface disabled:opacity-50"
        >
          {t("addButton")}
        </button>
      </form>
    </section>
  );
}
