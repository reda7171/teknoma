import 'server-only'

import { verifyAdmin } from "@/lib/actions/auth"
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/constants/whatsapp-templates'
import QRCode from 'qrcode'

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

const NOWEB_STORE_CONFIG = {
    noweb: {
        store: {
            enabled: true,
            full_sync: true,
            fullSync: true,
        },
    },
}

function getWahaHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json, image/png, */*',
    }
    const apiKey = process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY
    if (!apiKey) throw new Error('WAHA_API_KEY is required')
    if (apiKey) {
        headers['X-Api-Key'] = apiKey
    }
    const user = process.env.WAHA_USER || process.env.WAHA_DASHBOARD_USERNAME
    const pass = process.env.WAHA_PASS || process.env.WAHA_DASHBOARD_PASSWORD
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

            // Check WAHA (do not treat 401 as available since requests will fail)
            const wahaRes = await fetch(`${url}/api/sessions?all=true`, {
                headers: authHeaders,
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

async function extractWahaQr(baseUrl: string, sessionName: string): Promise<string | null> {
    const headers = getWahaHeaders()

    // 1. Tenter l'endpoint direct image WAHA /api/{session}/auth/qr?format=image
    try {
        const qrImgRes = await fetch(`${baseUrl}/api/${sessionName}/auth/qr?format=image`, {
            headers: { ...headers, 'Accept': 'image/png, */*' },
            cache: 'no-store'
        }).catch(() => null)

        if (qrImgRes && qrImgRes.ok) {
            const contentType = qrImgRes.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) {
                const arrayBuffer = await qrImgRes.arrayBuffer()
                if (arrayBuffer.byteLength > 100) {
                    const mime = contentType.includes('image/') ? contentType.split(';')[0] : 'image/png'
                    return `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`
                }
            }
        }
    } catch {}

    // 2. Tenter l'endpoint officiel WAHA /api/{session}/auth/qr
    try {
        const qrRes = await fetch(`${baseUrl}/api/${sessionName}/auth/qr`, {
            headers,
            cache: 'no-store'
        }).catch(() => null)

        if (qrRes && qrRes.ok) {
            const contentType = qrRes.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const qrJson = await qrRes.json().catch(() => null)
                // WAHA image JSON: { mimetype: "image/png", data: "base64..." }
                if (qrJson?.data && typeof qrJson.data === 'string' && typeof qrJson?.mimetype === 'string' && qrJson.mimetype.startsWith('image/')) {
                    return qrJson.data.startsWith('data:')
                        ? qrJson.data
                        : `data:${qrJson.mimetype};base64,${qrJson.data}`
                }
                // WAHA peut retourner la clé qrcode
                if (qrJson?.qrcode && typeof qrJson.qrcode === 'string') {
                    return qrJson.qrcode.startsWith('data:')
                        ? qrJson.qrcode
                        : `data:image/png;base64,${qrJson.qrcode}`
                }
                // WAHA renvoie le string brut dans "raw" (ou "qr", "value", "data")
                const rawQr = qrJson?.raw || qrJson?.qr || qrJson?.value || qrJson?.data
                if (rawQr && typeof rawQr === 'string') {
                    if (rawQr.startsWith('data:image')) return rawQr
                    try {
                        return await QRCode.toDataURL(rawQr, { margin: 2, scale: 7 })
                    } catch {
                        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawQr)}`
                    }
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

    // 3. Fallbacks screenshots WAHA
    const screenshotEndpoints = [
        `${baseUrl}/api/${sessionName}/screenshot`,
        `${baseUrl}/api/screenshot?session=${encodeURIComponent(sessionName)}`
    ]
    for (const ep of screenshotEndpoints) {
        try {
            const screenRes = await fetch(ep, {
                headers,
                cache: 'no-store'
            }).catch(() => null)

            if (screenRes && screenRes.ok) {
                const contentType = screenRes.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                    const screenJson = await screenRes.json().catch(() => null)
                    const val = screenJson?.data || screenJson?.qrcode || screenJson?.raw
                    if (val && typeof val === 'string') {
                        return val.startsWith('data:') ? val : `data:image/png;base64,${val}`
                    }
                } else {
                    const arrayBuffer = await screenRes.arrayBuffer()
                    if (arrayBuffer.byteLength > 500) {
                        return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`
                    }
                }
            }
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

        // Si la session n'existe pas encore dans WAHA, on la crée et on la démarre
        if (!session) {
            await fetch(`${gateway.baseUrl}/api/sessions`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: sessionName,
                    start: true,
                    config: NOWEB_STORE_CONFIG,
                })
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

function normalizePhoneNumber(raw: string): string {
    let clean = raw.replace(/\D/g, '')
    if (clean.startsWith('00212')) {
        clean = '212' + clean.slice(5)
    } else if (clean.startsWith('0')) {
        clean = '212' + clean.slice(1)
    } else if (!clean.startsWith('212') && clean.length === 9) {
        clean = '212' + clean
    }
    return clean
}

export interface SendWhatsAppOptions {
    session?: string
    type?: 'DIRECT' | 'TEST' | 'ORDER_CONFIRM' | 'PROMO_LEAD' | 'ABANDONED_CART' | 'ORDER_STATUS' | string
    metadata?: Record<string, any>
}

