import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser()
    if (!user || user.role !== 'INVENTORY_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { adminNotes } = body

    const returnReq = await prisma.returnRequest.findUnique({
      where: { id }
    })

    if (!returnReq) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (returnReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'Return request is already processed' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes ? `[IM]: ${adminNotes}` : returnReq.adminNotes,
          processedAt: new Date(),
          processedBy: user.id
        }
      })

      await tx.notification.create({
        data: {
          userId: returnReq.userId,
          type: 'SYSTEM',
          title: 'Return Request Rejected',
          message: `Your return request has been rejected by the Inventory Manager.`,
          isRead: false
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IM_RETURN_REJECT]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
