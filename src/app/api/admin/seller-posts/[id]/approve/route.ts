import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Approuver un article vendeur
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const post = await prisma.post.update({
            where: { id },
            data: { published: true, publishedAt: new Date() }
        })
        return NextResponse.json({ success: true, post })
    } catch (error) {
        console.error('approve seller post:', error)
        return NextResponse.json({ error: 'Erreur' }, { status: 500 })
    }
}
