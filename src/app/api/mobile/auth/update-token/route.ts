import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth'; // Ensure you have a way to verify or just use raw for now. Wait, I'll pass userId directly if there's no middleware.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await prisma.customer.update({
      where: { id: userId },
      data: { expoPushToken: pushToken }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
