import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { madToUsdCents, paypalClient, paypalOrigin } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'
import type { PaypalOrder } from '@/lib/paypal-validation'

interface Webhook { id: string; url: string; event_types: { name: string }[] }
const events = ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED']

export async function POST(req: Request) {
    const admin = await getAuthenticatedAdmin()
    if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    // This admin operation uses the saved configuration, never client-supplied secrets.
    if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error: 'Origine invalide' }, { status: 403 })
    try {
        const body = await req.json().catch(() => ({}))
        const client = await paypalClient()
        const origin = paypalOrigin(req)
        const url = `${origin}/api/webhooks/paypal`
        const publicUrl = new URL(origin).protocol === 'https:' &&
            !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)
        const registered = await client.request<{ webhooks: Webhook[] }>('/v1/notifications/webhooks')
        let webhook = registered.webhooks?.find(item => item.url === url)
        if (body.action === 'register') {
            if (!publicUrl) return NextResponse.json({ error: 'Le webhook nécessite une URL HTTPS publique. Localhost ne peut pas recevoir les notifications PayPal.' }, { status: 400 })
            if (!webhook) webhook = await client.request<Webhook>('/v1/notifications/webhooks', {
                body: { url, event_types: events.map(name => ({ name })) },
            })
            if (!events.every(name => webhook!.event_types.some(event => event.name === name || event.name === '*'))) {
                throw new Error('Le webhook existant ne couvre pas les événements requis. Mettez-le à jour dans PayPal.')
            }
            await prisma.siteSettings.upsert({
                where: { key: `payment_paypal_webhook_id_${client.config.mode}` },
                create: { key: `payment_paypal_webhook_id_${client.config.mode}`, value: webhook.id, category: 'config' },
                update: { value: webhook.id },
            })
        }
        const amountUsd = await madToUsdCents(100)
        let sandboxOrderCreated = false
        if (client.config.mode === 'sandbox') {
            const order = await client.request<PaypalOrder>('/v2/checkout/orders', {
                requestId: crypto.randomUUID(),
                body: { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: (amountUsd / 100).toFixed(2) }, description: 'Diagnostic Sandbox Tekno Store - aucun débit' }] },
            })
            sandboxOrderCreated = order.status === 'CREATED' && !!order.links?.some(link => link.rel === 'approve' || link.rel === 'payer-action')
            if (!sandboxOrderCreated) throw new Error('La création de paiement Sandbox a échoué')
        }
        const webhookReady = !!webhook && (body.action === 'register' || webhook.id === client.config.webhookId) &&
            events.every(name => webhook!.event_types.some(event => event.name === name || event.name === '*'))
        return NextResponse.json({
            mode: client.config.mode, authenticated: true, sandboxOrderCreated,
            usdFor100Mad: (amountUsd / 100).toFixed(2), webhookReady,
            canRegisterWebhook: publicUrl,
            message: `Authentification valide${sandboxOrderCreated ? ', création Sandbox réussie' : ''}. Aucun débit effectué. ` +
                (webhookReady ? 'Webhook configuré.' : publicUrl ? 'Webhook à connecter après déploiement du code.' : 'Webhook indisponible sur localhost : une URL HTTPS publique est nécessaire.'),
        })
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Test PayPal impossible' }, { status: 502 })
    }
}
