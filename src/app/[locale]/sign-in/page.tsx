"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { signInSchema } from "@/lib/schemas/auth";
import { showError } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export default function SignInPage() {
  const t = useTranslations("Auth");
  const tToast = useTranslations("Toast");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(signInSchema, {
    defaultValues: { email: "", password: "" },
  });

  const signInMutation = useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      authClient.signIn.email(input),
  });

  const onSubmit = handleSubmit((data) => {
    signInMutation.mutate(data, {
      onSuccess: ({ data: result, error }) => {
        if (error) {
          showError(tToast("invalidCredentials"));
          return;
        }
        if (result) {
          router.push("/account");
        }
      },
      onError: () => showError(tToast("genericError")),
    });
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold sm:text-2xl">{t("signInTitle")}</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
          disabled={signInMutation.isPending}
          className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-bg disabled:opacity-50"
        >
          {t("signInButton")}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-semibold text-accent">
          {t("signUpLink")}
        </Link>
      </p>
    </main>
  );
}
