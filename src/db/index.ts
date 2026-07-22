import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Singleton do client — evita esgotar o pool em dev com hot-reload.
 * Em serverless (Vercel/Lambda), troque por um pooler (PgBouncer,
 * Neon, Supabase Pooler) e max: 1.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
