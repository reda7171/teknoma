import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        // Authenticate webhook (very basic token check)
        const token = req.headers.get('authorization')
        if (process.env.N8N_WEBHOOK_SECRET && token !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { postId, status } = body
        // status should be 'PUBLISHED' or 'FAILED'

        if (!postId || !status) {
            return NextResponse.json({ error: 'Missing postId or status' }, { status: 400 })
        }

        const updatedPost = await prisma.scheduledPost.update({
            where: { id: postId },
            data: { status }
        })

        return NextResponse.json({ success: true, post: updatedPost })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
