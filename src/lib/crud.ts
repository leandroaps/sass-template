import { NextResponse } from "next/server";
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { ZodTypeAny } from "zod";
import { db } from "@/db";
import { getDefaultOrgId } from "@/lib/organization";

/**
 * Deliberately loose: Drizzle's table generics are hard to express precisely
 * in a fully generic helper. `PgTableWithColumns<any>` lets `.from`/`.insert`/
 * `.update`/`.delete` accept the table; the two named columns are all this
 * module needs to know about beyond that. Call sites (e.g. the `todos` table)
 * still get real inference from the actual table/schema they pass in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
type CrudTable = PgTableWithColumns<any> & {
  id: AnyPgColumn;
  organizationId: AnyPgColumn;
};

function getColumn(table: CrudTable, key: string): AnyPgColumn | undefined {
  return (table as unknown as Record<string, AnyPgColumn>)[key];
}

type FilterMode = "text" | "exact";

export type CrudConfig<
  Table extends CrudTable,
  InsertSchema extends ZodTypeAny,
  UpdateSchema extends ZodTypeAny,
> = {
  table: Table;
  insertSchema: InsertSchema;
  updateSchema: UpdateSchema;
  allowedSort: readonly string[];
  allowedFilters?: Record<string, FilterMode>;
  defaultSort?: { column: string; direction: "asc" | "desc" };
};

class InvalidSortError extends Error {}

/**
 * Placeholder org resolution until spec 0003 (Auth) lands — swap this body
 * for session-derived scoping and every resource using createCrudHandlers
 * benefits without route-level changes.
 */
async function resolveOrganizationId(_request: Request): Promise<string> {
  return getDefaultOrgId();
}

function parseSort(
  searchParams: URLSearchParams,
  allowedSort: readonly string[],
  defaultSort: { column: string; direction: "asc" | "desc" } | undefined,
): { column: string; direction: "asc" | "desc" } | undefined {
  const sortParam = searchParams.get("sort");
  if (!sortParam) return defaultSort;

  const direction: "asc" | "desc" = sortParam.startsWith("-") ? "desc" : "asc";
  const column = sortParam.startsWith("-") ? sortParam.slice(1) : sortParam;

  if (!allowedSort.includes(column)) {
    throw new InvalidSortError(column);
  }

  return { column, direction };
}

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(0, Math.trunc(Number(searchParams.get("page")) || 0));
  const pageSize = Math.min(
    Math.max(1, Math.trunc(Number(searchParams.get("pageSize")) || 20)),
    100,
  );
  return { page, pageSize };
}

export function createCrudHandlers<
  Table extends CrudTable,
  InsertSchema extends ZodTypeAny,
  UpdateSchema extends ZodTypeAny,
>(config: CrudConfig<Table, InsertSchema, UpdateSchema>) {
  const { table, insertSchema, updateSchema, allowedSort, allowedFilters, defaultSort } =
    config;

  async function list(request: Request): Promise<NextResponse> {
    const organizationId = await resolveOrganizationId(request);
    const { searchParams } = new URL(request.url);

    let sort: { column: string; direction: "asc" | "desc" } | undefined;
    try {
      sort = parseSort(searchParams, allowedSort, defaultSort);
    } catch (err) {
      if (err instanceof InvalidSortError) {
        return NextResponse.json(
          { error: `Coluna de ordenação inválida: ${err.message}` },
          { status: 400 },
        );
      }
      throw err;
    }

    const { page, pageSize } = parsePagination(searchParams);

    const conditions: SQL[] = [eq(table.organizationId, organizationId)];
    for (const [key, mode] of Object.entries(allowedFilters ?? {})) {
      const value = searchParams.get(key);
      if (value === null) continue;
      const column = getColumn(table, key);
      if (!column) continue;
      conditions.push(mode === "text" ? ilike(column, `%${value}%`) : eq(column, value));
    }
    const whereClause = and(...conditions)!;

    const sortColumn = sort ? getColumn(table, sort.column) : undefined;
    const orderFn = sort?.direction === "desc" ? desc : asc;

    // Drizzle's `.from()` type guard can't resolve against this generic
    // `Table`; the runtime shape is always a real, fully-defined table.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromTable = table as any;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(fromTable)
        .where(whereClause)
        .orderBy(orderFn(sortColumn ?? table.id))
        .limit(pageSize)
        .offset(page * pageSize),
      db.select({ value: count() }).from(fromTable).where(whereClause),
    ]);

    return NextResponse.json({
      data: items,
      page,
      pageSize,
      total: totalResult[0]?.value ?? 0,
    });
  }

  async function getOne(request: Request, id: string): Promise<NextResponse> {
    const organizationId = await resolveOrganizationId(request);
    const [item] = await db
      .select()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see fromTable note in list()
      .from(table as any)
      .where(and(eq(table.id, id), eq(table.organizationId, organizationId)));

    if (!item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  }

  async function create(request: Request): Promise<NextResponse> {
    const organizationId = await resolveOrganizationId(request);
    const body = await request.json().catch(() => null);
    const parsed = insertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Table is generic here; the concrete insert shape is only known at each call site.
      .values({ ...(parsed.data as object), organizationId } as any)
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  }

  async function update(request: Request, id: string): Promise<NextResponse> {
    const organizationId = await resolveOrganizationId(request);
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(table)
      .set(parsed.data as object)
      .where(and(eq(table.id, id), eq(table.organizationId, organizationId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  }

  async function remove(request: Request, id: string): Promise<NextResponse> {
    const organizationId = await resolveOrganizationId(request);
    const [deleted] = await db
      .delete(table)
      .where(and(eq(table.id, id), eq(table.organizationId, organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  }

  type ItemContext = { params: Promise<{ id: string }> };

  return {
    collection: {
      GET: (request: Request) => list(request),
      POST: (request: Request) => create(request),
    },
    item: {
      GET: async (request: Request, { params }: ItemContext) => {
        const { id } = await params;
        return getOne(request, id);
      },
      PATCH: async (request: Request, { params }: ItemContext) => {
        const { id } = await params;
        return update(request, id);
      },
      DELETE: async (request: Request, { params }: ItemContext) => {
        const { id } = await params;
        return remove(request, id);
      },
    },
  };
}
