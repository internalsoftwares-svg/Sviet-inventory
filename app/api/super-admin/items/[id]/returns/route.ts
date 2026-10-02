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
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) return apiError(new ForbiddenError());

  const { id: itemId } = await params;
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || undefined;
  const limit  = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  const filters: Prisma.Sql[] = [
    Prisma.sql`rri."itemId" = ${itemId}`,
  ];

  if (search) {
    const s = `%${search}%`;
    filters.push(Prisma.sql`(u.name ILIKE ${s} OR u_admin.name ILIKE ${s})`);
  }

  const where = Prisma.join(filters, " AND ");

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<{
      id: string;
      quantity: number;
      createdAt: Date;
      status: string;
      notes: string | null;
      adminNotes: string | null;
      processedAt: Date | null;
      employeeName: string;
      department: string | null;
      adminName: string | null;
    }[]>`
      SELECT
        rri.id,
        rri.quantity,
        rri."createdAt",
        rr.status,
        rr.notes,
        rr."adminNotes",
        rr."processedAt",
        u.name as "employeeName",
        u.department,
        u_admin.name as "adminName"
      FROM "ReturnRequestItem" rri
      JOIN "ReturnRequest" rr ON rr.id = rri."returnRequestId"
      JOIN "User" u ON u.id = rr."userId"
      LEFT JOIN "User" u_admin ON u_admin.id = rr."processedBy"
      WHERE ${where}
      ORDER BY rri."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ totalRecords: number }[]>`
      SELECT COUNT(*)::int as "totalRecords"
      FROM "ReturnRequestItem" rri
      JOIN "ReturnRequest" rr ON rr.id = rri."returnRequestId"
      JOIN "User" u ON u.id = rr."userId"
      LEFT JOIN "User" u_admin ON u_admin.id = rr."processedBy"
      WHERE ${where}
    `,
  ]);

  const summary = totals[0] ?? { totalRecords: 0 };
  const hasMore = offset + rows.length < summary.totalRecords;

  return apiSuccess(
    serialise({
      records: rows.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        createdAt: r.createdAt.toISOString(),
        status: r.status,
        notes: r.notes,
        adminNotes: r.adminNotes,
        processedAt: r.processedAt?.toISOString() ?? null,
        employeeName: r.employeeName,
        department: r.department,
        adminName: r.adminName,
      })),
      summary,
    }),
    { hasMore, nextOffset: offset + limit, total: summary.totalRecords }
  );
}

export const dynamic = "force-dynamic";
