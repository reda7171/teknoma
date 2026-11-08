import { getMobileCustomer } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/jwt-secret';

export async function GET(req: Request) {
    const mobileCustomer = await getMobileCustomer(req)
    if (!mobileCustomer) return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        city: true,
        credits: true,
        image: true,
        ratingsReceived: {
          select: { rating: true }
        },
        _count: {
          select: {
            reading_list: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    const reviewsCount = customer.ratingsReceived.length;
    const averageRating = reviewsCount > 0
      ? customer.ratingsReceived.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviewsCount
      : 5.0; // Default rating 5.0

    const { ratingsReceived, _count, ...customerData } = customer;

    // Logique de gamification
    const booksRead = _count.reading_list;
    let level = 1;
    let title = '🌱 Lecteur Débutant';
    let nextLevelThreshold = 3;
    let progress = (booksRead / nextLevelThreshold) * 100;

    if (booksRead >= 50) {
      level = 5;
      title = '👑 Maître des Mots';
      nextLevelThreshold = booksRead; // Max level
      progress = 100;
    } else if (booksRead >= 25) {
      level = 4;
      title = '🧠 Érudit';
      nextLevelThreshold = 50;
      progress = ((booksRead - 25) / (50 - 25)) * 100;
    } else if (booksRead >= 10) {
      level = 3;
      title = '❤️ Passionné de Lecture';
      nextLevelThreshold = 25;
      progress = ((booksRead - 10) / (25 - 10)) * 100;
    } else if (booksRead >= 3) {
      level = 2;
      title = '🧭 Explorateur Littéraire';
      nextLevelThreshold = 10;
      progress = ((booksRead - 3) / (10 - 3)) * 100;
    }

    return NextResponse.json({
      customer: {
        ...customerData,
        averageRating,
        reviewsCount,
        gamification: {
          level,
          title,
          booksRead,
          nextLevelThreshold,
          progress: Math.min(100, Math.max(0, progress))
        }
      }
    });
  } catch (error) {
    console.error('Error in /api/mobile/auth/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
    const mobileCustomer = await getMobileCustomer(req)
    if (!mobileCustomer) return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await req.json();
    const { image, fullName, phone, city } = body;

    const dataToUpdate: any = {};
    if (image !== undefined) dataToUpdate.image = image;
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (city !== undefined) dataToUpdate.city = city;

    const updatedCustomer = await prisma.customer.update({
      where: { id: decoded.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        city: true,
        credits: true,
        image: true,
      }
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error('Error in PUT /api/mobile/auth/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
