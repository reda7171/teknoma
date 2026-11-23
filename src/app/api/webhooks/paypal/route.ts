import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { confirmPaypalPayment, paypalClient, syncPaypalRefund } from '@/lib/paypal'
import type { PaypalOrder } from '@/lib/paypal-validation'

export async function POST(req: Request) {
    let event
    try { event = await req.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const headers = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']
    if (headers.some(header => !req.headers.get(header))) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    try {
        const client = await paypalClient()
        if (!client.config.webhookId) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
        const verification = await client.request<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', {
            body: {
                auth_algo: req.headers.get('paypal-auth-algo'), cert_url: req.headers.get('paypal-cert-url'),
                transmission_id: req.headers.get('paypal-transmission-id'), transmission_sig: req.headers.get('paypal-transmission-sig'),
                transmission_time: req.headers.get('paypal-transmission-time'), webhook_id: client.config.webhookId,
                webhook_event: event,
            },
        })
        if (verification.verification_status !== 'SUCCESS') return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id
            if (typeof paypalOrderId !== 'string' || !/^[A-Z0-9]{1,32}$/.test(paypalOrderId)) {
                return NextResponse.json({ error: 'Missing PayPal order reference' }, { status: 400 })
            }
            const payment = await prisma.paypalPayment.findUnique({ where: { paypalOrderId } })
            // Other integrations sharing this PayPal app are outside this checkout.
            if (payment && payment.mode === client.config.mode && payment.status !== 'REFUNDED') {
                const remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${paypalOrderId}`)
                const refunded = remote.purchase_units?.[0].payments?.captures?.find(capture => capture.status === 'REFUNDED')
                if (refunded) await syncPaypalRefund(client, refunded.id)
                else await confirmPaypalPayment(remote, client.config.mode)
            }
        } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
            // PayPal's refund resource exposes the original capture via its 'up' link.
            const up = event.resource?.links?.find((link: { rel: string }) => link.rel === 'up')?.href
            const match = typeof up === 'string' ? new URL(up).pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]{1,32})$/) : null
            const captureId = event.resource?.supplementary_data?.related_ids?.capture_id || match?.[1]
            if (typeof captureId === 'string' && /^[A-Z0-9]{1,32}$/.test(captureId)) {
                await syncPaypalRefund(client, captureId)
            }
        }
        // Denials do not cancel a merchant order: the buyer may retry another payment.
        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('PayPal webhook:', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ error: 'Webhook processing failed; retry required' }, { status: 500 })
    }
}
