import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Roda migrations de forma idempotente.
 * Usado localmente, no CI e no entrypoint do container.
 */
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("✅ Migrations aplicadas");
}

main().catch((err) => {
  console.error("❌ Falha nas migrations", err);
  process.exit(1);
});
