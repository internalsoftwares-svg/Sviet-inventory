import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'
import { generateReturnInvoiceNumber } from '@/lib/api/invoice'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { adminNotes } = body
    const { id } = await params

    const returnReq = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: { item: true }
        },
        request: true
      }
    })

    if (!returnReq) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (returnReq.status !== 'REQUESTED') {
      return NextResponse.json({ error: 'Return request is already processed' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark ReturnRequest as PENDING (awaiting Inventory Manager)
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'PENDING',
          adminNotes: adminNotes || null,
          processedAt: new Date(),
          processedBy: user.id,
          returnInvoiceNumber: generateReturnInvoiceNumber(returnReq.request.sessionYear)
        }
      })

      // 2. Send notification to user
      await tx.notification.create({
        data: {
          userId: returnReq.userId,
          type: 'SYSTEM',
          title: 'Return Request Approved',
          message: `Your return request has been approved by Admin and is awaiting Inventory Manager verification.`,
          isRead: false
        }
      })
    })


    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_RETURN_APPROVE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
