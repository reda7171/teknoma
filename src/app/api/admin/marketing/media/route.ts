import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export const dynamic = 'force-dynamic'

// Récupérer toutes les images du site (blogs, livres, auteurs)
export async function GET(req: NextRequest) {
    try {
        await verifyAdmin()

        const [books, authors, blogPosts] = await Promise.all([
            prisma.book.findMany({
                select: { id: true, title: true, image: true, author: true },
                where: { image: { not: '' } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.authorProfile.findMany({
                select: { id: true, name: true, image: true },
                where: { image: { not: null } },
                orderBy: { createdAt: 'desc' }
            }).catch(() => []),
            prisma.post.findMany({
                select: { id: true, title: true, coverImage: true, slug: true },
                where: { coverImage: { not: null } },
                orderBy: { createdAt: 'desc' }
            }).catch(() => [])
        ])

        return NextResponse.json({
            success: true,
            books: books.filter(b => b.image && b.image.trim()),
            authors: authors.filter((a: any) => a.image && a.image.trim()),
            blogPosts: blogPosts.filter((p: any) => p.coverImage && p.coverImage.trim())
        })
    } catch (err: any) {
        console.error('MEDIA API ERROR:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
