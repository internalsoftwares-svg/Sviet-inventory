/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/api/session'

export async function GET(req: Request) {
  try {
    const user = await getRequestUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '40')
    const cursor = searchParams.get('cursor')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { employeeId: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const returns = await prisma.returnRequest.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, department: true, email: true },
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true, unitPrice: true },
            },
          },
        },
      },
    })

    let nextCursor = null
    if (returns.length > limit) {
      const nextItem = returns.pop()
      nextCursor = nextItem?.id
    }

    return NextResponse.json({
      data: returns,
      meta: { nextCursor },
    })
  } catch (error) {
    console.error('[ADMIN_RETURNS_GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
