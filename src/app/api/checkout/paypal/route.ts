import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { madToUsdCents, paypalClient, paypalOrigin } from '@/lib/paypal'
import { validatePaypalOrder, type PaypalOrder } from '@/lib/paypal-validation'

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null)
        if (typeof body?.orderId !== 'string' || !body.orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }
        const order = await prisma.order.findUnique({ where: { id: body.orderId } })
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        if (order.paymentMethod !== 'PAYPAL' || order.isPaid || !['PENDING', 'CONFIRMED'].includes(order.status)) {
            return NextResponse.json({ error: 'Commande non éligible au paiement PayPal' }, { status: 409 })
        }
        const origin = paypalOrigin(req)
        const client = await paypalClient()
        if (!client.config.enabled) return NextResponse.json({ error: 'PayPal désactivé' }, { status: 403 })
        const key = { orderId: order.id, mode: client.config.mode }
        let payment = await prisma.paypalPayment.findUnique({ where: { orderId_mode: key } })
        if (!payment) {
            const amountUsd = await madToUsdCents(order.total)
            payment = await prisma.paypalPayment.upsert({
                where: { orderId_mode: key }, update: {},
                create: { ...key, amountMad: Math.round(order.total * 100), amountUsd },
            })
        }
        if (payment.amountMad !== Math.round(order.total * 100) || payment.status !== 'CREATED') {
            return NextResponse.json({ error: 'Cette tentative de paiement ne peut plus être utilisée' }, { status: 409 })
        }
        let remote: PaypalOrder
        if (payment.paypalOrderId) {
            remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${payment.paypalOrderId}`)
        } else {
            remote = await client.request<PaypalOrder>('/v2/checkout/orders', {
                requestId: payment.id,
                body: {
                    intent: 'CAPTURE',
                    purchase_units: [{
                        reference_id: order.id, custom_id: payment.id,
                        amount: { currency_code: 'USD', value: (payment.amountUsd / 100).toFixed(2) },
                        description: `Commande ${order.id} - ${order.total.toFixed(2)} MAD`,
                    }],
                    application_context: {
                        return_url: `${origin}/api/checkout/paypal/capture?orderId=${encodeURIComponent(order.id)}`,
                        cancel_url: `${origin}/fr/checkout?error=paypal_cancelled`, user_action: 'PAY_NOW',
                    },
                },
            })
            if (!remote.id) throw new Error('Réponse PayPal invalide')
            payment = await prisma.paypalPayment.update({ where: { id: payment.id }, data: { paypalOrderId: remote.id } })
        }
        validatePaypalOrder(remote, payment)
        const approval = remote.links?.find(link => link.rel === 'approve' || link.rel === 'payer-action')
        if (!approval || !['CREATED', 'PAYER_ACTION_REQUIRED', 'APPROVED'].includes(remote.status)) {
            return NextResponse.json({ error: 'Paiement expiré ou déjà traité. Veuillez contacter le support.' }, { status: 409 })
        }
        const approvalUrl = new URL(approval.href)
        const expectedHost = client.config.mode === 'live' ? 'www.paypal.com' : 'www.sandbox.paypal.com'
        if (approvalUrl.protocol !== 'https:' || approvalUrl.hostname !== expectedHost) throw new Error('Lien PayPal invalide')
        return NextResponse.json({ url: approval.href, amountUsd: (payment.amountUsd / 100).toFixed(2) })
    } catch (error) {
        console.error('PayPal checkout:', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ error: 'Impossible de démarrer PayPal. Veuillez réessayer.' }, { status: 502 })
    }
}
