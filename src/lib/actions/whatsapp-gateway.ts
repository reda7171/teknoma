'use server'

import { verifyAdmin } from './auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/constants/whatsapp-templates'

const CANDIDATE_URLS = [
    process.env.WHATSAPP_GATEWAY_URL,
    'http://whatsapp:3000',
    'http://riwaya_whatsapp:3000',
    'http://167.86.108.246:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3001',
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

function getWahaHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json, image/png, */*',
    }
    const apiKey = process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY
    if (apiKey) {
        headers['X-Api-Key'] = apiKey
    }
    const user = process.env.WAHA_USER || process.env.WAHA_DASHBOARD_USERNAME || 'admin'
    const pass = process.env.WAHA_PASS || process.env.WAHA_DASHBOARD_PASSWORD || 'admin123'
    if (user && pass) {
        headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
    }
    return headers
}

async function detectGateway(): Promise<ActiveGateway | null> {
    const urls = Array.from(new Set(CANDIDATE_URLS))
    for (const url of urls) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 4000)

            const authHeaders = getWahaHeaders()

            // Check WAHA
            const wahaRes = await fetch(`${url}/api/sessions?all=true`, {
                headers: authHeaders,
                signal: controller.signal,
                cache: 'no-store'
            }).catch(() => null)

            if (wahaRes && (wahaRes.ok || wahaRes.status === 401)) {
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

async function extractWahaQr(baseUrl: string, sessionName: string): Promise<string | null> {
    const headers = getWahaHeaders()

    // 1. Tenter l'endpoint officiel WAHA /api/{session}/auth/qr
    try {
        const qrRes = await fetch(`${baseUrl}/api/${sessionName}/auth/qr`, {
            headers,
            cache: 'no-store'
        }).catch(() => null)

        if (qrRes && qrRes.ok) {
            const contentType = qrRes.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const qrJson = await qrRes.json().catch(() => null)
                if (qrJson?.data) {
                    return qrJson.data.startsWith('data:')
                        ? qrJson.data
                        : `data:${qrJson.mimetype || 'image/png'};base64,${qrJson.data}`
                }
                if (qrJson?.value && typeof qrJson.value === 'string') {
                    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrJson.value)}`
                }
            } else {
                // Réponse binaire image/png
                const arrayBuffer = await qrRes.arrayBuffer()
                if (arrayBuffer.byteLength > 100) {
                    const buffer = Buffer.from(arrayBuffer)
                    const mime = contentType.includes('image/') ? contentType.split(';')[0] : 'image/png'
                    return `data:${mime};base64,${buffer.toString('base64')}`
                }
            }
        }
    } catch {}

    // 2. Fallback: Screenshot direct de l'instance WhatsApp Web de Chromium
    try {
        const screenRes = await fetch(`${baseUrl}/api/screenshot?session=${encodeURIComponent(sessionName)}`, {
            headers,
            cache: 'no-store'
        }).catch(() => null)

        if (screenRes && screenRes.ok) {
            const contentType = screenRes.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const screenJson = await screenRes.json().catch(() => null)
                if (screenJson?.data) {
                    return screenJson.data.startsWith('data:')
                        ? screenJson.data
                        : `data:${screenJson.mimetype || 'image/png'};base64,${screenJson.data}`
                }
            } else {
                const arrayBuffer = await screenRes.arrayBuffer()
                if (arrayBuffer.byteLength > 500) {
                    const buffer = Buffer.from(arrayBuffer)
                    return `data:image/png;base64,${buffer.toString('base64')}`
                }
            }
        }
    } catch {}

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
            error: 'Passerelle WhatsApp hors ligne (démarrez le conteneur WhatsApp ou docker compose up -d whatsapp)'
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
        const headers = getWahaHeaders()
        let sessionsRes = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, {
            headers,
            cache: 'no-store'
        }).catch(() => null)

        let sessions: any[] = []
        if (sessionsRes && sessionsRes.ok) {
            try {
                sessions = await sessionsRes.json()
            } catch {}
        }

        let session = Array.isArray(sessions) ? (sessions.find((s: any) => s.name === 'default') || sessions[0]) : null
        const sessionName = session?.name || 'default'

        // Si la session n'existe pas encore dans WAHA, on la crée
        if (!session) {
            await fetch(`${gateway.baseUrl}/api/sessions`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: sessionName })
            }).catch(() => null)
        } else if (session.status === 'STOPPED' || session.status === 'FAILED') {
            // Si la session existe mais est arrêtée, on la démarre
            await fetch(`${gateway.baseUrl}/api/sessions/${sessionName}/start`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' }
            }).catch(() => null)
        }

        // Récupérer le statut actualisé si on vient de démarrer
        if (!session || session.status === 'STOPPED' || session.status === 'FAILED') {
            sessionsRes = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, {
                headers,
                cache: 'no-store'
            }).catch(() => null)
            if (sessionsRes && sessionsRes.ok) {
                try {
                    sessions = await sessionsRes.json()
                    session = Array.isArray(sessions) ? (sessions.find((s: any) => s.name === sessionName) || sessions[0]) : null
                } catch {}
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

        // Si la session est en SCAN_QR_CODE ou en train d'initialiser Chromium (STARTING)
        const qrDataUrl = await extractWahaQr(gateway.baseUrl, sessionName)

        if (qrDataUrl) {
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
            user: null,
            error: sessionStatus === 'STARTING'
                ? 'Démarrage du moteur WhatsApp Web en cours... Le QR code va apparaître dans quelques secondes.'
                : null
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

        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/sendText`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
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

export async function restartWhatsAppSession() {
    await verifyAdmin()

    const gateway = await detectGateway()
    if (!gateway) {
        return { success: false, error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        if (gateway.engine === 'baileys') {
            await fetch(`${gateway.baseUrl}/restart`, { method: 'POST' }).catch(() => null)
        } else {
            const headers = getWahaHeaders()
            // Tenter restart direct puis fallback stop -> start
            const res = await fetch(`${gateway.baseUrl}/api/sessions/default/restart`, {
                method: 'POST',
                headers
            }).catch(() => null)

            if (!res || !res.ok) {
                await fetch(`${gateway.baseUrl}/api/sessions/default/stop`, { method: 'POST', headers }).catch(() => null)
                await fetch(`${gateway.baseUrl}/api/sessions/default/start`, { method: 'POST', headers }).catch(() => null)
            }
        }

        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true, message: 'Session relancée avec succès' }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors du redémarrage' }
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

        const headers = getWahaHeaders()
        await fetch(`${gateway.baseUrl}/api/sessions/default/logout`, { method: 'POST', headers }).catch(() => null)
        await fetch(`${gateway.baseUrl}/api/sessions/default/stop`, { method: 'POST', headers }).catch(() => null)
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

