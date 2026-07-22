import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { organizations } from "@/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BASE_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  // Must be last — lets Better Auth set cookies from Server Actions/Route Handlers.
  plugins: [nextCookies()],
});

/**
 * Provisions an organization for a user who doesn't have one yet — lazy,
 * rather than a Better Auth `databaseHooks` callback, so org creation doesn't
 * depend on reverse-engineering that extension point. Since `/account` (the
 * first page after sign-up) always calls getSession(), the org exists before
 * the user can do anything else.
 */
async function provisionOrganizationId(userId: string): Promise<string> {
  const [org] = await db
    .insert(organizations)
    .values({ name: "Minha organização" })
    .returning();

  await db
    .update(schema.user)
    .set({ organizationId: org!.id })
    .where(eq(schema.user.id, userId));

  return org!.id;
}

/**
 * Resolves the current session, provisioning the user's organization on
 * first use if it doesn't exist yet. Returns null if there's no session.
 */
export async function getSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;

  if (!session.user.organizationId) {
    session.user.organizationId = await provisionOrganizationId(
      session.user.id,
    );
  }

  return session;
}

/**
 * For Server Components/pages: redirects to sign-in (locale-aware) if there's
 * no session, otherwise returns it with `organizationId` guaranteed present.
 */
export async function requireSessionOrRedirect(
  headers: Headers,
  locale: string,
) {
  const session = await getSession(headers);
  if (!session) {
    redirect({ href: "/sign-in", locale });
    throw new Error("unreachable");
  }
  return session;
}
