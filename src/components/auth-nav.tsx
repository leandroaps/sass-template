"use client";

import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";

export function AuthNav() {
  const t = useTranslations("Auth");
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <nav className="flex items-center gap-3 text-xs sm:text-sm">
        <Link href="/sign-in" className="text-muted">
          {t("signInLink")}
        </Link>
        <Link href="/sign-up" className="font-semibold text-accent">
          {t("signUpLink")}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="text-xs sm:text-sm">
      <Link href="/account" className="font-semibold text-accent">
        {session.user.email}
      </Link>
    </nav>
  );
}
