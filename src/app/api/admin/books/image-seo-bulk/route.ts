import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

// Bulk update alt/title pour tous les livres
export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { edits } = await req.json() as { edits: Record<string, { alt: string; title: string; keywords: string }> }

        await prisma.$transaction(
            Object.entries(edits).map(([id, { alt, title, keywords }]) =>
                prisma.book.update({
                    where: { id },
                    data: { imageAlt: alt || null, imageTitle: title || null, imageKeywords: keywords || null }
                })
            )
        )

        return NextResponse.json({ success: true, count: Object.keys(edits).length })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
