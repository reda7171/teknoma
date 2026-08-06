import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function POST(req: Request) {
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
