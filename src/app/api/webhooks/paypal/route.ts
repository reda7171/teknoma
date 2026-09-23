import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

// Vérifie la signature PayPal via leur API de vérification
async function verifyPaypalWebhook(req: Request, body: string): Promise<boolean> {
    const clientId = await getSetting('payment_paypal_client_id')
    const clientSecret = await getSetting('payment_paypal_client_secret')
    const mode = await getSetting('payment_paypal_mode') || 'sandbox'

    if (!clientId || !clientSecret) return false

    const baseUrl = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

    // Obtenir le token d'accès
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })

    if (!tokenRes.ok) return false
    const { access_token } = await tokenRes.json()

    // Vérifier la signature via l'API PayPal
    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            auth_algo: req.headers.get('paypal-auth-algo'),
            cert_url: req.headers.get('paypal-cert-url'),
            transmission_id: req.headers.get('paypal-transmission-id'),
            transmission_sig: req.headers.get('paypal-transmission-sig'),
            transmission_time: req.headers.get('paypal-transmission-time'),
            webhook_id: process.env.PAYPAL_WEBHOOK_ID,
            webhook_event: JSON.parse(body),
        }),
    })

    if (!verifyRes.ok) return false
    const { verification_status } = await verifyRes.json()
    return verification_status === 'SUCCESS'
}

export async function POST(req: Request) {
    const body = await req.text()

    // Vérification de signature (si PAYPAL_WEBHOOK_ID est configuré)
    if (process.env.PAYPAL_WEBHOOK_ID) {
        const isValid = await verifyPaypalWebhook(req, body)
        if (!isValid) {
            console.error('PayPal webhook signature verification failed')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }
    }

    let event: any
    try {
        event = JSON.parse(body)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    try {
        const eventType = event.event_type

        switch (eventType) {
            // Paiement complété
            case 'PAYMENT.CAPTURE.COMPLETED': {
                const orderId = event.resource?.custom_id || event.resource?.invoice_id
                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { status: 'CONFIRMED' },
                    })
                    void(`Order ${orderId} marked as CONFIRMED via PayPal webhook.`)
                }
                break
            }

            // Paiement refusé
            case 'PAYMENT.CAPTURE.DENIED': {
                const orderId = event.resource?.custom_id || event.resource?.invoice_id
                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { status: 'CANCELLED' },
                    })
                    void(`Order ${orderId} marked as CANCELLED via PayPal webhook.`)
                }
                break
            }

            // Remboursement effectué
            case 'PAYMENT.CAPTURE.REFUNDED': {
                const orderId = event.resource?.custom_id || event.resource?.invoice_id
                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { status: 'REFUNDED' },
                    })
                    void(`Order ${orderId} marked as REFUNDED via PayPal webhook.`)
                }
                break
            }

            default:
                void(`Unhandled PayPal event type: ${eventType}`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('PayPal webhook handler error:', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}
