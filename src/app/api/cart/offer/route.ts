import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const sessionId = searchParams.get('sessionId')

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID missing' }, { status: 400 })
        }

        // Trouver la dernière offre en attente et non expirée pour cette session
        const offer = await prisma.instantOffer.findFirst({
            where: {
                sessionId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (offer) {
            return NextResponse.json({ offer }, {
                headers: { 'Cache-Control': 'no-store' }
            })
        }

        return NextResponse.json({ offer: null }, {
            headers: { 'Cache-Control': 'no-store' }
        })
    } catch (error) {
        console.error('Erreur récupération offre:', error)
        // Une offre instantanée est optionnelle : le panier doit continuer à
        // fonctionner si cette table ou la base est momentanément indisponible.
        return NextResponse.json(
            { offer: null, unavailable: true },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { offerId, status } = body

        if (!offerId || !status) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const offer = await prisma.instantOffer.update({
            where: { id: offerId },
            data: { status } // 'ACCEPTED' ou 'REJECTED'
        })

        // Notifier sur Telegram de l'action du client
        try {
            const emoji = status === 'ACCEPTED' ? '✅' : '❌'
            const action = status === 'ACCEPTED' ? 'ACCEPTEE' : 'REFUSEE'
            const actionText = status === 'ACCEPTED' ? 'accepté' : 'refusé'
            
            await sendTelegramMessage(
                `${emoji} <b>Offre ${action}</b>\n\nLe client a <b>${actionText}</b> l'offre de réduction de <b>${offer.discount} Dhs</b>.\n🔑 <b>Session:</b> <code>${offer.sessionId}</code>`
            )
        } catch (tgError) {
            console.error('Erreur notification telegram offre:', tgError)
        }

        return NextResponse.json({ offer })
    } catch (error) {
        console.error('Erreur maj offre:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
