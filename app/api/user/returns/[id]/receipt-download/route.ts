import { getRequestUser } from '@/lib/api/session'
import { apiError } from '@/lib/api/response'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { renderReceiptPdf } from '@/lib/pdf/receipt'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser()
  if (!user) return apiError(new UnauthorizedError())

  const { id } = await params
  const returnReq = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { item: true } },
      request: true,
    },
  })
  if (!returnReq) return apiError(new NotFoundError('Return Request not found.'))
  if (returnReq.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return apiError(new UnauthorizedError())

  if (returnReq.status !== 'APPROVED' || !returnReq.returnReceiptNumber) {
    return apiError(new NotFoundError('Return Receipt not available.'))
  }

  const [adminUser, inventoryManagerUser] = await Promise.all([
    returnReq.request.adminId ? prisma.user.findUnique({ where: { id: returnReq.request.adminId }, select: { name: true } }) : null,
    returnReq.processedBy ? prisma.user.findUnique({ where: { id: returnReq.processedBy }, select: { name: true } }) : null,
  ])

  const pdfBuffer = await renderReceiptPdf({
    receiptNumber: returnReq.returnReceiptNumber,
    processedAt: returnReq.processedAt ?? new Date(),
    sessionYear: returnReq.request.sessionYear,
    issuedToName: returnReq.user.name,
    issuedToDepartment: returnReq.user.department,
    adminName: adminUser?.name ?? 'Admin',
    adminNotes: returnReq.adminNotes ?? null,
    inventoryManagerName: inventoryManagerUser?.name ?? 'Inventory Manager',
    items: returnReq.items.map((entry) => ({
      id: entry.id,
      name: entry.item.name,
      unit: entry.item.unit,
      quantity: entry.quantity,
      unitPrice: entry.item.unitPrice ? String(entry.item.unitPrice) : null,
      lineTotal: entry.item.unitPrice
        ? String(Number(entry.item.unitPrice) * Number(entry.quantity))
        : null,
    })),
    collegeName: process.env.COLLEGE_NAME ?? 'College',
    collegeAddress: process.env.COLLEGE_ADDRESS ?? '',
    isReturn: true,
  })

  const headers = new Headers()
  headers.set('Content-Type', 'application/pdf')
  headers.set('Content-Disposition', `attachment; filename="${returnReq.returnReceiptNumber}.pdf"`)

  return new Response(new Uint8Array(pdfBuffer), { headers })
}

export const dynamic = 'force-dynamic'
