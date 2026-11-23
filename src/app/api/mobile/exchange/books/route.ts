import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

// Middleware manuel pour vérifier le token
async function getCustomerId(req: Request) { return (await getMobileCustomer(req))?.id || null }

// GET: Liste des livres disponibles à l'échange
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');

    const where: any = {
      status: 'AVAILABLE',
    };

    if (city) {
      where.owner = { city };
    }

    const books = await prisma.exchangeBook.findMany({
      where,
      include: {
        owner: {
          select: { fullName: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching exchange books:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Ajouter un livre pour l'échange
export async function POST(req: Request) {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { title, author, condition, description, image, exchangeType, latitude, longitude, isbn, language } = body;

    if (!title || !author) {
      return NextResponse.json({ error: 'Titre et auteur requis' }, { status: 400 });
    }

    const book = await prisma.exchangeBook.create({
      data: {
        ownerId: customerId,
        title: title.trim(),
        author: author.trim(),
        isbn: isbn ? isbn.trim() : null,
        condition: condition || 'GOOD',
        description: description ? description.trim() : null,
        image: image || null,
        language: language || 'fr',
        exchangeType: exchangeType || 'DIRECT',
        status: 'AVAILABLE',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    // Déclencher les alertes automatiques wishlist (Email, WhatsApp, Push)
    import('@/lib/community-wishlist-alerts')
      .then(m => m.notifyWishlistUsersOnNewBook(book.id))
      .catch(err => console.error('[WishlistAlerts] Mobile background trigger error:', err));

    return NextResponse.json({ message: 'Livre ajouté avec succès', book });
  } catch (error) {
    console.error('Error adding exchange book:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
