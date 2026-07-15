import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://192.168.60.171:3000';

function normalizeImage(image: string | null | undefined): string {
  if (!image) return `${SITE_URL}/placeholder-book.png`;
  if (image.startsWith('http')) return image;
  return `${SITE_URL}${image}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { bookId: string } }
) {
  const { bookId } = params;

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
  { params }: { params: { bookId: string } }
) {
  const { bookId } = params;

  try {
    const body = await req.json();
    const { fullName, rating, comment } = body;

    if (!fullName || !rating || !comment) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        bookId,
        fullName,
        rating: Number(rating),
        comment,
        isApproved: true, // Auto-approuvé pour l'instant (décision du plan d'implémentation)
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Mobile API Error - Post Review:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
