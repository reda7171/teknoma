import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

export async function GET(request: Request) {
    const mobileCustomer = await getMobileCustomer(request)
    if (!mobileCustomer) return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

    const readingList = await prisma.readingList.findMany({
      where: { customerId: decoded.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        book: { select: { language: true } }
      }
    });

    return NextResponse.json(readingList);
  } catch (error) {
    console.error('Reading list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    const mobileCustomer = await getMobileCustomer(request)
    if (!mobileCustomer) return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

    const body = await request.json();
    const { title, author, totalPages, cover, bookId } = body;

    if (!title || !author || !totalPages) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Check if book is already in reading list
    if (bookId) {
      const existing = await prisma.readingList.findFirst({
        where: { customerId: decoded.id, bookId }
      });
      if (existing) {
        return NextResponse.json({ error: 'Livre déjà dans la liste' }, { status: 400 });
      }
    }

    const newReadingList = await prisma.readingList.create({
      data: {
        customerId: decoded.id,
        title,
        author,
        totalPages: Number(totalPages),
        cover,
        bookId,
        status: 'TO_READ'
      }
    });

    return NextResponse.json(newReadingList, { status: 201 });
  } catch (error) {
    console.error('Add reading list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
