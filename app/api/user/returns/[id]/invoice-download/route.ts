import { getRequestUser } from '@/lib/api/session'
import { apiError } from '@/lib/api/response'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { renderInvoicePdf } from '@/lib/pdf/invoice'

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
  if (returnReq.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return apiError(new UnauthorizedError())
  }

  if (returnReq.status !== 'APPROVED' || !returnReq.returnInvoiceNumber) {
    return apiError(new NotFoundError('Return Invoice not available.'))
  }

  const [adminUser, inventoryManagerUser] = await Promise.all([
    returnReq.request.adminId ? prisma.user.findUnique({ where: { id: returnReq.request.adminId }, select: { name: true, designation: true } }) : null,
    returnReq.processedBy ? prisma.user.findUnique({ where: { id: returnReq.processedBy }, select: { name: true } }) : null,
  ])

  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: returnReq.returnInvoiceNumber,
    processedAt: returnReq.processedAt ?? new Date(),
    sessionYear: returnReq.request.sessionYear,
    userName: returnReq.user.name,
    userDepartment: returnReq.user.department,
    userEmployeeId: returnReq.user.employeeId,
    adminName: adminUser?.name ?? 'Admin',
    adminDesignation: adminUser?.designation ?? null,
    inventoryManagerName: inventoryManagerUser?.name ?? 'Inventory Manager',
    adminNotes: returnReq.adminNotes ?? null,
    items: returnReq.items.map((entry) => ({
      id: entry.id,
      name: entry.item.name,
      unit: entry.item.unit,
      quantityReq: entry.quantity,
      quantityFul: entry.quantity,
    })),
    collegeName: process.env.COLLEGE_NAME ?? 'College',
    collegeAddress: process.env.COLLEGE_ADDRESS ?? '',
    collegeSealText: process.env.COLLEGE_SEAL_TEXT ?? '',
    isReturn: true,
  })

  const headers = new Headers()
  headers.set('Content-Type', 'application/pdf')
  headers.set('Content-Disposition', `attachment; filename="${returnReq.returnInvoiceNumber}.pdf"`)

  return new Response(new Uint8Array(pdfBuffer), { headers })
}

export const dynamic = 'force-dynamic'
