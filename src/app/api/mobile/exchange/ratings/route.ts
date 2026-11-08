import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// POST: Ajouter une note (rating) à un échange
export async function POST(req: Request) {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { exchangeId, rating, comment } = body;

    if (!exchangeId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
    });

    if (!exchange) {
      return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 });
    }

    if (exchange.requesterId !== customerId && exchange.responderId !== customerId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    if (exchange.status !== 'COMPLETED') {
       return NextResponse.json({ error: 'L\'échange doit être terminé pour être noté' }, { status: 400 });
    }

    // Déterminer qui est évalué
    const toUserId = exchange.requesterId === customerId ? exchange.responderId : exchange.requesterId;

    // Vérifier s'il a déjà noté cet échange
    const existingRating = await prisma.rating.findUnique({
      where: { exchangeId },
    });

    if (existingRating) {
      return NextResponse.json({ error: 'Vous avez déjà noté cet échange' }, { status: 400 });
    }

    const newRating = await prisma.rating.create({
      data: {
        exchangeId,
        fromUserId: customerId,
        toUserId,
        rating,
        comment,
      }
    });

    return NextResponse.json({ message: 'Note ajoutée avec succès', rating: newRating });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
