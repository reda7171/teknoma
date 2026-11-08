import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadCodConversionToGoogleAds } from '@/lib/server/google-ads-conversion'

export const dynamic = 'force-dynamic'

/**
 * Webhook pour la remontée automatique des conversions réelles COD (Livraison & Encaissement).
 * Appelé automatiquement par les transporteurs (Amana, livreurs), le call-center ou n8n.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const secret = req.headers.get('x-webhook-secret') || body.secret

        const expectedSecret = process.env.GOOGLE_ADS_WEBHOOK_SECRET || process.env.CRON_SECRET || process.env.API_SECRET

        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Non autorisé: secret invalide' }, { status: 401 })
        }

        const orderId = body.orderId || body.order_id
        const trackingId = body.trackingId || body.tracking_id
        const status = (body.status || 'DELIVERED').toUpperCase()

        if (!orderId && !trackingId) {
            return NextResponse.json({ error: 'orderId ou trackingId requis' }, { status: 400 })
        }

        // Trouver la commande
        const order = await prisma.order.findFirst({
            where: orderId ? { id: orderId } : { trackingID: trackingId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
        }

        // Si la commande n'est pas encore marquée DELIVERED, mettre à jour son statut
        if (order.status !== 'DELIVERED' && status === 'DELIVERED') {
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'DELIVERED',
                    isPaid: true,
                    paidAmount: order.total,
                }
            })
        }

        // Déclencher la remontée Google Ads
        const conversionResult = await uploadCodConversionToGoogleAds(order.id)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            total: order.total,
            conversion: conversionResult
        })
    } catch (err: any) {
        console.error('Error in Google Ads conversion webhook:', err)
        return NextResponse.json({ error: err?.message || 'Erreur interne' }, { status: 500 })
    }
}
