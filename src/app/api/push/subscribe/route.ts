import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'

function validEndpoint(value: unknown): value is string {
    if (typeof value !== 'string' || value.length < 60 || value.length > 512) return false
    try {
        const url = new URL(value)
        return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
            (url.hostname === 'fcm.googleapis.com' || url.hostname === 'web.push.apple.com' ||
             url.hostname.endsWith('.push.services.mozilla.com') || url.hostname.endsWith('.notify.windows.com'))
    } catch { return false }
}

// POST : enregistrer un abonnement push
export async function POST(req: NextRequest) {
    try {
        if (!(await rateLimit(`push_${await getIpIdentifier()}`, { limit: 10, windowMs: 60_000 })).success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        const { endpoint, keys, userAgent } = await req.json()
        if (!validEndpoint(endpoint) || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' || keys.p256dh.length > 256 || keys.auth.length > 128) {
            return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
        }

        await prisma.pushSubscription.upsert({
            where: { endpoint: endpoint.substring(0, 512) },
            update: { p256dh: keys.p256dh, auth: keys.auth, userAgent },
            create: {
                id: uuidv4(),
                endpoint: endpoint.substring(0, 512),
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent: userAgent?.substring(0, 500)
            }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[PUSH SUBSCRIBE]', err)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}

// DELETE : désabonner
export async function DELETE(req: NextRequest) {
    try {
        const { endpoint } = await req.json()
        if (!validEndpoint(endpoint)) return NextResponse.json({ error: 'Endpoint invalide' }, { status: 400 })

        await prisma.pushSubscription.deleteMany({
            where: { endpoint }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
