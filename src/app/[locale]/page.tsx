import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { HealthCheckButton } from "@/components/health-check-button";
import { TodoForm } from "@/components/todo-form";
import { AuthNav } from "@/components/auth-nav";

export const dynamic = "force-dynamic";

const stackItemKeys = [
  "nextjs",
  "tailwind",
  "nextIntl",
  "tanstackQuery",
  "typescript",
  "drizzle",
  "zod",
  "playwright",
  "docker",
  "githubActions",
] as const;

async function getDbStatus(): Promise<"connected" | "unavailable"> {
  try {
    await db.execute(sql`SELECT 1`);
    return "connected";
  } catch {
    return "unavailable";
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tStack, tFooter, dbStatus] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Stack"),
    getTranslations("Footer"),
    getDbStatus(),
  ]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-180 items-center justify-between px-4 sm:px-6">
          <span className="min-w-0 truncate text-sm font-semibold">
            SaaS Template
          </span>
          <div className="flex items-center gap-4">
            <AuthNav />
            <LocaleSwitcher activeLocale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-180 px-4 pt-20 pb-20 sm:px-6">
        <h1 className="text-xl font-semibold sm:text-2xl">SaaS Template</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">{t("tagline")}</p>

        <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-5 sm:px-6">
          <p className="text-sm sm:text-base">
            {t("dbLabel")}{" "}
            <span
              className="font-semibold text-accent"
              data-testid="db-status"
            >
              {dbStatus === "connected" ? t("dbConnected") : t("dbUnavailable")}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted sm:text-base">
            {t("healthcheck")} <code>/api/health</code>
          </p>
          <HealthCheckButton />
        </div>

        <section
          className="mt-4 rounded-xl border border-border bg-surface px-4 py-5 sm:px-6"
          data-testid="tech-stack"
        >
          <h2 className="text-sm font-semibold sm:text-base">
            {tStack("title")}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stackItemKeys.map((key) => (
              <li key={key}>
                <p className="text-sm font-semibold sm:text-base">
                  {tStack(`items.${key}.name`)}
                </p>
                <p className="mt-1 text-sm text-muted sm:text-base">
                  {tStack(`items.${key}.description`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <TodoForm />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-50 h-14 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-180 items-center justify-center px-4 sm:px-6">
          <span className="min-w-0 truncate text-xs text-muted sm:text-sm">
            {tFooter("tagline")}
          </span>
        </div>
      </footer>
    </>
  );
}