export async function sendWhatsAppMessageDirect(
    phone: string,
    message: string,
    options?: SendWhatsAppOptions
) {
    const type = options?.type || 'DIRECT'
    const sessionName = options?.session || 'default'
    const metadataStr = options?.metadata ? JSON.stringify(options.metadata) : null
    const cleanPhone = normalizePhoneNumber(phone)

    const gateway = await detectGateway()
    if (!gateway) {
        try {
            await prisma.whatsAppMessageLog.create({
                data: {
                    phone: cleanPhone || phone,
                    message,
                    status: 'FAILED',
                    type,
                    error: 'Passerelle WhatsApp indisponible (WAHA non connecté)',
                    metadata: metadataStr
                }
            })
        } catch (e) {
            console.error('[WhatsApp Log Error]', e)
        }
        return { success: false, error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        if (gateway.engine === 'baileys') {
            const res = await fetch(`${gateway.baseUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: cleanPhone, message })
            })
            const data = await res.json().catch(() => ({}))
            const isOk = res.ok && data?.success !== false
            try {
                await prisma.whatsAppMessageLog.create({
                    data: {
                        phone: cleanPhone,
                        message,
                        status: isOk ? 'SENT' : 'FAILED',
                        messageId: data?.id || data?.messageId || null,
                        type,
                        error: isOk ? null : (data?.error || `HTTP ${res.status}`),
                        metadata: metadataStr
                    }
                })
            } catch (e) {
                console.error('[WhatsApp Log Error]', e)
            }
            return data
        }

        const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`
        const headers = getWahaHeaders()
        let res = await fetch(`${gateway.baseUrl}/api/sendText`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: sessionName,
                chatId,
                text: message
            })
        })
        let data = await res.json().catch(() => ({}))
        let isOk = res.ok && !data?.error
        let effectiveSession = sessionName

        // Basculement automatique sur une session de secours en cas d'échec
        if (!isOk) {
            try {
                const sessionsRes = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, { headers, cache: 'no-store' }).catch(() => null)
                if (sessionsRes && sessionsRes.ok) {
                    const allSessions: any[] = await sessionsRes.json()
                    const fallback = allSessions.find(s => s.name !== sessionName && s.status === 'WORKING')
                    if (fallback) {
                        const fbRes = await fetch(`${gateway.baseUrl}/api/sendText`, {
                            method: 'POST',
                            headers: { ...headers, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session: fallback.name,
                                chatId,
                                text: message
                            })
                        })
                        const fbData = await fbRes.json().catch(() => ({}))
                        if (fbRes.ok && !fbData?.error) {
                            isOk = true
                            data = fbData
                            effectiveSession = fallback.name
                            res = fbRes
                        }
                    }
                }
            } catch {}
        }

        const msgId = data?.id || data?.key?.id || null

        try {
            await prisma.whatsAppMessageLog.create({
                data: {
                    phone: cleanPhone,
                    message,
                    status: isOk ? 'SENT' : 'FAILED',
                    messageId: msgId,
                    type,
                    error: isOk ? null : (data?.message || data?.error || `HTTP ${res.status}`),
                    metadata: metadataStr ? JSON.stringify({ ...JSON.parse(metadataStr), usedSession: effectiveSession }) : JSON.stringify({ usedSession: effectiveSession })
                }
            })
        } catch (e) {
            console.error('[WhatsApp Log Error]', e)
        }

        return { success: isOk, usedSession: effectiveSession, ...data }
    } catch (err: any) {
        try {
            await prisma.whatsAppMessageLog.create({
                data: {
                    phone: cleanPhone || phone,
                    message,
                    status: 'FAILED',
                    type,
                    error: err.message || 'Impossible d\'envoyer le message WhatsApp',
                    metadata: metadataStr
                }
            })
        } catch {}
        return { success: false, error: err.message || 'Impossible d\'envoyer le message WhatsApp' }
    }
}

export async function sendWhatsAppMessageViaGateway(
    phone: string,
    message: string,
    options?: SendWhatsAppOptions
) {
    await verifyAdmin()
    return sendWhatsAppMessageDirect(phone, message, {
        type: options?.type || 'TEST',
        metadata: options?.metadata
    })
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

    const [autoPromoLead, autoOrderConfirm, autoWelcome] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_order_confirm' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_welcome' } }).catch(() => null),
    ])

    return {
        autoPromoLead: autoPromoLead?.value !== 'false', // Default true
        autoOrderConfirm: autoOrderConfirm?.value !== 'false', // Default true
        autoWelcome: autoWelcome?.value !== 'false', // Default true
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

    const [promoLead, orderConfirm, abandonedCart, welcome] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_order_confirm' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_abandoned_cart' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_welcome' } }).catch(() => null),
    ])

    return {
        whatsapp_template_promo_lead: promoLead?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_promo_lead,
        whatsapp_template_order_confirm: orderConfirm?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_order_confirm,
        whatsapp_template_abandoned_cart: abandonedCart?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_abandoned_cart,
        whatsapp_template_welcome: welcome?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_welcome,
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

export interface WhatsAppLogItem {
    id: string
    phone: string
    message: string
    status: 'SENT' | 'DELIVERED' | 'FAILED' | string
    messageId: string | null
    type: string
    error: string | null
    metadata: string | null
    createdAt: string
}

export interface WhatsAppLogsResponse {
    logs: WhatsAppLogItem[]
    total: number
    stats: {
        total: number
        sent: number
        failed: number
        delivered: number
    }
}

export async function getWhatsAppMessageLogs(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    search?: string
}): Promise<WhatsAppLogsResponse> {
    await verifyAdmin()

    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(5, params?.limit || 50))
    const skip = (page - 1) * limit

    const where: any = {}
    if (params?.status && params.status !== 'ALL') {
        where.status = params.status
    }
    if (params?.type && params.type !== 'ALL') {
        where.type = params.type
    }
    if (params?.search && params.search.trim()) {
        const q = params.search.trim()
        where.OR = [
            { phone: { contains: q } },
            { message: { contains: q } }
        ]
    }

    try {
        const [logs, total, totalSent, totalFailed, totalDelivered, allTotal] = await Promise.all([
            prisma.whatsAppMessageLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.whatsAppMessageLog.count({ where }),
            prisma.whatsAppMessageLog.count({ where: { status: 'SENT' } }),
            prisma.whatsAppMessageLog.count({ where: { status: 'FAILED' } }),
            prisma.whatsAppMessageLog.count({ where: { status: 'DELIVERED' } }),
            prisma.whatsAppMessageLog.count()
        ])

        return {
            logs: logs.map(l => ({
                id: l.id,
                phone: l.phone,
                message: l.message,
                status: l.status,
                messageId: l.messageId,
                type: l.type,
                error: l.error,
                metadata: l.metadata,
                createdAt: l.createdAt.toISOString()
            })),
            total,
            stats: {
                total: allTotal,
                sent: totalSent,
                failed: totalFailed,
                delivered: totalDelivered
            }
        }
    } catch (e) {
        console.error('[getWhatsAppMessageLogs Error]', e)
        return {
            logs: [],
            total: 0,
            stats: { total: 0, sent: 0, failed: 0, delivered: 0 }
        }
    }
}

export async function resendWhatsAppMessage(id: string) {
    await verifyAdmin()
    try {
        const log = await prisma.whatsAppMessageLog.findUnique({ where: { id } })
        if (!log) return { success: false, error: 'Message introuvable' }

        const res = await sendWhatsAppMessageDirect(log.phone, log.message, {
            type: log.type,
            metadata: log.metadata ? JSON.parse(log.metadata) : undefined
        })
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return res
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors du renvoi' }
    }
}

export async function deleteWhatsAppLog(id: string) {
    await verifyAdmin()
    try {
        await prisma.whatsAppMessageLog.delete({ where: { id } })
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur suppression' }
    }
}

export async function clearWhatsAppLogs() {
    await verifyAdmin()
    try {
        await prisma.whatsAppMessageLog.deleteMany({})
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la réinitialisation des logs' }
    }
}

export interface WahaSessionItem {
    name: string
    status: 'STOPPED' | 'STARTING' | 'SCAN_QR' | 'WORKING' | 'FAILED' | string
    config?: any
    me?: {
        id: string
        pushName: string
        lid?: string
        reachoutTimelock?: any
        messageCapping?: {
            cappingStatus: string
            totalQuota: number
            usedQuota: number
            cycleStart?: number
            cycleEnd?: number
        }
    } | null
    presence?: string | null
    timestamps?: {
        activity?: number | null
    }
    assignedWorker?: string
    deliveryStats?: {
        total: number
        sent: number
        delivered: number
        failed: number
        successRate: number
    }
}

