import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function normalizeImage(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${SITE_URL}${image}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '10'));
  const skip = (page - 1) * limit;

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          createdAt: true,
          authorName: true,
          viewCount: true,
          category: true,
          totalReadTime: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { published: true } }),
    ]);

    const hasMore = skip + posts.length < total;

    return NextResponse.json({
      success: true,
      posts: posts.map(p => ({
        ...p,
        coverImage: normalizeImage(p.coverImage)
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
      }
    });
  } catch (error) {
    console.error('Mobile API Error - Blog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
