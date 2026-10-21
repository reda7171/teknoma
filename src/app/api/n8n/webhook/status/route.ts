import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

const ALLOWED_STATUSES = new Set(['PUBLISHED', 'FAILED'])

function isAuthorized(req: NextRequest) {
    const expected = process.env.N8N_WEBHOOK_SECRET || process.env.API_SECRET
    const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!expected || !supplied) return false

    const expectedBuffer = Buffer.from(expected)
    const suppliedBuffer = Buffer.from(supplied)
    return expectedBuffer.length === suppliedBuffer.length
        && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export async function POST(req: NextRequest) {
    try {
        if (!isAuthorized(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { postId, status } = body
        if (typeof postId !== 'string' || !postId || typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ error: 'Invalid postId or status' }, { status: 400 })
        }

        const updatedPost = await prisma.scheduledPost.update({
            where: { id: postId },
            data: { status }
        })

        return NextResponse.json({ success: true, post: updatedPost })
    } catch (error) {
        console.error('N8N status webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