export async function getWahaSessions(): Promise<{ success: boolean; sessions: WahaSessionItem[]; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) {
        return { success: false, sessions: [], error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/sessions?all=true`, {
            headers,
            cache: 'no-store'
        })
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            return { success: false, sessions: [], error: errData.message || `Erreur WAHA HTTP ${res.status}` }
        }
        const data = await res.json()
        const rawSessions: WahaSessionItem[] = Array.isArray(data) ? data : []

        // Enrichir avec les statistiques de délivrabilité par session
        const enrichedSessions = await Promise.all(
            rawSessions.map(async (sess) => {
                try {
                    const logs = await prisma.whatsAppMessageLog.findMany({
                        where: {
                            OR: [
                                { metadata: { contains: `"usedSession":"${sess.name}"` } },
                                ...(sess.name === 'default' ? [{ metadata: null }] : [])
                            ]
                        },
                        select: { status: true }
                    })
                    const total = logs.length
                    const sent = logs.filter(l => l.status === 'SENT').length
                    const delivered = logs.filter(l => l.status === 'DELIVERED').length
                    const failed = logs.filter(l => l.status === 'FAILED').length
                    const successCount = sent + delivered
                    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100

                    return {
                        ...sess,
                        deliveryStats: {
                            total,
                            sent,
                            delivered,
                            failed,
                            successRate
                        }
                    }
                } catch {
                    return sess
                }
            })
        )

        return { success: true, sessions: enrichedSessions }
    } catch (err: any) {
        return { success: false, sessions: [], error: err.message || 'Impossible de récupérer les sessions WAHA' }
    }
}

export async function createWahaSession(name: string, start: boolean = true): Promise<{ success: boolean; session?: WahaSessionItem; error?: string }> {
    await verifyAdmin()
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanName) {
        return { success: false, error: 'Nom de session invalide (utilisez des lettres minuscules, chiffres, tirets)' }
    }

    const gateway = await detectGateway()
    if (!gateway) {
        return { success: false, error: 'Passerelle WhatsApp indisponible' }
    }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/sessions`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: cleanName,
                start,
                config: NOWEB_STORE_CONFIG,
            })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return { success: false, error: data.message || `Erreur création session (HTTP ${res.status})` }
        }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true, session: data }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la création de la session' }
    }
}

export async function startWahaSession(name: string): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        // Appliquer config NOWEB store avant de démarrer
        await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                config: NOWEB_STORE_CONFIG,
            })
        }).catch(() => null)

        const res = await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}/start`, {
            method: 'POST',
            headers
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur démarrage session' }
    }
}

export async function stopWahaSession(name: string): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}/stop`, {
            method: 'POST',
            headers
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur arrêt session' }
    }
}

export async function restartWahaSessionByName(name: string): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        // Appliquer config NOWEB store
        await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                config: NOWEB_STORE_CONFIG,
            })
        }).catch(() => null)

        const res = await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}/restart`, {
            method: 'POST',
            headers
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur redémarrage session' }
    }
}

export async function deleteWahaSession(name: string): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    if (name === 'default') {
        return { success: false, error: 'La session principale "default" ne peut pas être supprimée' }
    }

    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur suppression session' }
    }
}

export async function getWahaSessionQrCode(name: string): Promise<{ success: boolean; qr: string | null; status?: string; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, qr: null, error: 'Passerelle indisponible' }

    try {
        let qr = await extractWahaQr(gateway.baseUrl, name)
        if (qr) {
            return { success: true, qr, status: 'SCAN_QR_CODE' }
        }

        const headers = getWahaHeaders()
        const sessionRes = await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}`, {
            headers,
            cache: 'no-store'
        }).catch(() => null)

        let sessionStatus: string | undefined
        if (sessionRes && sessionRes.ok) {
            const sessionData = await sessionRes.json().catch(() => null)
            sessionStatus = sessionData?.status
        }

        if (sessionStatus === 'FAILED' || sessionStatus === 'STOPPED') {
            await fetch(`${gateway.baseUrl}/api/sessions/${encodeURIComponent(name)}/restart`, {
                method: 'POST',
                headers
            }).catch(() => null)

            await new Promise(r => setTimeout(r, 2200))
            qr = await extractWahaQr(gateway.baseUrl, name)
            if (qr) {
                return { success: true, qr, status: 'SCAN_QR_CODE' }
            }
        }

        return {
            success: Boolean(qr),
            qr,
            status: sessionStatus,
            error: qr ? undefined : (sessionStatus === 'WORKING' ? 'Session déjà connectée' : 'Initialisation WAHA en cours...')
        }
    } catch (err: any) {
        return { success: false, qr: null, error: err.message }
    }
}

export async function getWahaSessionQrFormatted(
    name: string = 'default',
    format: 'image' | 'raw' = 'image'
): Promise<{ success: boolean; data?: string; format: 'image' | 'raw'; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, format, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(name)}/auth/qr?format=${format}`, {
            headers,
            cache: 'no-store',
            signal: controller.signal
        }).catch((err) => {
            if (err.name === 'AbortError') throw new Error('Timeout QR WAHA (10s)')
            throw err
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            return {
                success: false,
                format,
                error: errData.message || errData.error || `HTTP ${res.status}`
            }
        }

        const contentType = res.headers.get('content-type') || ''
        if (format === 'raw' || contentType.includes('application/json')) {
            const json = await res.json().catch(() => null)
            if (format === 'image' && json?.data && typeof json.data === 'string' && typeof json?.mimetype === 'string' && json.mimetype.startsWith('image/')) {
                return {
                    success: true,
                    data: json.data.startsWith('data:') ? json.data : `data:${json.mimetype};base64,${json.data}`,
                    format: 'image'
                }
            }
            const raw = json?.raw || json?.qr || json?.value || json?.data || (typeof json === 'string' ? json : null)
            if (!raw || typeof raw !== 'string') {
                return { success: false, format, error: 'Réponse QR WAHA non reconnue' }
            }
            if (format === 'image') {
                return { success: true, data: await QRCode.toDataURL(raw, { margin: 2, scale: 7 }), format: 'image' }
            }
            return { success: true, data: raw, format: 'raw' }
        }

        // Image binaire
        const arrayBuffer = await res.arrayBuffer()
        const mime = contentType.includes('image/') ? contentType.split(';')[0] : 'image/png'
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return { success: true, data: `data:${mime};base64,${base64}`, format: 'image' }
    } catch (err: any) {
        return { success: false, format, error: err.message || 'Erreur récupération QR' }
    }
}

export async function requestWahaPairingCode(
    sessionName: string = 'default',
    phoneNumber: string
): Promise<{ success: boolean; code?: string; error?: string }> {
    await verifyAdmin()
    const cleanPhone = normalizePhoneNumber(phoneNumber)
    if (!cleanPhone || cleanPhone.length < 8) {
        return { success: false, error: 'Numéro de téléphone invalide (ex: 0666038129 ou +2126...)' }
    }

    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(sessionName)}/auth/request-code`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: cleanPhone,
                method: null
            }),
            signal: controller.signal
        }).catch((err) => {
            if (err.name === 'AbortError') throw new Error('Délai d\'attente dépassé (timeout 15s)')
            throw err
        })
        clearTimeout(timeoutId)

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return {
                success: false,
                error: data.message || data.error || `Erreur WAHA HTTP ${res.status}`
            }
        }

        const code = data?.code || data?.authCode || data?.pairingCode || (typeof data === 'string' ? data : null)
        return {
            success: true,
            code: code || 'Code généré'
        }
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Impossible de demander le code d\'authentification'
        }
    }
}

