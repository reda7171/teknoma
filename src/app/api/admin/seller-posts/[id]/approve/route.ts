import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

// Approuver un article vendeur
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","BLOG_MODERATOR"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

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
