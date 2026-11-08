import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","BLOG_MODERATOR"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { edits } = await req.json()
        for (const [id, data] of Object.entries(edits) as [string, any][]) {
            await (prisma as any).post.update({
                where: { id },
                data: { imageAlt: data.alt, imageTitle: data.title }
            })
        }
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
