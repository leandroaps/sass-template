"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { mapZodErrorsToForm } from "@/lib/forms/server-errors";
import { signUpSchema } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@/i18n/navigation";
import { showError, showSuccess } from "@/lib/toast";

export default function SignUpPage() {
  const t = useTranslations("Auth");
  const tToast = useTranslations("Toast");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(signUpSchema, {
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUpMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      password: string;
    }) => authClient.signUp.email(input),
  });

  const onSubmit = handleSubmit((data) => {
    signUpMutation.mutate(data, {
      onSuccess: ({ data: result, error }) => {
        if (error) {
          if (error.status === 422) {
            mapZodErrorsToForm(
              { fieldErrors: { email: [error.message ?? tToast("genericError")] } },
              setError,
            );
          } else {
            showError(error.message ?? tToast("genericError"));
          }
          return;
        }
        if (result) {
          showSuccess(tToast("accountCreated"));
          router.push("/account");
        }
      },
      onError: () => showError(tToast("genericError")),
    });
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold sm:text-2xl">{t("signUpTitle")}</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-sm text-muted" htmlFor="name">
            {t("nameLabel")}
          </label>
          <input
            id="name"
            {...register("name")}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-accent">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-muted" htmlFor="email">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-accent">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-muted" htmlFor="password">
            {t("passwordLabel")}
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-accent">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={signUpMutation.isPending}
          className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-bg disabled:opacity-50"
        >
          {t("signUpButton")}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-accent">
          {t("signInLink")}
        </Link>
      </p>
    </main>
  );
}
