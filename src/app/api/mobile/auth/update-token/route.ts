import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileCustomer } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const customer = await getMobileCustomer(req);
    if (!customer) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const body = await req.json();
    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    if (userId !== customer.id) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    if (typeof pushToken !== 'string' || pushToken.length > 255) return NextResponse.json({ error: 'Token invalide' }, { status: 400 });

    await prisma.customer.update({
      where: { id: customer.id },
      data: { expoPushToken: pushToken }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
