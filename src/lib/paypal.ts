import { prisma } from '@/lib/prisma'
import { usdCents, validatePaypalOrder, type PaypalOrder } from '@/lib/paypal-validation'

export async function getPaypalConfig() {
    const rows = await prisma.siteSettings.findMany({ where: { key: { startsWith: 'payment_paypal_' } } })
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]))
    const mode = settings.payment_paypal_mode || 'sandbox'
    if (mode !== 'sandbox' && mode !== 'live') throw new Error('Mode PayPal invalide')
    const clientId = settings.payment_paypal_client_id?.trim()
    const secret = settings.payment_paypal_client_secret?.trim()
    if (!clientId || !secret) throw new Error('PayPal non configuré')
    return {
        mode, clientId, secret, enabled: settings.payment_paypal_enabled === 'true',
        baseUrl: mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
        webhookId: settings[`payment_paypal_webhook_id_${mode}`] || process.env.PAYPAL_WEBHOOK_ID,
    }
}

export async function paypalClient() {
    const config = await getPaypalConfig()
    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(20000),
        headers: {
            Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    })
    const token = await response.json()
    if (!response.ok || !token.access_token) throw new Error(`Authentification PayPal refusée (${response.status})`)
    return {
        config,
        async request<T>(path: string, options: { body?: unknown; requestId?: string } = {}): Promise<T> {
            const res = await fetch(`${config.baseUrl}${path}`, {
                method: options.body === undefined ? 'GET' : 'POST', cache: 'no-store',
                signal: AbortSignal.timeout(25000),
                headers: {
                    Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json',
                    ...(options.requestId ? { 'PayPal-Request-Id': options.requestId } : {}),
                    Prefer: 'return=representation',
                },
                ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
            })
            const data = await res.json()
            if (!res.ok) {
                console.error('PayPal API', { status: res.status, name: data.name, debugId: data.debug_id })
                throw new Error(`Erreur PayPal (${res.status})`)
            }
            return data as T
        },
    }
}

export function paypalOrigin(req: Request) {
    // Never trust an Origin header for payment return URLs.
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || req.url)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(local && process.env.NODE_ENV !== 'production')) {
        throw new Error('Une URL HTTPS publique est requise pour PayPal')
    }
    return url.origin
}

export async function madToUsdCents(total: number) {
    if (!Number.isFinite(total) || total <= 0) throw new Error('Total de commande invalide')
    const res = await fetch('https://open.er-api.com/v6/latest/MAD', {
        next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error('Conversion MAD/USD indisponible')
    const data = await res.json()
    const rate = data.rates?.USD
    const age = Date.now() / 1000 - Number(data.time_last_update_unix)
    if (data.result !== 'success' || data.base_code !== 'MAD' || typeof rate !== 'number' ||
        !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(age) || age < -3600 || age > 48 * 3600) {
        throw new Error('Taux MAD/USD indisponible ou périmé')
    }
    const cents = Math.round(total * rate * 100)
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Montant converti invalide')
    return cents
}

export async function confirmPaypalPayment(remote: PaypalOrder, mode: string) {
    const payment = await prisma.paypalPayment.findUnique({ where: { paypalOrderId: remote.id } })
    if (!payment || payment.mode !== mode) throw new Error('Paiement PayPal inconnu')
    const captureId = validatePaypalOrder(remote, payment, true)!
    await prisma.$transaction(async tx => {
        const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })
        const currentPayment = await tx.paypalPayment.findUniqueOrThrow({ where: { id: payment.id } })
        if (order.paymentMethod !== 'PAYPAL' || Math.round(order.total * 100) !== payment.amountMad) {
            throw new Error('La commande a été modifiée depuis le début du paiement')
        }
        if (currentPayment.status === 'REFUNDED') throw new Error('Paiement déjà remboursé')
        if (order.isPaid) {
            if (currentPayment.captureId !== captureId || currentPayment.status !== 'COMPLETED') throw new Error('Commande déjà réglée')
            return
        }
        if (['CANCELLED', 'RETURNED'].includes(order.status)) throw new Error('Commande annulée ou retournée')
        const updated = await tx.order.updateMany({
            where: { id: order.id, isPaid: false, status: order.status, total: order.total, paymentMethod: 'PAYPAL' },
            data: { isPaid: true, paidAmount: order.total, remainingAmount: 0,
                ...(order.status === 'PENDING' ? { status: 'CONFIRMED' } : {}) },
        })
        if (updated.count !== 1) throw new Error('La commande a changé pendant la confirmation')
        await tx.paypalPayment.update({ where: { id: payment.id }, data: { captureId, status: 'COMPLETED' } })
    })
    return payment.orderId
}

export async function syncPaypalRefund(client: Awaited<ReturnType<typeof paypalClient>>, captureId: string) {
    const capture = await client.request<{
        id: string; status: string; amount: { currency_code: string; value: string }
        supplementary_data?: { related_ids?: { order_id?: string } }
    }>(`/v2/payments/captures/${captureId}`)
    if (capture.id !== captureId || capture.status !== 'REFUNDED') return
    const paypalOrderId = capture.supplementary_data?.related_ids?.order_id
    // A refund may arrive before the completion webhook or browser return.
    const payment = await prisma.paypalPayment.findFirst({ where: {
        mode: client.config.mode,
        OR: [{ captureId }, ...(paypalOrderId ? [{ paypalOrderId }] : [])],
    } })
    if (!payment?.paypalOrderId || usdCents(capture.amount) !== payment.amountUsd) return
    const remote = await client.request<PaypalOrder>(`/v2/checkout/orders/${payment.paypalOrderId}`)
    validatePaypalOrder(remote, payment)
    if (!remote.purchase_units?.[0].payments?.captures?.some(item => item.id === captureId && item.status === 'REFUNDED')) {
        throw new Error('Remboursement non associé à cette commande')
    }
    await prisma.$transaction(async tx => {
        const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })
        if (order.paymentMethod !== 'PAYPAL' || Math.round(order.total * 100) !== payment.amountMad) {
            throw new Error('Commande modifiée avant rapprochement du remboursement')
        }
        const changed = await tx.paypalPayment.updateMany({
            where: { id: payment.id, status: { not: 'REFUNDED' } }, data: { captureId, status: 'REFUNDED' },
        })
        if (changed.count) await tx.order.update({ where: { id: order.id }, data: {
            isPaid: false, paidAmount: 0, remainingAmount: 0,
        } })
    })
}
