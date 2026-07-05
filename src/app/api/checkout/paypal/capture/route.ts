import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get('token')
        const orderId = searchParams.get('orderId')

        if (!token || !orderId) {
            return NextResponse.redirect(new URL('/checkout?error=invalid_paypal_return', req.url))
        }

        const clientId = await getSetting('payment_paypal_client_id')
        const clientSecret = await getSetting('payment_paypal_client_secret')
        const mode = await getSetting('payment_paypal_mode') || 'sandbox'
        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

        // Capture payment
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
        })

        const captureData = await captureRes.json()

        if (captureData.status === 'COMPLETED') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'CONFIRMED' }
            })
            return NextResponse.redirect(new URL(`/checkout/success/${orderId}`, req.url))
        } else {
            console.error('PayPal capture error:', captureData)
            return NextResponse.redirect(new URL('/checkout?error=paypal_capture_failed', req.url))
        }

    } catch (error: any) {
        console.error('PayPal Callback error:', error)
        return NextResponse.redirect(new URL('/checkout?error=internal_error', req.url))
    }
}
