import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Webhook Facebook / Instagram
 * Sert à la vérification par Meta et à la réception des notifications
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN
    if (!verifyToken || !mode || !token || mode !== 'subscribe') {
        return new Response('Forbidden', { status: 403 })
    }

    const expectedBuffer = Buffer.from(verifyToken)
    const suppliedBuffer = Buffer.from(token)
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
        return new Response('Forbidden', { status: 403 })
    }

    // Meta attend impérativement le challenge en texte brut (text/plain)
    return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    })
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()
        const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET

        if (appSecret) {
            const signature = req.headers.get('x-hub-signature-256')
            if (!signature || !signature.startsWith('sha256=')) {
                return NextResponse.json({ error: 'Missing or invalid signature' }, { status: 401 })
            }

            const hash = createHmac('sha256', appSecret).update(rawBody).digest('hex')
            const expectedSignature = `sha256=${hash}`
            const expectedBuffer = Buffer.from(expectedSignature)
            const suppliedBuffer = Buffer.from(signature)

            if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
            }
        }

        const body = JSON.parse(rawBody || '{}')
        void body

        return NextResponse.json({ status: 'received' })
    } catch (error) {
        console.error('[FB WEBHOOK] Error processing event:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
