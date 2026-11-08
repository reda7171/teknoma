import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { id } = await params
        const { alt, title, keywords } = await req.json()

        await prisma.book.update({
            where: { id },
            data: { imageAlt: alt || null, imageTitle: title || null, imageKeywords: keywords || null }
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
