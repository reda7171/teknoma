import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// GET: Mes demandes d'échange (reçues et envoyées)
export async function GET(req: Request) {
  try {
    const customerId = await getCustomerId(req);
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
