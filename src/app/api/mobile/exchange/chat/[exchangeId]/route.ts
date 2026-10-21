import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '@/lib/jwt-secret';

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

// GET: Récupérer ou créer un chat pour un échange, et lister les messages
export async function GET(req: Request, { params }: { params: Promise<{ exchangeId: string }> }) {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { exchangeId } = resolvedParams;

    // Vérifier si l'échange existe et si l'utilisateur en fait partie
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: {
        chat: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        requester: { select: { id: true, fullName: true } },
        responder: { select: { id: true, fullName: true } },
        bookRequested: { select: { id: true, title: true } }
      }
    });

    if (!exchange) {
      return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 });
    }

    if (exchange.requesterId !== customerId && exchange.responderId !== customerId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    // Déterminer le message initial
    const initialContent = exchange.message && exchange.message.trim() !== '' 
      ? exchange.message 
      : "Bonjour, je suis intéressé par votre livre !";

    // Si le chat n'existe pas, le créer
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
        },
        include: { messages: true }
      });
    } else if (chat.messages && chat.messages.length === 0) {
      // Pour les anciens chats créés sans le premier message
      const initialMessage = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: exchange.requesterId,
          content: initialContent
        }
      });
      chat.messages.push(initialMessage);
    }

    // Déterminer l'autre participant
    const otherParticipant = exchange.requesterId === customerId ? exchange.responder : exchange.requester;

    return NextResponse.json({
      chat: {
        id: chat.id,
        messages: chat.messages || [],
      },
      exchangeDetails: {
        bookTitle: exchange.bookRequested.title,
        otherParticipant: otherParticipant.fullName
      }
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