export async function getWahaSessionScreenshot(
    sessionName: string = 'default'
): Promise<{ success: boolean; screenshot?: string; error?: string; isNonChrome?: boolean }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(`${gateway.baseUrl}/api/screenshot?session=${encodeURIComponent(sessionName)}`, {
            headers,
            cache: 'no-store',
            signal: controller.signal
        }).catch((err) => {
            if (err.name === 'AbortError') throw new Error('Timeout capture d\'écran (10s)')
            throw err
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}))
            const msg = errJson.message || errJson.error || `HTTP ${res.status}`
            const isNonChrome = typeof msg === 'string' && msg.toLowerCase().includes('non chrome')
            return {
                success: false,
                error: isNonChrome
                    ? 'La capture d\'écran WAHA nécessite le moteur Chromium (WEBJS ou WPP). Votre session actuelle tourne sur le moteur léger Baileys / Noweb.'
                    : msg,
                isNonChrome
            }
        }

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            const json = await res.json().catch(() => ({}))
            const raw = json?.data || json?.screenshot || json?.image
            if (raw && typeof raw === 'string') {
                return {
                    success: true,
                    screenshot: raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
                }
            }
            return { success: false, error: 'Format capture d\'écran non reconnu' }
        }

        const arrayBuffer = await res.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mime = contentType.includes('image/') ? contentType.split(';')[0] : 'image/jpeg'
        return {
            success: true,
            screenshot: `data:${mime};base64,${base64}`
        }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur capture d\'écran' }
    }
}

export async function getWahaPasskeyChallenge(
    sessionName: string = 'default'
): Promise<{ success: boolean; challenge?: any; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(sessionName)}/auth/passkey/challenge`, {
            headers,
            cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return { success: false, error: data.message || data.error || `HTTP ${res.status}` }
        }
        return { success: true, challenge: data }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur passkey challenge' }
    }
}

export async function submitWahaPasskey(
    sessionName: string = 'default',
    payload: any
): Promise<{ success: boolean; result?: any; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(sessionName)}/auth/passkey`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return { success: false, error: data.message || data.error || `HTTP ${res.status}` }
        }
        return { success: true, result: data }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur soumission passkey' }
    }
}

export async function getWahaPasskeyConfirmation(
    sessionName: string = 'default'
): Promise<{ success: boolean; code?: string; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(sessionName)}/auth/passkey/confirmation`, {
            headers,
            cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return { success: false, error: data.message || data.error || `HTTP ${res.status}` }
        }
        return { success: true, code: data?.code || (typeof data === 'string' ? data : null) }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur passkey confirmation' }
    }
}

export async function confirmWahaPasskey(
    sessionName: string = 'default',
    code?: string
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle indisponible' }

    try {
        const headers = getWahaHeaders()
        const res = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(sessionName)}/auth/passkey/confirm`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(code ? { code } : {})
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            return { success: false, error: data.message || data.error || `HTTP ${res.status}` }
        }
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur confirmation passkey' }
    }
}

export type WahaStatusType = 'text' | 'image' | 'video'

export interface WahaStatusPayload {
    text?: string
    fileUrl?: string
    caption?: string
    backgroundColor?: string
    font?: number
}

