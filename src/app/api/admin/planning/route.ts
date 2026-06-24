import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin()
        const posts = await prisma.scheduledPost.findMany({
            orderBy: { date: 'asc' }
        })
        return NextResponse.json({ success: true, posts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()
        const body = await req.json()
        const { date, time, content, platforms, mediaUrl } = body

        const post = await prisma.scheduledPost.create({
            data: {
                date: new Date(date),
                time,
                content,
                platforms: JSON.stringify(platforms),
                mediaUrl
            }
        })

        return NextResponse.json({ success: true, post })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
