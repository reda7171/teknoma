import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// URL publique du site (remplace en production par ton domaine réel)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Normalise un chemin relatif en URL absolue
function normalizeImage(image: string | null | undefined): string {
  if (!image) return `${SITE_URL}/placeholder-book.png`;
  if (image.startsWith('http')) return image;
  return `${SITE_URL}${image}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '12'));
  const skip = (page - 1) * limit;
  const search = searchParams.get('search')?.trim() || '';
  const category = searchParams.get('category')?.trim() || '';
  const sort = searchParams.get('sort')?.trim() || 'newest';
  const language = searchParams.get('language')?.trim() || '';
  const minPrice = parseFloat(searchParams.get('minPrice') || '');
  const maxPrice = parseFloat(searchParams.get('maxPrice') || '');

  try {
    // Construction de la clause where
    const whereClause: any = { active: true };
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { author: { contains: search } }
      ];
    }
    if (category) {
      whereClause.category = category;
    }
    if (language) {
      whereClause.language = language;
    }
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      whereClause.price = {};
      if (!isNaN(minPrice)) whereClause.price.gte = minPrice;
      if (!isNaN(maxPrice)) whereClause.price.lte = maxPrice;
    }

    // Construction de la clause orderBy
    let orderByClause: any = { createdAt: 'desc' };
    if (sort === 'price_asc') {
      orderByClause = { price: 'asc' };
    } else if (sort === 'price_desc') {
      orderByClause = { price: 'desc' };
    }
    const [books, packs, totalBooks] = await Promise.all([
      prisma.book.findMany({
        where: whereClause,
        select: { id: true, title: true, author: true, price: true, image: true, category: true, description: true, language: true },
        take: limit,
        skip,
        orderBy: orderByClause,
      }),
      // Les packs sont toujours chargés en entier (petite quantité)
      page === 1 ? prisma.pack.findMany({
        where: { active: true },
        select: { id: true, name: true, price: true, image: true, description: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }) : Promise.resolve(null),
      prisma.book.count({ where: whereClause }),
    ]);

    const hasMore = skip + books.length < totalBooks;

    return NextResponse.json({
      success: true,
      books: books.map(b => ({ ...b, image: normalizeImage(b.image), type: 'BOOK' })),
      packs: packs ? packs.map(p => ({ ...p, title: p.name, image: normalizeImage(p.image), type: 'PACK', description: p.description ?? '' })) : undefined,
      pagination: { page, limit, total: totalBooks, hasMore, nextPage: hasMore ? page + 1 : null },
    });
  } catch (error) {
    console.error('Mobile API Error - Catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