export async function sendWahaStatus(
    sessionName: string,
    type: WahaStatusType,
    payload: WahaStatusPayload
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()

    const cleanSession = sessionName.trim()
    if (!cleanSession || cleanSession.length > 100) {
        return { success: false, error: 'Session WAHA invalide' }
    }

    const backgroundColor = payload.backgroundColor || '#38b42f'
    if (!/^#[0-9a-fA-F]{6}$/.test(backgroundColor)) {
        return { success: false, error: 'Couleur de fond invalide' }
    }

    let body: Record<string, unknown>
    if (type === 'text') {
        const statusText = payload.text?.trim()
        if (!statusText) return { success: false, error: 'Le texte du statut est obligatoire' }
        if (statusText.length > 5000) return { success: false, error: 'Le texte est trop long' }

        body = {
            text: statusText,
            backgroundColor,
            font: Math.min(5, Math.max(0, Math.trunc(payload.font ?? 1)))
        }
    } else {
        const fileUrl = payload.fileUrl?.trim()
        if (!fileUrl) return { success: false, error: `L\'URL ${type === 'image' ? 'de l\'image' : 'de la vidéo'} est obligatoire` }

        try {
            const parsedUrl = new URL(fileUrl)
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('invalid protocol')
        } catch {
            return { success: false, error: 'URL de fichier invalide (HTTP/HTTPS requis)' }
        }

        body = {
            file: {
                mimetype: type === 'image' ? 'image/jpeg' : 'video/mp4',
                url: fileUrl
            },
            ...(type === 'image'
                ? { caption: payload.caption?.trim() || '' }
                : { backgroundColor })
        }
    }

    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle WhatsApp indisponible' }
    if (gateway.engine !== 'waha') {
        return { success: false, error: 'La publication de statuts nécessite une passerelle WAHA' }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    try {
        const response = await fetch(
            `${gateway.baseUrl}/api/${encodeURIComponent(cleanSession)}/status/${type}`,
            {
                method: 'POST',
                headers: { ...getWahaHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
                cache: 'no-store'
            }
        )
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const apiMessage = result?.message || result?.error
            return {
                success: false,
                error: typeof apiMessage === 'string'
                    ? apiMessage
                    : `Publication refusée par WAHA (HTTP ${response.status})`
            }
        }
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ''
        const isTimeout = error instanceof Error && error.name === 'AbortError'
        return {
            success: false,
            error: isTimeout || message === 'This operation was aborted'
                ? 'Délai dépassé pendant la publication du statut'
                : message || 'Impossible de publier le statut WhatsApp'
        }
    } finally {
        clearTimeout(timeoutId)
    }
}

export interface WahaChannel {
    id: string
    name: string
    description?: string
    invite?: string
    picture?: string
    role?: string
}

function readWahaApiError(result: unknown): string | null {
    if (!result || typeof result !== 'object') return null
    const value = result as { message?: unknown; error?: unknown }
    return typeof value.message === 'string'
        ? value.message
        : typeof value.error === 'string' ? value.error : null
}

export async function getWahaChannels(
    sessionName: string = 'default'
): Promise<{ success: boolean; channels: WahaChannel[]; error?: string }> {
    await verifyAdmin()
    const cleanSession = sessionName.trim()
    if (!cleanSession || cleanSession.length > 100) {
        return { success: false, channels: [], error: 'Session WAHA invalide' }
    }

    const gateway = await detectGateway()
    if (!gateway) return { success: false, channels: [], error: 'Passerelle WhatsApp indisponible' }
    if (gateway.engine !== 'waha') return { success: false, channels: [], error: 'La gestion des chaînes nécessite WAHA' }

    try {
        const response = await fetch(`${gateway.baseUrl}/api/${encodeURIComponent(cleanSession)}/channels`, {
            headers: getWahaHeaders(),
            cache: 'no-store'
        })
        const result: unknown = await response.json().catch(() => null)
        if (!response.ok) {
            return { success: false, channels: [], error: readWahaApiError(result) || `Erreur WAHA HTTP ${response.status}` }
        }
        const rawChannels: unknown[] = Array.isArray(result)
            ? result
            : result && typeof result === 'object' && Array.isArray((result as { channels?: unknown }).channels)
                ? (result as { channels: unknown[] }).channels
                : []
        const channels = rawChannels.flatMap((item): WahaChannel[] => {
            if (!item || typeof item !== 'object') return []
            const value = item as Record<string, unknown>
            if (typeof value.id !== 'string' || !value.id.endsWith('@newsletter')) return []
            return [{
                id: value.id,
                name: typeof value.name === 'string' && value.name.trim() ? value.name : value.id,
                description: typeof value.description === 'string' ? value.description : undefined,
                invite: typeof value.invite === 'string' ? value.invite : undefined,
                picture: typeof value.picture === 'string' ? value.picture : undefined,
                role: typeof value.role === 'string' ? value.role : undefined
            }]
        })
        return { success: true, channels }
    } catch (error: unknown) {
        return { success: false, channels: [], error: error instanceof Error ? error.message : 'Impossible de récupérer les chaînes WhatsApp' }
    }
}

export async function sendWahaChannelMessage(
    sessionName: string,
    channelId: string,
    text: string
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const cleanSession = sessionName.trim()
    const cleanChannelId = channelId.trim()
    const cleanText = text.trim()
    if (!cleanSession || cleanSession.length > 100) return { success: false, error: 'Session WAHA invalide' }
    if (!/^\d+@newsletter$/.test(cleanChannelId)) return { success: false, error: 'Identifiant de chaîne invalide' }
    if (!cleanText) return { success: false, error: 'Le message est obligatoire' }
    if (cleanText.length > 5000) return { success: false, error: 'Le message est trop long' }

    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle WhatsApp indisponible' }
    if (gateway.engine !== 'waha') return { success: false, error: 'La gestion des chaînes nécessite WAHA' }

    try {
        const response = await fetch(`${gateway.baseUrl}/api/sendText`, {
            method: 'POST',
            headers: { ...getWahaHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: cleanSession, chatId: cleanChannelId, text: cleanText }),
            cache: 'no-store'
        })
        const result: unknown = await response.json().catch(() => null)
        if (!response.ok) {
            return { success: false, error: readWahaApiError(result) || `Publication refusée par WAHA (HTTP ${response.status})` }
        }
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Impossible de publier dans la chaîne' }
    }
}

export interface WahaChatSummary {
    id: string
    name?: string
    picture?: string | null
    unreadCount?: number
    archived?: boolean
    lastMessage?: WahaChatMessage | null
    [key: string]: unknown
}

export interface WahaChatMessage {
    id: string
    timestamp?: number
    from?: string
    fromMe?: boolean
    body?: string
    hasMedia?: boolean
    ack?: number
    ackName?: string
    [key: string]: unknown
}

type WahaChatAction = 'delete' | 'clear' | 'read' | 'archive' | 'unarchive' | 'unread'
type WahaMessageAction = 'delete' | 'edit' | 'pin' | 'unpin'

async function callWahaChatApi(
    path: string,
    init?: RequestInit
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const gateway = await detectGateway()
    if (!gateway) return { success: false, error: 'Passerelle WhatsApp indisponible' }
    if (gateway.engine !== 'waha') return { success: false, error: 'La gestion des chats nécessite WAHA' }

    try {
        const response = await fetch(`${gateway.baseUrl}${path}`, {
            ...init,
            headers: {
                ...getWahaHeaders(),
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
                ...(init?.headers || {})
            },
            cache: 'no-store'
        })
        const data: unknown = await response.json().catch(() => null)
        if (!response.ok) return { success: false, error: readWahaApiError(data) || `Erreur WAHA HTTP ${response.status}` }
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur de communication avec WAHA' }
    }
}

function validWahaId(value: string, maxLength: number = 300): boolean {
    return Boolean(value.trim()) && value.length <= maxLength && !/[\r\n]/.test(value)
}

function toChatArray(data: unknown): WahaChatSummary[] {
    const values = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray((data as { chats?: unknown }).chats)
            ? (data as { chats: unknown[] }).chats
            : []
    return values.filter((item): item is WahaChatSummary => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
}

function toMessageArray(data: unknown): WahaChatMessage[] {
    const values = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray((data as { messages?: unknown }).messages)
            ? (data as { messages: unknown[] }).messages
            : []
    return values.filter((item): item is WahaChatMessage => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
}

export async function getWahaChats(
    sessionName: string,
    mode: 'all' | 'overview' = 'overview',
    limit: number = 30,
    offset: number = 0
): Promise<{ success: boolean; chats: WahaChatSummary[]; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100)) return { success: false, chats: [], error: 'Session WAHA invalide' }
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)))
    const safeOffset = Math.max(0, Math.trunc(offset))
    const suffix = mode === 'overview' ? '/overview' : ''
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/chats${suffix}?limit=${safeLimit}&offset=${safeOffset}`)
    return result.success
        ? { success: true, chats: toChatArray(result.data) }
        : { success: false, chats: [], error: result.error }
}

export async function getWahaChatsOverviewByIds(
    sessionName: string,
    ids: string[],
    limit: number = 100,
    offset: number = 0
): Promise<{ success: boolean; chats: WahaChatSummary[]; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100)) return { success: false, chats: [], error: 'Session WAHA invalide' }
    const safeIds = ids.map(id => id.trim()).filter(id => validWahaId(id)).slice(0, 500)
    if (!safeIds.length) return { success: false, chats: [], error: 'Ajoutez au moins un identifiant de chat' }
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/chats/overview`, {
        method: 'POST',
        body: JSON.stringify({ ids: safeIds, limit: Math.min(500, Math.max(1, Math.trunc(limit))), offset: Math.max(0, Math.trunc(offset)) })
    })
    return result.success
        ? { success: true, chats: toChatArray(result.data) }
        : { success: false, chats: [], error: result.error }
}

