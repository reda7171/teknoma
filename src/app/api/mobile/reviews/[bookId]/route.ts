import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_riwaya_mobile_key_2026';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function normalizeImage(image: string | null | undefined): string {
  if (!image) return `${SITE_URL}/placeholder-book.png`;
  if (image.startsWith('http')) return image;
  return `${SITE_URL}${image}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    // Récupère les avis approuvés du livre
    const reviews = await prisma.review.findMany({
      where: { bookId, isApproved: true },
      select: {
        id: true,
        fullName: true,
        rating: true,
        comment: true,
        city: true,
        customerId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calcule la note moyenne
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      success: true,
      reviews,
      avgRating: Math.round(avg * 10) / 10,
      total: reviews.length,
    });
  } catch (error) {
    console.error('Mobile API Error - Reviews:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const body = await req.json();
    const { fullName, rating, comment } = body;

    let customerId = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        customerId = decoded.id;
      } catch (e) {
        // Token invalide, on l'ignore
      }
    }

    if (!fullName || !rating || !comment) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        bookId,
        fullName,
        rating: Number(rating),
        comment,
        isApproved: true, // Auto-approuvé pour l'instant
        customerId,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Mobile API Error - Post Review:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
