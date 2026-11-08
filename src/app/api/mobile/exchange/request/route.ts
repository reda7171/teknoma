import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// POST: Envoyer une demande d'échange
export async function POST(req: Request) {
  try {
    const requesterId = await getCustomerId(req);
    if (!requesterId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { bookRequestedId, bookOfferedId, message } = body;

    if (!bookRequestedId) {
      return NextResponse.json({ error: 'Livre demandé manquant' }, { status: 400 });
    }

    const targetBook = await prisma.exchangeBook.findUnique({
      where: { id: bookRequestedId },
    });

    if (!targetBook) {
      return NextResponse.json({ error: 'Livre introuvable' }, { status: 404 });
    }

    if (targetBook.ownerId === requesterId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas demander votre propre livre' }, { status: 400 });
    }

    if (bookOfferedId) {
      const offered = await prisma.exchangeBook.findUnique({ where: { id: bookOfferedId } });
      if (!offered || offered.ownerId !== requesterId || offered.status === 'EXCHANGED') return NextResponse.json({ error: 'Livre indisponible' }, { status: 400 });
    }
    if (targetBook.status === 'EXCHANGED') return NextResponse.json({ error: 'Livre indisponible' }, { status: 400 });
    const creditsAmount = targetBook.exchangeType === 'CREDIT' ? 10 : 0;
    const exchange = await prisma.$transaction(async tx => {
      if (creditsAmount) {
        const debit = await tx.customer.updateMany({ where: { id: requesterId, credits: { gte: creditsAmount } }, data: { credits: { decrement: creditsAmount } } });
        if (debit.count !== 1) throw new Error('Cr?dits insuffisants');
      }
      return tx.exchange.create({
      data: {
        requesterId,
        responderId: targetBook.ownerId,
        bookRequestedId,
        bookOfferedId, // Optionnel si c'est un achat en crédits ou giveaway
        message,
        type: targetBook.exchangeType,
        creditsAmount: creditsAmount > 0 ? creditsAmount : null,
        status: 'PENDING',
      },
    });

    });

    return NextResponse.json({ message: 'Demande envoyée avec succès', exchange });
  } catch (error) {
    console.error('Error creating exchange request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
