import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// POST : enregistrer un abonnement push
export async function POST(req: NextRequest) {
    try {
        const { endpoint, keys, userAgent } = await req.json()
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
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
        if (!endpoint) return NextResponse.json({ error: 'Endpoint requis' }, { status: 400 })

        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { startsWith: endpoint.substring(0, 50) } }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
