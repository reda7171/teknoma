import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

export async function POST(req: Request) {
    const stripeSecretKey = await getSetting('payment_stripe_secret_key')
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-01-27.acacia'
    })

    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    let event: Stripe.Event

    try {
        if (!endpointSecret) {
            // Si pas de secret webhook configuré, on parse juste l'événement non vérifié (à éviter en prod)
            event = JSON.parse(body) as Stripe.Event
        } else {
            event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
        }
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

                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'CONFIRMED', // ou 'PAID' selon la logique métier
                        }
                    })
                    console.log(`Order ${orderId} marked as CONFIRMED via Stripe webhook.`)
                }
                break
            
            // Add other event types as needed
            default:
                console.log(`Unhandled event type ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook handler error:', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}
