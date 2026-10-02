import { prisma } from "@/lib/db/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getRequestUser } from "@/lib/api/session";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { serialise } from "@/lib/api/serialise";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser();
  if (!user) return apiError(new UnauthorizedError());
  if (!["ADMIN", "SUPER_ADMIN", "INVENTORY_MANAGER"].includes(user.role)) return apiError(new ForbiddenError());

  const { id: itemId } = await params;
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || undefined;
  const limit  = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  const filters: Prisma.Sql[] = [
    Prisma.sql`sh."itemId" = ${itemId}`,
    Prisma.sql`sh."changeType" != 'FULFILLED'::"StockChangeType"`,
  ];

  if (search) {
    const s = `%${search}%`;
    filters.push(Prisma.sql`(u.name ILIKE ${s} OR sh."notes" ILIKE ${s} OR sh."changeType"::text ILIKE ${s})`);
  }

  const where = Prisma.join(filters, " AND ");

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<{
      id: string;
      changeType: string;
      quantityDelta: number;
      quantityAfter: number;
      createdAt: Date;
      notes: string | null;
      changedByName: string | null;
    }[]>`
      SELECT
        sh.id,
        sh."changeType",
        sh."quantityDelta",
        sh."quantityAfter",
        sh."createdAt",
        sh.notes,
        u.name as "changedByName"
      FROM "StockHistory" sh
      LEFT JOIN "User" u ON u.id = sh."changedBy"
      WHERE ${where}
      ORDER BY sh."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ totalRecords: number }[]>`
      SELECT COUNT(*)::int as "totalRecords"
      FROM "StockHistory" sh
      LEFT JOIN "User" u ON u.id = sh."changedBy"
      WHERE ${where}
    `,
  ]);

  const summary = totals[0] ?? { totalRecords: 0 };
  const hasMore = offset + rows.length < summary.totalRecords;

  return apiSuccess(
    serialise({
      records: rows.map((r) => ({
        id: r.id,
        changeType: r.changeType,
        quantityDelta: r.quantityDelta,
        quantityAfter: r.quantityAfter,
        createdAt: r.createdAt.toISOString(),
        notes: r.notes,
        changedByName: r.changedByName,
      })),
      summary,
    }),
    { hasMore, nextOffset: offset + limit, total: summary.totalRecords }
  );
}

export const dynamic = "force-dynamic";
