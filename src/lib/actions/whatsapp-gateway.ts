'use server'

import { verifyAdmin } from './auth'
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

function getWahaHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json, image/png, */*',
    }
    const apiKey = process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY || 'riwaya_waha_api_key_2026'
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
                body: JSON.stringify({ name: sessionName, start: true })
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
                start
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

export async function getWahaSessionQrCode(name: string): Promise<{ success: boolean; qr: string | null; error?: string }> {
    await verifyAdmin()
    const gateway = await detectGateway()
    if (!gateway) return { success: false, qr: null, error: 'Passerelle indisponible' }

    try {
        const qr = await extractWahaQr(gateway.baseUrl, name)
        return { success: true, qr }
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
            const raw = json?.raw || json?.qr || json?.value || json?.data || (typeof json === 'string' ? json : JSON.stringify(json))
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



