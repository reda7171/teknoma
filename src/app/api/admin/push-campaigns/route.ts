import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { sendPushNotification } from '@/lib/web-push'
import { v4 as uuidv4 } from 'uuid'

// GET : lister les campagnes
export async function GET() {
    try {
        await verifyAdmin()
        const campaigns = await prisma.pushCampaign.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        })
        const subscriberCount = await prisma.pushSubscription.count()
        return NextResponse.json({ campaigns, subscriberCount })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST : créer et envoyer une campagne
export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()
        const { title, body, url, icon } = await req.json()

        if (!title || !body) {
            return NextResponse.json({ error: 'Titre et message requis' }, { status: 400 })
        }

        // Créer la campagne
        const campaign = await prisma.pushCampaign.create({
            data: {
                id: uuidv4(),
                title,
                body,
                url: url || null,
                icon: icon || '/icons/icon-192x192.png',
                status: 'SENDING'
            }
        })

        // Récupérer tous les abonnés
        const subscriptions = await prisma.pushSubscription.findMany()
        let sent = 0
        const toDelete: string[] = []

        // Envoyer en batch
        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                sendPushNotification(
                    { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                    { title, body, url: url || '/', icon: icon || '/icons/icon-192x192.png' }
                )
            )
        )

        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    sent++
                } else if (result.value.expired) {
                    // Marquer pour suppression
                    toDelete.push(subscriptions[i].id)
                }
            }
        })

        // Supprimer les abonnements expirés
        if (toDelete.length > 0) {
            await prisma.pushSubscription.deleteMany({
                where: { id: { in: toDelete } }
            })
        }

        // Mettre à jour la campagne
        await prisma.pushCampaign.update({
            where: { id: campaign.id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
                totalSent: sent
            }
        })

        return NextResponse.json({ success: true, sent, expired: toDelete.length })
    } catch (err: any) {
        console.error('[PUSH CAMPAIGN]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
