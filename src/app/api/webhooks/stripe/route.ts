import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'

export async function POST(req: Request) {
    const stripeSecretKey = await getSetting('payment_stripe_secret_key')
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !endpointSecret) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const stripe = new Stripe(stripeSecretKey)

    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session
                const orderId = session.metadata?.orderId

                if (orderId && session.payment_status === 'paid') {
                    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, paymentMethod: true } })
                    if (!order || order.paymentMethod !== 'STRIPE' || session.currency !== 'mad' || session.amount_total !== Math.round(order.total * 100)) return NextResponse.json({ error: 'Payment mismatch' }, { status: 400 })
                    await prisma.order.updateMany({ where: { id: orderId, status: 'PENDING', isPaid: false }, data: { status: 'CONFIRMED', isPaid: true } })
                }
                break

            // Add other event types as needed
            default:
                void(`Unhandled event type ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook handler error:', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}
