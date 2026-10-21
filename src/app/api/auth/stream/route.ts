import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const APPROVAL_TTL_MS = 10 * 60 * 1000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
    const requestId = req.nextUrl.searchParams.get('requestId')
    if (!requestId || !UUID_PATTERN.test(requestId)) {
        return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 })
    }

    const authRequest = await prisma.adminAuthRequest.findUnique({
        where: { id: requestId },
        select: { createdAt: true, status: true }
    })
    if (!authRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const expiresAt = authRequest.createdAt.getTime() + APPROVAL_TTL_MS
    if (Date.now() >= expiresAt) {
        return NextResponse.json({ error: 'Request expired' }, { status: 410 })
    }

    const stream = new ReadableStream({
        start(controller) {
            let closed = false
            const encoder = new TextEncoder()
            const timers: {
                poll?: ReturnType<typeof setInterval>
                keepAlive?: ReturnType<typeof setInterval>
                expiry?: ReturnType<typeof setTimeout>
            } = {}

            const cleanup = () => {
                if (closed) return
                closed = true
                if (timers.poll) clearInterval(timers.poll)
                if (timers.keepAlive) clearInterval(timers.keepAlive)
                if (timers.expiry) clearTimeout(timers.expiry)
                try { controller.close() } catch { /* already closed */ }
            }

            const push = (data: { status: string }) => {
                if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            timers.poll = setInterval(async () => {
                if (closed) return
                try {
                    const current = await prisma.adminAuthRequest.findUnique({
                        where: { id: requestId },
                        select: { status: true }
                    })
                    if (!current) return cleanup()
                    push({ status: current.status })
                    if (current.status !== 'PENDING') cleanup()
                } catch (error) {
                    console.error('Admin approval stream error:', error)
                    cleanup()
                }
            }, 2000)

            timers.keepAlive = setInterval(() => {
                if (!closed) controller.enqueue(encoder.encode(': keepalive\n\n'))
            }, 15000)
            timers.expiry = setTimeout(cleanup, Math.max(1, expiresAt - Date.now()))
            req.signal.addEventListener('abort', cleanup, { once: true })

            push({ status: authRequest.status })
            if (authRequest.status !== 'PENDING') cleanup()
        }
    })

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'private, no-store, no-transform',
            'Connection': 'keep-alive',
            'X-Content-Type-Options': 'nosniff'
        }
    })
}