export async function getWahaChatPicture(
    sessionName: string,
    chatId: string,
    refresh: boolean = false
): Promise<{ success: boolean; url?: string | null; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100) || !validWahaId(chatId)) return { success: false, error: 'Session ou chat invalide' }
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/chats/${encodeURIComponent(chatId.trim())}/picture?refresh=${refresh}`)
    const url = result.data && typeof result.data === 'object' && typeof (result.data as { url?: unknown }).url === 'string'
        ? (result.data as { url: string }).url : null
    return result.success ? { success: true, url } : { success: false, error: result.error }
}

export async function getWahaChatMessages(
    sessionName: string,
    chatId: string,
    limit: number = 30,
    offset: number = 0
): Promise<{ success: boolean; messages: WahaChatMessage[]; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100) || !validWahaId(chatId)) return { success: false, messages: [], error: 'Session ou chat invalide' }
    const query = `limit=${Math.min(100, Math.max(1, Math.trunc(limit)))}&offset=${Math.max(0, Math.trunc(offset))}&downloadMedia=false`
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/chats/${encodeURIComponent(chatId.trim())}/messages?${query}`)
    return result.success ? { success: true, messages: toMessageArray(result.data) } : { success: false, messages: [], error: result.error }
}

export async function getWahaChatMessage(
    sessionName: string,
    chatId: string,
    messageId: string
): Promise<{ success: boolean; message?: WahaChatMessage; error?: string }> {
    await verifyAdmin()
    if (![sessionName, chatId, messageId].every(value => validWahaId(value))) return { success: false, error: 'Identifiant invalide' }
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/chats/${encodeURIComponent(chatId.trim())}/messages/${encodeURIComponent(messageId.trim())}?downloadMedia=false`)
    return result.success && result.data && typeof result.data === 'object'
        ? { success: true, message: result.data as WahaChatMessage }
        : { success: false, error: result.error || 'Message introuvable' }
}

export async function runWahaChatAction(
    sessionName: string,
    chatId: string,
    action: WahaChatAction
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100) || !validWahaId(chatId)) return { success: false, error: 'Session ou chat invalide' }
    const base = `/api/${encodeURIComponent(sessionName.trim())}/chats/${encodeURIComponent(chatId.trim())}`
    const requests: Record<WahaChatAction, { path: string; init: RequestInit }> = {
        delete: { path: base, init: { method: 'DELETE' } },
        clear: { path: `${base}/messages`, init: { method: 'DELETE' } },
        read: { path: `${base}/messages/read`, init: { method: 'POST', body: JSON.stringify({ messages: 100, days: 30 }) } },
        archive: { path: `${base}/archive`, init: { method: 'POST', body: JSON.stringify({}) } },
        unarchive: { path: `${base}/unarchive`, init: { method: 'POST', body: JSON.stringify({}) } },
        unread: { path: `${base}/unread`, init: { method: 'POST', body: JSON.stringify({}) } }
    }
    const request = requests[action]
    if (!request) return { success: false, error: 'Action non autorisée' }
    const result = await callWahaChatApi(request.path, request.init)
    return result.success ? { success: true } : { success: false, error: result.error }
}

export async function runWahaMessageAction(
    sessionName: string,
    chatId: string,
    messageId: string,
    action: WahaMessageAction,
    value?: string | number
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    if (![sessionName, chatId, messageId].every(item => validWahaId(item))) return { success: false, error: 'Identifiant invalide' }
    const base = `/api/${encodeURIComponent(sessionName.trim())}/chats/${encodeURIComponent(chatId.trim())}/messages/${encodeURIComponent(messageId.trim())}`
    let init: RequestInit
    let path = base
    if (action === 'delete') init = { method: 'DELETE' }
    else if (action === 'edit') {
        const text = String(value || '').trim()
        if (!text || text.length > 5000) return { success: false, error: 'Texte modifié invalide' }
        init = { method: 'PUT', body: JSON.stringify({ text }) }
    } else if (action === 'pin') {
        const allowedDurations = [86400, 604800, 2592000]
        const duration = Number(value)
        if (!allowedDurations.includes(duration)) return { success: false, error: 'Durée d’épinglage invalide' }
        path = `${base}/pin`
        init = { method: 'POST', body: JSON.stringify({ duration }) }
    } else {
        path = `${base}/unpin`
        init = { method: 'POST', body: JSON.stringify({}) }
    }
    const result = await callWahaChatApi(path, init)
    return result.success ? { success: true } : { success: false, error: result.error }
}

export interface WahaContact {
    id: string
    number?: string
    name?: string
    pushname?: string
    shortName?: string
    isMe?: boolean
    isGroup?: boolean
    isWAContact?: boolean
    isMyContact?: boolean
    isBlocked?: boolean
    [key: string]: unknown
}

export interface WahaLidMapping {
    lid: string | null
    pn: string | null
}

function normalizeContactId(contactId: string): string | null {
    const value = contactId.trim().replace(/^\+/, '')
    return /^(\d+|\d+@(c\.us|lid))$/.test(value) ? value : null
}

export async function getWahaContacts(
    sessionName: string,
    limit: number = 100,
    offset: number = 0,
    sortBy: 'id' | 'name' = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
): Promise<{ success: boolean; contacts: WahaContact[]; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100)) return { success: false, contacts: [], error: 'Session WAHA invalide' }
    const query = new URLSearchParams({
        session: sessionName.trim(),
        limit: String(Math.min(500, Math.max(1, Math.trunc(limit)))),
        offset: String(Math.max(0, Math.trunc(offset))),
        sortBy,
        sortOrder
    })
    const result = await callWahaChatApi(`/api/contacts/all?${query}`)
    const values = Array.isArray(result.data) ? result.data : []
    const contacts = values.filter((item): item is WahaContact => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'))
    return result.success ? { success: true, contacts } : { success: false, contacts: [], error: result.error }
}

export async function getWahaContact(
    sessionName: string,
    contactId: string,
    routeStyle: 'query' | 'session' = 'query'
): Promise<{ success: boolean; contact?: WahaContact; error?: string }> {
    await verifyAdmin()
    const id = normalizeContactId(contactId)
    if (!validWahaId(sessionName, 100) || !id) return { success: false, error: 'Session ou contact invalide' }
    const path = routeStyle === 'session'
        ? `/api/${encodeURIComponent(sessionName.trim())}/contacts/${encodeURIComponent(id)}`
        : `/api/contacts?${new URLSearchParams({ contactId: id, session: sessionName.trim() })}`
    const result = await callWahaChatApi(path)
    return result.success && result.data && typeof result.data === 'object'
        ? { success: true, contact: result.data as WahaContact }
        : { success: false, error: result.error || 'Contact introuvable' }
}

export async function inspectWahaContact(
    sessionName: string,
    contactId: string,
    type: 'exists' | 'about' | 'picture',
    refresh: boolean = false
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    await verifyAdmin()
    const id = normalizeContactId(contactId)
    if (!validWahaId(sessionName, 100) || !id) return { success: false, error: 'Session ou contact invalide' }
    const endpoint = type === 'exists' ? 'check-exists' : type === 'about' ? 'about' : 'profile-picture'
    const query = new URLSearchParams({ session: sessionName.trim() })
    query.set(type === 'exists' ? 'phone' : 'contactId', id)
    if (type === 'picture') query.set('refresh', String(refresh))
    return callWahaChatApi(`/api/contacts/${endpoint}?${query}`)
}

export async function updateWahaContact(
    sessionName: string,
    contactId: string,
    firstName: string,
    lastName: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    await verifyAdmin()
    const id = normalizeContactId(contactId)
    const first = firstName.trim()
    const last = lastName.trim()
    if (!validWahaId(sessionName, 100) || !id) return { success: false, error: 'Session ou contact invalide' }
    if (!first || first.length > 100 || last.length > 100) return { success: false, error: 'Nom du contact invalide' }
    return callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/contacts/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ firstName: first, lastName: last })
    })
}

export async function setWahaContactBlocked(
    sessionName: string,
    contactId: string,
    blocked: boolean
): Promise<{ success: boolean; error?: string }> {
    await verifyAdmin()
    const id = normalizeContactId(contactId)
    if (!validWahaId(sessionName, 100) || !id) return { success: false, error: 'Session ou contact invalide' }
    const result = await callWahaChatApi(`/api/contacts/${blocked ? 'block' : 'unblock'}`, {
        method: 'POST',
        body: JSON.stringify({ contactId: id, session: sessionName.trim() })
    })
    return result.success ? { success: true } : { success: false, error: result.error }
}

export async function getWahaLids(
    sessionName: string,
    limit: number = 100,
    offset: number = 0
): Promise<{ success: boolean; mappings: WahaLidMapping[]; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100)) return { success: false, mappings: [], error: 'Session WAHA invalide' }
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/lids?limit=${Math.min(500, Math.max(1, Math.trunc(limit)))}&offset=${Math.max(0, Math.trunc(offset))}`)
    const values = Array.isArray(result.data) ? result.data : []
    const mappings = values.flatMap((item): WahaLidMapping[] => {
        if (!item || typeof item !== 'object') return []
        const value = item as { lid?: unknown; pn?: unknown }
        return [{ lid: typeof value.lid === 'string' ? value.lid : null, pn: typeof value.pn === 'string' ? value.pn : null }]
    })
    return result.success ? { success: true, mappings } : { success: false, mappings: [], error: result.error }
}

