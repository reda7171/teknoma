import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { confirmPaypalPayment, paypalClient, paypalOrigin } from '@/lib/paypal'
import { validatePaypalOrder, type PaypalOrder } from '@/lib/paypal-validation'

export async function GET(req: Request) {
    const origin = paypalOrigin(req)
    const failure = () => NextResponse.redirect(new URL('/fr/checkout?error=paypal_capture_failed', origin))
    try {
        const params = new URL(req.url).searchParams
        const token = params.get('token')
        const orderId = params.get('orderId')
        if (!token || !/^[A-Z0-9]{1,32}$/.test(token) || !orderId) return failure()
        const payment = await prisma.paypalPayment.findUnique({ where: { paypalOrderId: token }, include: { order: true } })
        if (!payment || payment.orderId !== orderId) return failure()
        const order = payment.order
        if (order.paymentMethod !== 'PAYPAL' || Math.round(order.total * 100) !== payment.amountMad ||
            ['CANCELLED', 'RETURNED'].includes(order.status) || payment.status === 'REFUNDED') return failure()
        const client = await paypalClient()
        if (payment.mode !== client.config.mode) return failure()
        let remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${token}`)
        // Check association and frozen amount BEFORE attempting a capture.
        validatePaypalOrder(remote, payment)
        if (remote.status !== 'COMPLETED') {
            if (order.isPaid || remote.status !== 'APPROVED') return failure()
            remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${token}/capture`, {
                body: {}, requestId: `capture-${payment.id}`,
            })
        }
        await confirmPaypalPayment(remote, client.config.mode)
        return NextResponse.redirect(new URL(`/fr/checkout/success/${encodeURIComponent(orderId)}`, origin))
    } catch (error) {
        console.error('PayPal capture:', error instanceof Error ? error.message : 'Unknown error')
        return failure()
    }
}
