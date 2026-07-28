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

// POST: Envoyer une demande d'échange
export async function POST(req: Request) {
  try {
    const requesterId = getCustomerId(req);
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

    let creditsAmount = 0;
    if (targetBook.exchangeType === 'CREDIT') {
      const requester = await prisma.customer.findUnique({ where: { id: requesterId } });
      if (!requester || requester.credits < 10) {
        return NextResponse.json({ error: 'Crédits insuffisants (10 crédits requis)' }, { status: 400 });
      }
      creditsAmount = 10;
      
      // Déduire les crédits du demandeur
      await prisma.customer.update({
        where: { id: requesterId },
        data: { credits: { decrement: 10 } }
      });
    }

    const exchange = await prisma.exchange.create({
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

    return NextResponse.json({ message: 'Demande envoyée avec succès', exchange });
  } catch (error) {
    console.error('Error creating exchange request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
