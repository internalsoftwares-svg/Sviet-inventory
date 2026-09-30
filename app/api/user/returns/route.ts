import { NextResponse } from 'next/server'
import { prisma as db } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'
import { apiError, apiSuccess } from '@/lib/api/response'
import { UnauthorizedError } from '@/lib/errors'
import { RequestStatus } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const user = await getRequestUser()
    if (!user || !user.id) {
      return apiError(new UnauthorizedError())
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '40')
    const cursor = searchParams.get('cursor')

    const where: any = { userId: user.id }

    if (status && status !== 'ALL') {
      where.status = status as RequestStatus
    }

    const returns = await db.returnRequest.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
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
            sessionYear: true
          }
        }
      }
    })

    let nextCursor: string | null = null
    if (returns.length > limit) {
      const nextItem = returns.pop()
      nextCursor = nextItem!.id
    }

    return NextResponse.json({
      data: returns,
      meta: { nextCursor }
    })
  } catch (error) {
    console.error('Error fetching user returns:', error)
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 })
  }
}
