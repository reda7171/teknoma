import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// PUT: Mettre à jour le statut d'une demande (Accepter, Refuser)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await req.json();
    const { status } = body;
    if (!['ACCEPTED', 'REJECTED', 'COMPLETED'].includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 }); // 'ACCEPTED', 'REJECTED'

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

    const updatedExchange = await prisma.$transaction(async tx => {
      const changed = await tx.exchange.updateMany({ where: { id, status: status === 'COMPLETED' ? 'ACCEPTED' : 'PENDING' }, data: { status } });
      if (changed.count !== 1) throw new Error('Transition impossible');

    // Si accepté, on peut marquer les livres comme indisponibles, etc.
    if (status === 'ACCEPTED') {
      await tx.exchangeBook.update({
        where: { id: exchange.bookRequestedId },
        data: { status: 'EXCHANGED' }
      });
      if (exchange.bookOfferedId) {
        await tx.exchangeBook.update({
          where: { id: exchange.bookOfferedId },
          data: { status: 'EXCHANGED' }
        });
      }

      // Give & Take: Donner les crédits au responder
      if (exchange.type === 'CREDIT' && exchange.creditsAmount) {
        await tx.customer.update({
          where: { id: exchange.responderId },
          data: { credits: { increment: exchange.creditsAmount } }
        });
      }
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      // Rembourser le requester si c'était en crédit
      if (exchange.type === 'CREDIT' && exchange.creditsAmount) {
        await tx.customer.update({
          where: { id: exchange.requesterId },
          data: { credits: { increment: exchange.creditsAmount } }
        });
      }
    }

    return tx.exchange.findUnique({ where: { id } });
    });

    return NextResponse.json({ message: 'Statut mis à jour', exchange: updatedExchange });
  } catch (error) {
    console.error('Error updating exchange request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
