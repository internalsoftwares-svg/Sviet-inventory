import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'
import { generateReturnReceiptNumber } from '@/lib/api/invoice'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser()
    if (!user || user.role !== 'INVENTORY_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const returnReq = await prisma.returnRequest.findUnique({
      where: { id },
      include: { 
        items: true,
        request: true
      }
    })

    if (!returnReq) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (returnReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'Return request is already processed' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark ReturnRequest as APPROVED
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          processedBy: user.id,
          returnReceiptNumber: generateReturnReceiptNumber(returnReq.request.sessionYear)
        }
      })

      // 2. Restore inventory quantities and log stock history
      for (const reqItem of returnReq.items) {
        if (reqItem.quantity > 0) {
          await tx.inventoryItem.update({
            where: { id: reqItem.itemId },
            data: {
              availableQty: { increment: reqItem.quantity },
              totalQuantity: { increment: reqItem.quantity }
            }
          })

          const updatedItem = await tx.inventoryItem.findUnique({ where: { id: reqItem.itemId } })
          
          await tx.stockHistory.create({
            data: {
              itemId: reqItem.itemId,
              changeType: 'RESTORED',
              quantityDelta: reqItem.quantity,
              quantityAfter: updatedItem?.totalQuantity || 0,
              changedBy: user.id,
              notes: `Returned via return request ${id.slice(0, 8)}`,
            }
          })
        }
      }

      // 3. Send notification to user
      await tx.notification.create({
        data: {
          userId: returnReq.userId,
          type: 'SYSTEM',
          title: 'Return Request Completed',
          message: `Your return request has been verified and completed by the Inventory Manager.`,
          isRead: false
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IM_RETURN_APPROVE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
