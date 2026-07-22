import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSessionOrRedirect(await headers(), locale);
  const t = await getTranslations("Account");

  return (
    <main className="mx-auto max-w-180 px-4 py-20 sm:px-6">
      <h1 className="text-xl font-semibold sm:text-2xl">{t("title")}</h1>

      <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-5 sm:px-6">
        <p className="text-sm sm:text-base">
          {t("emailLabel")}:{" "}
          <span className="font-semibold text-accent">
            {session.user.email}
          </span>
        </p>
        <p className="mt-2 text-sm sm:text-base">
          {t("organizationLabel")}:{" "}
          <span className="font-semibold text-accent">
            {session.user.organizationId}
          </span>
        </p>
      </div>

      <SignOutButton />
    </main>
  );
}
