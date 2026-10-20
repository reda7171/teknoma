'use server'

import { verifyAdmin } from './auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/constants/whatsapp-templates'

const CANDIDATE_URLS = [
    process.env.WHATSAPP_GATEWAY_URL,
    'http://whatsapp:3000',
    'http://127.0.0.1:3001',
    'http://localhost:3001',
    'http://riwaya_whatsapp:3000'
].filter(Boolean) as string[]

export interface WhatsAppGatewayStatusResponse {
    isRunning: boolean
    status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'OFFLINE'
    qr: string | null
    user: {
        id: string
        name: string
        phone: string
    } | null
    error?: string | null
}

interface ActiveGateway {
    engine: 'waha' | 'baileys'
    baseUrl: string
}

async function detectGateway(): Promise<ActiveGateway | null> {
    for (const url of CANDIDATE_URLS) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 1500)

            // Check WAHA
            const wahaRes = await fetch(`${url}/api/sessions?all=true`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
                cache: 'no-store'
            }).catch(() => null)

            if (wahaRes && wahaRes.ok) {
                clearTimeout(timeoutId)
                return { engine: 'waha', baseUrl: url }
            }

            // Check Baileys
            const baileysRes = await fetch(`${url}/status`, {
                signal: controller.signal,
                cache: 'no-store'
            }).catch(() => null)

            if (baileysRes && baileysRes.ok) {
                clearTimeout(timeoutId)
                return { engine: 'baileys', baseUrl: url }
            }

            clearTimeout(timeoutId)
        } catch {}
    }
    return null
}

export async function getWhatsAppGatewayStatus(): Promise<WhatsAppGatewayStatusResponse> {
    await verifyAdmin()

    const gateway = await detectGateway()
    if (!gateway) {
        return {
            isRunning: false,
            status: 'OFFLINE',
            qr: null,
            user: null,
            error: 'Passerelle WhatsApp hors ligne (démarrez le conteneur WhatsApp ou scripts/whatsapp-gateway.js)'
        }
    }

    try {
        if (gateway.engine === 'baileys') {
            const res = await fetch(`${gateway.baseUrl}/status`, { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            return {
                isRunning: true,
                status: data.status || 'DISCONNECTED',
                qr: data.qr || null,
                user: data.user || null,
                error: data.error || null
            }
        }

        // WAHA Engine
        let sessionsRes = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        })
        let sessions = await sessionsRes.json()
        let session = Array.isArray(sessions) ? (sessions.find((s: any) => s.name === 'default') || sessions[0]) : null

        if (!session || session.status === 'STOPPED' || session.status === 'FAILED') {
            await fetch(`${gateway.baseUrl}/api/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'default' })
            }).catch(() => null)

            sessionsRes = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            }).catch(() => null as any)
            if (sessionsRes?.ok) {
                sessions = await sessionsRes.json()
                session = Array.isArray(sessions) ? (sessions.find((s: any) => s.name === 'default') || sessions[0]) : null
            }
        }

        const sessionStatus = session?.status || 'STARTING'

        if (sessionStatus === 'WORKING') {
            const phone = (session.me?.id || '').split('@')[0]
            return {
                isRunning: true,
                status: 'CONNECTED',
                qr: null,
                user: {
                    id: session.me?.id || 'whatsapp-connected',
                    name: session.me?.pushName || 'Riwaya WhatsApp',
                    phone: phone ? `+${phone}` : 'Connecté'
                }
            }
        }

        if (sessionStatus === 'SCAN_QR_CODE') {
            const qrRes = await fetch(`${gateway.baseUrl}/api/default/auth/qr`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            }).catch(() => null)

            let qrDataUrl: string | null = null
            if (qrRes && qrRes.ok) {
                const qrJson = await qrRes.json()
                if (qrJson?.data) {
                    qrDataUrl = qrJson.data.startsWith('data:')
                        ? qrJson.data
                        : `data:${qrJson.mimetype || 'image/png'};base64,${qrJson.data}`
                }
            }

            return {
                isRunning: true,
                status: 'SCAN_QR',
                qr: qrDataUrl,
                user: null
            }
        }

        return {
            isRunning: true,
            status: 'CONNECTING',
            qr: null,
            user: null
        }
    } catch (err: any) {
        return {
            isRunning: false,
            status: 'OFFLINE',
            qr: null,
            user: null,
            error: err.message || 'Erreur communication passerelle'
        }
    }
}

export async function sendWhatsAppMessageViaGateway(phone: string, message: string) {
    await verifyAdmin()

    const gateway = await detectGateway()
    if (!gateway) {
        return { success: false, error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        if (gateway.engine === 'baileys') {
            const res = await fetch(`${gateway.baseUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: phone, message })
            })
            return await res.json()
        }

        let cleanPhone = phone.replace(/[^0-9]/g, '')
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.slice(1)
        }
        const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`

        const res = await fetch(`${gateway.baseUrl}/api/sendText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: 'default',
                chatId,
                text: message
            })
        })
        const data = await res.json()
        return { success: res.ok, ...data }
    } catch (err: any) {
        return { success: false, error: err.message || 'Impossible d\'envoyer le message WhatsApp' }
    }
}

export async function disconnectWhatsAppGateway() {
    await verifyAdmin()

    const gateway = await detectGateway()
    if (!gateway) {
        return { success: false, error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        if (gateway.engine === 'baileys') {
            const res = await fetch(`${gateway.baseUrl}/logout`, { method: 'POST' })
            const data = await res.json()
            revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
            return data
        }

        await fetch(`${gateway.baseUrl}/api/sessions/default/logout`, { method: 'POST' }).catch(() => null)
        await fetch(`${gateway.baseUrl}/api/sessions/default/stop`, { method: 'POST' }).catch(() => null)
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true, message: 'Session déconnectée avec succès' }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la déconnexion' }
    }
}

export async function getWhatsAppGatewaySettings() {
    await verifyAdmin()

    const [autoPromoLead, autoOrderConfirm] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_order_confirm' } }).catch(() => null),
    ])

    return {
        autoPromoLead: autoPromoLead?.value !== 'false', // Default true
        autoOrderConfirm: autoOrderConfirm?.value !== 'false', // Default true
    }
}

export async function updateWhatsAppGatewaySetting(key: string, value: boolean) {
    await verifyAdmin()

    await prisma.siteSettings.upsert({
        where: { key },
        update: { value: value ? 'true' : 'false' },
        create: {
            key,
            value: value ? 'true' : 'false',
            category: 'whatsapp',
            description: 'Automatisation WhatsApp Gateway'
        }
    })

    revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
    return { success: true }
}

export async function getWhatsAppTemplates() {
    await verifyAdmin()

    const [promoLead, orderConfirm, abandonedCart] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_order_confirm' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_abandoned_cart' } }).catch(() => null),
    ])

    return {
        whatsapp_template_promo_lead: promoLead?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_promo_lead,
        whatsapp_template_order_confirm: orderConfirm?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_order_confirm,
        whatsapp_template_abandoned_cart: abandonedCart?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_abandoned_cart,
    }
}

export async function updateWhatsAppTemplate(key: string, content: string) {
    await verifyAdmin()

    await prisma.siteSettings.upsert({
        where: { key },
        update: { value: content },
        create: {
            key,
            value: content,
            category: 'whatsapp',
            description: 'Modèle de message WhatsApp automatisé'
        }
    })

    revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
    return { success: true }
}

