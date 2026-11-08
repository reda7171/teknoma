'use server'

import { publicOrderSelect } from '@/lib/public-order'

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { grantOrderAccess } from '@/lib/order-access'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'

// Résout le pays depuis une IP via ip-api.com (gratuit, 45 req/min)
async function resolveCountry(ip: string | null): Promise<string> {
    if (!ip) return 'Inconnu'
    // Ignorer les IPs privées / localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return 'Local'
    }
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { next: { revalidate: 3600 } })
        if (!res.ok) return 'Inconnu'
        const json = await res.json()
        return json.countryCode || 'Inconnu'
    } catch {
        return 'Inconnu'
    }
}

export async function trackPageView(data: {
    url: string
    referrer: string | null
    userId?: string
    sessionId?: string
}) {
    try {
        const headersList = await headers()
        const userAgent = (headersList.get('user-agent') || '').substring(0, 1000)
        const safeUrl = data.url.substring(0, 500)
        const safeReferrer = (data.referrer || '').substring(0, 500)

        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || headersList.get('cf-connecting-ip')
            || null

        // Priorité : headers Cloudflare/Vercel → fallback ip-api.com
        let country = headersList.get('cf-ipcountry') || headersList.get('x-vercel-ip-country') || ''
        if (!country || country === 'XX' || country === 'Inconnu') {
            country = await resolveCountry(ip)
        }

        await prisma.pageView.create({
            data: {
                url: safeUrl,
                referrer: safeReferrer || null,
                userId: data.userId || null,
                sessionId: data.sessionId || null,
                userAgent: userAgent || null,
                country: country || 'Inconnu',
                ip: ip || null
            }
        })
    } catch (error) {
        console.error('Tracking Error:', error)
    }
}

export type TrackingResult = {
    success: boolean
    error?: string
    order?: any
}

export async function trackOrder(formData: FormData): Promise<TrackingResult> {
    const limiter = await rateLimit(`order_tracking_${await getIpIdentifier()}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!limiter.success) return { success: false, error: 'Veuillez réessayer plus tard' }
    const orderId = formData.get('orderId') as string
    const contact = formData.get('contact') as string

    if (typeof orderId !== 'string' || typeof contact !== 'string' || orderId.length < 8 || orderId.length > 100 || contact.length > 255) {
        return { success: false, error: 'Veuillez remplir tous les champs' }
    }

    try {
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { id: { startsWith: orderId.toLowerCase() } },
                    { trackingID: orderId }
                ]
            },
            select: publicOrderSelect
        })

        if (!order) {
            return { success: false, error: 'Commande introuvable' }
        }

        const isValidContact = order.email === contact || order.phone === contact

        if (!isValidContact) {
            return { success: false, error: 'Les informations de contact ne correspondent pas' }
        }
        await grantOrderAccess(order.id)
        return { success: true, order }
    } catch (error) {
        console.error('Track Order Error:', error)
        return { success: false, error: 'Erreur lors de la recherche de la commande' }
    }
}