export async function getWahaLidsCount(
    sessionName: string
): Promise<{ success: boolean; count?: number; error?: string }> {
    await verifyAdmin()
    if (!validWahaId(sessionName, 100)) return { success: false, error: 'Session WAHA invalide' }
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/lids/count`)
    const count = result.data && typeof result.data === 'object' ? Number((result.data as { count?: unknown }).count) : NaN
    return result.success && Number.isFinite(count) ? { success: true, count } : { success: false, error: result.error || 'Comptage LID indisponible' }
}

export async function resolveWahaLid(
    sessionName: string,
    value: string,
    direction: 'lid-to-phone' | 'phone-to-lid'
): Promise<{ success: boolean; mapping?: WahaLidMapping; error?: string }> {
    await verifyAdmin()
    const cleanValue = value.trim().replace(/^\+/, '')
    if (!validWahaId(sessionName, 100) || !/^(\d+|\d+@(lid|c\.us))$/.test(cleanValue)) return { success: false, error: 'Identifiant LID ou numéro invalide' }
    const suffix = direction === 'phone-to-lid' ? `/pn/${encodeURIComponent(cleanValue)}` : `/${encodeURIComponent(cleanValue)}`
    const result = await callWahaChatApi(`/api/${encodeURIComponent(sessionName.trim())}/lids${suffix}`)
    if (!result.success || !result.data || typeof result.data !== 'object') return { success: false, error: result.error || 'Correspondance introuvable' }
    const data = result.data as { lid?: unknown; pn?: unknown }
    return { success: true, mapping: { lid: typeof data.lid === 'string' ? data.lid : null, pn: typeof data.pn === 'string' ? data.pn : null } }
}

export interface WahaApiParameter {
    name: string
    in: 'query' | 'path' | 'header'
    required?: boolean
    description?: string
    schema?: any
    example?: any
}

export interface WahaApiOperation {
    tag: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    operationId: string
    summary: string
    description?: string
    deprecated: boolean
    parameters?: WahaApiParameter[]
    requestBodySample?: string
}

export interface WahaApiExplorerResponse {
    success: boolean
    status?: number
    statusText?: string
    contentType?: string
    data?: unknown
    text?: string
    base64?: string
    truncated?: boolean
    error?: string
}

const WAHA_EXPLORER_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const WAHA_EXPLORER_ROOTS = ['/api', '/health', '/mcp', '/ping', '/observability', '/dashboard']
const WAHA_EXPLORER_MAX_RESPONSE_BYTES = 4 * 1024 * 1024

function validateWahaExplorerPath(input: string): string | null {
    const value = input.trim()
    if (!value.startsWith('/') || value.length > 2000 || /[\r\n\\]/.test(value)) return null
    try {
        const url = new URL(value, 'http://waha.local')
        if (url.origin !== 'http://waha.local' || url.pathname.includes('..')) return null
        const allowed = WAHA_EXPLORER_ROOTS.some(root => url.pathname === root || url.pathname.startsWith(`${root}/`))
        return allowed ? `${url.pathname}${url.search}` : null
    } catch {
        return null
    }
}

function extractSampleFromSchema(schema: any, rootDoc: any, depth = 0): any {
    if (!schema || depth > 5) return null
    if (schema['$ref'] && typeof schema['$ref'] === 'string') {
        const parts = schema['$ref'].replace(/^#\//, '').split('/')
        let current = rootDoc
        for (const p of parts) {
            current = current?.[p]
        }
        if (current && current !== schema) {
            return extractSampleFromSchema(current, rootDoc, depth + 1)
        }
    }
    if (schema.example !== undefined && schema.example !== null) return schema.example
    if (schema.default !== undefined && schema.default !== null) return schema.default
    if (schema.type === 'string') return ''
    if (schema.type === 'number' || schema.type === 'integer') return 0
    if (schema.type === 'boolean') return true
    if (schema.type === 'array') {
        const item = extractSampleFromSchema(schema.items, rootDoc, depth + 1)
        return item !== null ? [item] : []
    }
    if (schema.type === 'object' || schema.properties) {
        const res: Record<string, any> = {}
        for (const [k, v] of Object.entries(schema.properties || {})) {
            res[k] = extractSampleFromSchema(v, rootDoc, depth + 1)
        }
        return res
    }
    return null
}

export async function getWahaOpenApiCatalog(): Promise<{
    success: boolean
    operations: WahaApiOperation[]
    version?: string
    error?: string
}> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway || gateway.engine !== 'waha') {
        return { success: false, operations: [], error: 'Passerelle WAHA indisponible' }
    }

    try {
        const response = await fetch(`${gateway.baseUrl}/swagger-ui-init.js`, {
            headers: getWahaHeaders(),
            cache: 'no-store',
            signal: AbortSignal.timeout(15000)
        })
        if (!response.ok) return { success: false, operations: [], error: `Swagger WAHA HTTP ${response.status}` }
        const script = await response.text()
        const prefix = 'let options = '
        const start = script.indexOf(prefix)
        const searchPattern = 'url = options.swaggerUrl'
        const urlIndex = script.indexOf(searchPattern, start)
        const semiIndex = script.lastIndexOf(';', urlIndex)
        if (start < 0 || urlIndex < 0 || semiIndex < 0) {
            return { success: false, operations: [], error: 'Schéma Swagger WAHA illisible' }
        }

        let rawJson = script.slice(start + prefix.length, semiIndex).trim()
        if (rawJson.endsWith(';')) rawJson = rawJson.slice(0, -1).trim()
        const options = JSON.parse(rawJson) as {
            swaggerDoc?: {
                openapi?: string
                paths?: Record<string, Record<string, any>>
                components?: { schemas?: Record<string, any> }
            }
        }
        const doc = options.swaggerDoc || {}
        const operations: WahaApiOperation[] = []

        for (const [path, pathItem] of Object.entries(doc.paths || {})) {
            for (const [rawMethod, rawOperation] of Object.entries(pathItem || {})) {
                const method = rawMethod.toUpperCase()
                if (!WAHA_EXPLORER_METHODS.has(method) || !rawOperation || typeof rawOperation !== 'object') continue
                const operation = rawOperation as Record<string, any>

                // Paramètres
                const params: WahaApiParameter[] = []
                if (Array.isArray(operation.parameters)) {
                    for (const p of operation.parameters) {
                        if (p && typeof p === 'object' && p.name) {
                            params.push({
                                name: String(p.name),
                                in: p.in || 'query',
                                required: Boolean(p.required),
                                description: typeof p.description === 'string' ? p.description : undefined,
                                schema: p.schema,
                                example: p.example,
                            })
                        }
                    }
                }

                // Corps de requête (sample)
                let requestBodySample: string | undefined
                const jsonContent = operation.requestBody?.content?.['application/json']
                if (jsonContent) {
                    if (jsonContent.examples && typeof jsonContent.examples === 'object') {
                        const exampleKey = Object.keys(jsonContent.examples)[0]
                        const sampleVal = jsonContent.examples[exampleKey]?.value
                        if (sampleVal) {
                            requestBodySample = JSON.stringify(sampleVal, null, 2)
                        }
                    }
                    if (!requestBodySample && jsonContent.schema) {
                        const sample = extractSampleFromSchema(jsonContent.schema, doc)
                        if (sample && typeof sample === 'object' && Object.keys(sample).length > 0) {
                            requestBodySample = JSON.stringify(sample, null, 2)
                        }
                    }
                }

                operations.push({
                    tag: Array.isArray(operation.tags) && typeof operation.tags[0] === 'string' ? operation.tags[0] : 'Autres',
                    method: method as WahaApiOperation['method'],
                    path,
                    operationId: typeof operation.operationId === 'string' ? operation.operationId : '',
                    summary: typeof operation.summary === 'string' ? operation.summary : '',
                    description: typeof operation.description === 'string' ? operation.description : undefined,
                    deprecated: operation.deprecated === true,
                    parameters: params.length > 0 ? params : undefined,
                    requestBodySample,
                })
            }
        }
        operations.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
        return { success: true, operations, version: options.swaggerDoc?.openapi }
    } catch (error: unknown) {
        return { success: false, operations: [], error: error instanceof Error ? error.message : 'Impossible de charger Swagger WAHA' }
    }
}

export async function executeWahaApiOperation(input: {
    method: string
    path: string
    jsonBody?: string
}): Promise<WahaApiExplorerResponse> {
    await verifyAdmin()
    const method = input.method.trim().toUpperCase()
    const path = validateWahaExplorerPath(input.path)
    if (!WAHA_EXPLORER_METHODS.has(method)) return { success: false, error: 'Méthode HTTP non autorisée' }
    if (!path) return { success: false, error: 'Chemin WAHA invalide ou non autorisé' }

    let body: string | undefined
    if (method !== 'GET' && input.jsonBody?.trim()) {
        if (input.jsonBody.length > 250_000) return { success: false, error: 'Corps JSON trop volumineux' }
        try {
            body = JSON.stringify(JSON.parse(input.jsonBody))
        } catch {
            return { success: false, error: 'Le corps de la requête doit être un JSON valide' }
        }
    }

    const gateway = await detectGateway()
    if (!gateway || gateway.engine !== 'waha') return { success: false, error: 'Passerelle WAHA indisponible' }

    try {
        const response = await fetch(`${gateway.baseUrl}${path}`, {
            method,
            headers: {
                ...getWahaHeaders(),
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            body,
            cache: 'no-store',
            signal: AbortSignal.timeout(30000)
        })
        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        const contentLength = Number(response.headers.get('content-length') || 0)
        if (contentLength > WAHA_EXPLORER_MAX_RESPONSE_BYTES) {
            return {
                success: false,
                status: response.status,
                statusText: response.statusText,
                contentType,
                error: 'Réponse WAHA trop volumineuse pour la console (limite 2 Mo)'
            }
        }

        const bytes = new Uint8Array(await response.arrayBuffer())
        const truncated = bytes.byteLength > WAHA_EXPLORER_MAX_RESPONSE_BYTES
        const safeBytes = truncated ? bytes.slice(0, WAHA_EXPLORER_MAX_RESPONSE_BYTES) : bytes
        const base = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType,
            truncated
        }
        if (contentType.includes('application/json')) {
            const text = new TextDecoder().decode(safeBytes)
            const data: unknown = JSON.parse(text || 'null')
            return response.ok ? { ...base, data } : { ...base, data, error: readWahaApiError(data) || `WAHA HTTP ${response.status}` }
        }
        if (contentType.startsWith('text/')) {
            const text = new TextDecoder().decode(safeBytes)
            return response.ok ? { ...base, text } : { ...base, text, error: `WAHA HTTP ${response.status}` }
        }
        const base64 = Buffer.from(safeBytes).toString('base64')
        return response.ok ? { ...base, base64 } : { ...base, error: `WAHA HTTP ${response.status}` }
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur de communication avec WAHA' }
    }
}
