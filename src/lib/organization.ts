import { db } from "@/db";
import { organizations } from "@/db/schema";

/**
 * Placeholder org resolution until spec 0003 (Auth) lands — swap the body of
 * this function for session-derived scoping and every resource's routes
 * benefit without changes.
 */
export async function getDefaultOrgId(): Promise<string> {
  const existing = await db.query.organizations.findFirst();
  if (existing) return existing.id;

  const [created] = await db
    .insert(organizations)
    .values({ name: "Default Org" })
    .returning();
  return created!.id;
}
