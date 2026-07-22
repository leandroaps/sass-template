"use client";

import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { showSuccess } from "@/lib/toast";

export function SignOutButton() {
  const t = useTranslations("Account");
  const tToast = useTranslations("Toast");
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        showSuccess(tToast("signedOut"));
        router.push("/");
        router.refresh();
      }}
      className="mt-4 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text hover:bg-surface"
    >
      {t("signOutButton")}
    </button>
  );
}
