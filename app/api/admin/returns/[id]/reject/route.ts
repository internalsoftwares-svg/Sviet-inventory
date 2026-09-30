import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'

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
      where: { id }
    })

    if (!returnReq) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (returnReq.status !== 'REQUESTED') {
      return NextResponse.json({ error: 'Return request is already processed' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark ReturnRequest as REJECTED
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || null,
          processedAt: new Date(),
          processedBy: user.id
        }
      })

      // 2. Send notification to user
      await tx.notification.create({
        data: {
          userId: returnReq.userId,
          type: 'SYSTEM',
          title: 'Return Request Rejected',
          message: `Your return request has been rejected.`,
          isRead: false
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_RETURN_REJECT]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
