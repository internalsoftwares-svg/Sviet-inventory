import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getRequestUser } from '@/lib/api/session';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .refine((val) => !val.includes(' '), { message: 'Password cannot contain spaces' }),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getRequestUser();
    
    // Check if user is logged in and is a SUPER_ADMIN
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only Super Admin can reset passwords.' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { password } = parsed.data;
    const passwordHash = await hashPassword(password);

    // Update the target user's password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
