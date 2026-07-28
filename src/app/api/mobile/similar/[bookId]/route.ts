import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    // Récupère la catégorie du livre actuel
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { category: true },
    });

    if (!book) {
      return NextResponse.json({ success: true, books: [] });
    }

    // Cherche des livres de la même catégorie, en excluant le livre actuel
    const similar = await prisma.book.findMany({
      where: {
        active: true,
        id: { not: bookId },
        category: book.category ?? undefined,
      },
      select: {
        id: true,
        title: true,
        author: true,
        price: true,
        image: true,
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      books: similar.map(b => ({ ...b, image: normalizeImage(b.image), type: 'BOOK' })),
    });
  } catch (error) {
    console.error('Mobile API Error - Similar:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
