import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Reference protected API route (spec 0003): 401 without a session, else the
 * signed-in user's email + organization. New protected resources should
 * follow this pattern — call getSession(request.headers) first, 401 if null.
 */
export async function GET(request: Request) {
  const session = await getSession(request.headers);

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json({
    data: {
      email: session.user.email,
      organizationId: session.user.organizationId,
    },
  });
}
