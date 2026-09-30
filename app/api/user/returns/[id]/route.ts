import { NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'
import { apiError, apiSuccess } from '@/lib/api/response'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const user = await getRequestUser()
    if (!user || !user.id) {
      return apiError(new UnauthorizedError())
    }

    const returnReq = await db.returnRequest.findUnique({
      where: {
        id: resolvedParams.id,
        userId: user.id
      },
      include: {
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        },
        request: {
          select: {
            id: true,
            sessionYear: true
          }
        }
      }
    })

    if (!returnReq) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 })
    }

    return NextResponse.json({ data: returnReq })
  } catch (error) {
    console.error('Error fetching user return detail:', error)
    return NextResponse.json({ error: 'Failed to fetch return details' }, { status: 500 })
  }
}
