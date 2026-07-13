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

        // Background-first n8n publish using Promise.all
        // We use the host to build the absolute URL to hit our own /api/n8n/publish
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        const cookie = req.headers.get('cookie') || '';

        // Execute and AWAIT the result so Next.js Serverless doesn't terminate the promise
        await Promise.all(platforms.map((platform: string) => 
            fetch(`${baseUrl}/api/n8n/publish`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cookie': cookie // Pass the auth cookie
                },
                body: JSON.stringify({
                    customImageUrl: mediaUrl || '',
                    customCaption: content,
                    platform: platform,
                    format: 'post',
                    scheduleAt: new Date(date).toISOString(),
                    postId: post.id
                })
            }).catch(e => console.error(`[Planning API] Error triggering n8n for ${platform}:`, e))
        )).catch(console.error);

        return NextResponse.json({ success: true, post })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
