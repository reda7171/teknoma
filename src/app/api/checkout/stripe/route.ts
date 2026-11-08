import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { canReadOrder } from '@/lib/order-access'
import { getTrustedAppOrigin } from '@/lib/oauth-security'
import { getSetting } from '@/lib/server/site-settings'

export async function POST(req: Request) {
    try {
        const stripeSecretKey = await getSetting('payment_stripe_secret_key')

        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
        }

        const stripe = new Stripe(stripeSecretKey)

        const body = await req.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        book: true,
                        pack: true,
                        gift: true,
                        digitalProduct: true,
                        extraProduct: true
                    }
                }
            }
        })

        if (!order || !(await canReadOrder(order, req))) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.paymentMethod !== 'STRIPE' || order.isPaid || ['CANCELLED', 'RETURNED'].includes(order.status)) return NextResponse.json({ error: 'Paiement indisponible' }, { status: 409 })
        const origin = getTrustedAppOrigin(req)

        const lineItems = [{ price_data: { currency: 'mad', product_data: { name: 'Commande Riwaya' }, unit_amount: Math.round(order.total * 100) }, quantity: 1 }]

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,

            mode: 'payment',
            success_url: `${origin}/checkout/success/${order.id}`,
            cancel_url: `${origin}/checkout`,
            client_reference_id: order.id,
            customer_email: order.email || undefined,
            metadata: {
                orderId: order.id,
            }
        })

        return NextResponse.json({ url: session.url })
    } catch (error: any) {
        console.error('Stripe Checkout error:', error)
        return NextResponse.json({ error: 'Paiement indisponible' }, { status: 500 })
    }
}
