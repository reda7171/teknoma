import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function normalizeImage(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${SITE_URL}${image}`;
}

export async function GET(request: Request, context: { params: { slug: string } }) {
  const { slug } = await context.params;

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: { fullName: true, image: true }
        }
      }
    });

    if (!post || !post.published) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Incrémenter le nombre de vues
    await prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } }
    });

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        coverImage: normalizeImage(post.coverImage),
        author: post.author ? {
          ...post.author,
          image: normalizeImage(post.author.image)
        } : null
      }
    });
  } catch (error) {
    console.error('Mobile API Error - Blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}
