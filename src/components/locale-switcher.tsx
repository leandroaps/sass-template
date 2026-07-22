"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  "pt-BR": "PT",
  en: "EN",
};

export function LocaleSwitcher({ activeLocale }: { activeLocale: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 text-xs sm:text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={
            locale === activeLocale
              ? "font-semibold text-accent"
              : "text-muted"
          }
        >
          {localeLabels[locale] ?? locale}
        </Link>
      ))}
    </nav>
  );
}
