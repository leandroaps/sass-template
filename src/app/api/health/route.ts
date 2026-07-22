import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Healthcheck usado pelo Docker HEALTHCHECK, load balancers
 * e pelo Playwright (webServer readiness).
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up" });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "down" },
      { status: 503 },
    );
  }
}
