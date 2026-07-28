import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_riwaya_mobile_key_2026';

function getCustomerId(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch (e) {
    return null;
  }
}

// GET: Mes demandes d'échange (reçues et envoyées)
export async function GET(req: Request) {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const sentRequests = await prisma.exchange.findMany({
      where: { requesterId: customerId },
      include: {
        bookRequested: true,
        bookOffered: true,
        responder: { select: { fullName: true, city: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const receivedRequests = await prisma.exchange.findMany({
      where: { responderId: customerId },
      include: {
        bookRequested: true,
        bookOffered: true,
        requester: { select: { fullName: true, city: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sent: sentRequests, received: receivedRequests });
  } catch (error) {
    console.error('Error fetching exchange requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
