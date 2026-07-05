import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

export async function POST(req: Request) {
    try {
        const clientId = await getSetting('payment_paypal_client_id')
        const clientSecret = await getSetting('payment_paypal_client_secret')
        const mode = await getSetting('payment_paypal_mode') || 'sandbox'
        
        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: 'PayPal is not configured' }, { status: 500 })
        }

        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

        const body = await req.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Get PayPal Access Token
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })
        const tokenData = await tokenRes.json()
        
        if (!tokenData.access_token) {
            throw new Error('Failed to get PayPal access token')
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

        // Create PayPal Order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: order.id,
                        amount: {
                            currency_code: 'USD', // Adjust to USD if MAD is not supported, or convert MAD to USD
                            // Note: PayPal may not support MAD natively. You might need to convert MAD to USD/EUR. 
                            // Here we just pass the total, assuming conversion is handled or MAD is supported (it isn't natively).
                            // A proper implementation requires conversion. 
                            value: (order.total / 10).toFixed(2), // Rough conversion for example: 10 MAD = 1 USD
                        },
                        description: `Commande ${order.id}`,
                    },
                ],
                application_context: {
                    return_url: `${origin}/api/checkout/paypal/capture?orderId=${order.id}`,
                    cancel_url: `${origin}/checkout`,
                    user_action: 'PAY_NOW',
                },
            }),
        })

        const orderData = await orderRes.json()

        if (orderData.id) {
            const approveLink = orderData.links.find((link: any) => link.rel === 'approve')
            return NextResponse.json({ url: approveLink.href })
        } else {
            throw new Error(orderData.message || 'Error creating PayPal order')
        }

    } catch (error: any) {
        console.error('PayPal Checkout error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
