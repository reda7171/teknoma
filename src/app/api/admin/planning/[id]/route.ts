import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await verifyAdmin()
        await prisma.scheduledPost.delete({
            where: { id: params.id }
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await verifyAdmin()
        const body = await req.json()
        const { time, date, content, platforms, mediaUrl, status } = body
        
        const data: any = {}
        if (time) data.time = time
        if (date) data.date = new Date(date)
        if (content !== undefined) data.content = content
        if (platforms) data.platforms = JSON.stringify(platforms)
        if (mediaUrl !== undefined) data.mediaUrl = mediaUrl
        if (status) data.status = status

        const updatedPost = await prisma.scheduledPost.update({
            where: { id: params.id },
            data
        })
        return NextResponse.json({ success: true, post: updatedPost })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
