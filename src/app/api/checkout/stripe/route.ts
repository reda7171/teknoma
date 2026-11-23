import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

export async function POST(req: Request) {
    try {
        const stripeSecretKey = await getSetting('payment_stripe_secret_key')

        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-01-27.acacia' // Use a recent valid API version or an older one like 2023-10-16
        })

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

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://tekno.ma'

        // Prepare line items
        const lineItems = order.items.map(item => {
            let name = 'Produit inconnu'
            let images = []

            if (item.type === 'BOOK' && item.book) {
                name = item.book.title
                if (item.book.image) images.push(`${origin}${item.book.image}`)
            } else if (item.type === 'PACK' && item.pack) {
                name = item.pack.name
                if (item.pack.image) images.push(`${origin}${item.pack.image}`)
            } else if (item.type === 'DIGITAL' && item.digitalProduct) {
                name = item.digitalProduct.title
            } else if (item.type === 'ACCESSORY' && item.extraProduct) {
                name = item.extraProduct.name
                if (item.extraProduct.image) images.push(`${origin}${item.extraProduct.image}`)
            } else if (item.type === 'GIFT' && item.gift) {
                name = `[Cadeau] ${item.gift.name}`
                if (item.gift.image) images.push(`${origin}${item.gift.image}`)
            }

            return {
                price_data: {
                    currency: 'mad',
                    product_data: {
                        name: name,
                        images: images.length > 0 ? images : undefined,
                    },
                    // Stripe expects amounts in cents, so MAD -> centimes (x100)
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            }
        })

        // Add shipping fee if applicable
        if (order.shippingFees > 0) {
            lineItems.push({
                price_data: {
                    currency: 'mad',
                    product_data: {
                        name: 'Frais de livraison',
                    },
                    unit_amount: Math.round(order.shippingFees * 100),
                },
                quantity: 1,
            })
        }

        // Handle discount
        // Stripe doesn't allow negative line items. We need to create a Coupon on the fly or just use Stripe discounts.
        // For simplicity, if there is a discount, we create a coupon and attach it to the session.
        let discountParam = {}
        if (order.discount > 0) {
            const stripeCoupon = await stripe.coupons.create({
                amount_off: Math.round(order.discount * 100),
                currency: 'mad',
                duration: 'once',
                name: order.couponCode ? `Code promo: ${order.couponCode}` : 'Réduction',
            })
            discountParam = { discounts: [{ coupon: stripeCoupon.id }] }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            ...discountParam,
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
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
