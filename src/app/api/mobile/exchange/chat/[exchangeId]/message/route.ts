import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// POST: Envoyer un message dans le chat d'un échange
export async function POST(req: Request, { params }: { params: Promise<{ exchangeId: string }> }) {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { exchangeId } = resolvedParams;

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
    }

    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: { chat: true }
    });

    if (!exchange) {
      return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 });
    }

    if (exchange.requesterId !== customerId && exchange.responderId !== customerId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const initialContent = exchange.message && exchange.message.trim() !== ''
      ? exchange.message
      : "Bonjour, je suis intéressé par votre livre !";

    let chat = exchange.chat;
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          exchangeId,
          messages: {
            create: {
              senderId: exchange.requesterId,
              content: initialContent
            }
          }
        }
      });
    }

    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: customerId,
        content
      }
    });

    return NextResponse.json({ message: 'Message envoyé', data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
