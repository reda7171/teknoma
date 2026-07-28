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

// PUT: Mettre à jour le statut d'une demande (Accepter, Refuser)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await req.json();
    const { status } = body; // 'ACCEPTED', 'REJECTED'

    const exchange = await prisma.exchange.findUnique({
      where: { id },
    });

    if (!exchange) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    // Seul le destinataire peut accepter/refuser. Mais les deux peuvent marquer comme COMPLETED.
    if (status !== 'COMPLETED' && exchange.responderId !== customerId) {
      return NextResponse.json({ error: 'Non autorisé à modifier cette demande' }, { status: 403 });
    }
    if (status === 'COMPLETED' && exchange.responderId !== customerId && exchange.requesterId !== customerId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const updatedExchange = await prisma.exchange.update({
      where: { id },
      data: { status },
    });

    // Si accepté, on peut marquer les livres comme indisponibles, etc.
    if (status === 'ACCEPTED') {
      await prisma.exchangeBook.update({
        where: { id: exchange.bookRequestedId },
        data: { status: 'EXCHANGED' }
      });
      if (exchange.bookOfferedId) {
        await prisma.exchangeBook.update({
          where: { id: exchange.bookOfferedId },
          data: { status: 'EXCHANGED' }
        });
      }
      
      // Give & Take: Donner les crédits au responder
      if (exchange.type === 'CREDIT' && exchange.creditsAmount) {
        await prisma.customer.update({
          where: { id: exchange.responderId },
          data: { credits: { increment: exchange.creditsAmount } }
        });
      }
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      // Rembourser le requester si c'était en crédit
      if (exchange.type === 'CREDIT' && exchange.creditsAmount) {
        await prisma.customer.update({
          where: { id: exchange.requesterId },
          data: { credits: { increment: exchange.creditsAmount } }
        });
      }
    }

    return NextResponse.json({ message: 'Statut mis à jour', exchange: updatedExchange });
  } catch (error) {
    console.error('Error updating exchange request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
