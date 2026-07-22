"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { showError, showSuccess } from "@/lib/toast";

async function checkHealth(): Promise<boolean> {
  const res = await fetch("/api/health");
  return res.ok;
}

export function HealthCheckButton() {
  const t = useTranslations("Toast");

  const mutation = useMutation({
    mutationFn: checkHealth,
    onSuccess: (ok) => {
      if (ok) {
        showSuccess(t("healthCheckSuccess"));
      } else {
        showError(t("healthCheckError"));
      }
    },
    onError: () => {
      showError(t("healthCheckError"));
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="mt-3 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text hover:bg-surface disabled:opacity-50"
    >
      {t("recheckButton")}
    </button>
  );
}
