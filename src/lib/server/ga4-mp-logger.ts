import 'server-only'

import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'

export type Ga4MpLogAction =
    | 'MP_COLLECT_ERROR'
    | 'MP_COLLECT_NETWORK_ERROR'
    | 'MP_COLLECT_MISSING_CONFIG'
    | 'MP_COLLECT_DEBUG_WARNING'

export interface Ga4MpLogInput {
    action: Ga4MpLogAction
    orderId?: string
    status?: number
    error: string
    paymentMethod?: string
    value?: number
    currency?: string
    measurementId?: string
    source?: 'checkout' | 'debug'
}

export interface Ga4MpLogEntry {
    id: string
    action: string
    orderId: string | null
    status: number | null
    error: string
    paymentMethod: string | null
    value: number | null
    currency: string
    measurementId: string | null
    source: string
    createdAt: string
    isUnresolved: boolean
}

function maskMeasurementId(id?: string | null): string | null {
    if (!id) return null
    const trimmed = id.trim()
    if (trimmed.length <= 5) return trimmed
    return `${trimmed.slice(0, 5)}***${trimmed.slice(-2)}`
}

export async function getGa4MpConfig() {
    const [settingId, settingSecret] = await Promise.all([
        getSetting('google_analytics_id'),
        getSetting('google_analytics_api_secret'),
    ])
    const measurementId = (settingId || process.env.NEXT_PUBLIC_GA_ID || process.env.GA_MEASUREMENT_ID || '').trim()
    const apiSecret = (settingSecret || process.env.GA_API_SECRET || process.env.GOOGLE_ANALYTICS_API_SECRET || '').trim()
    return { measurementId, apiSecret }
}

/**
 * Enregistre de façon non bloquante les anomalies GA4 Measurement Protocol (sans PII ni secret)
 */
export async function logGa4MpEvent(payload: Ga4MpLogInput): Promise<void> {
    try {
        const sanitizedDetails = {
            orderId: payload.orderId || null,
            status: typeof payload.status === 'number' ? payload.status : null,
            error: String(payload.error || 'Erreur inconnue').slice(0, 300),
            paymentMethod: payload.paymentMethod || null,
            value: typeof payload.value === 'number' ? Number(payload.value.toFixed(2)) : null,
            currency: payload.currency || 'MAD',
            measurementId: maskMeasurementId(payload.measurementId),
            source: payload.source || 'checkout',
            timestamp: new Date().toISOString(),
        }

        await prisma.auditLog.create({
            data: {
                adminId: 'SYSTEM_GA4_MP',
                action: payload.action,
                entity: 'GA4_MP',
                entityId: payload.orderId || null,
                details: JSON.stringify(sanitizedDetails),
            },
        })
    } catch (err) {
        console.error('[GA4_MP] Impossible de journaliser l\'anomalie:', err)
    }
}

export async function getGa4MpMonitoringStatus(): Promise<{
    logs: Ga4MpLogEntry[]
    unresolvedCount: number
    totalRecent: number
    acknowledgedAt: string | null
}> {
    try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const [rawLogs, ackSetting] = await Promise.all([
            prisma.auditLog.findMany({
                where: { entity: 'GA4_MP' },
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
            prisma.siteSettings.findUnique({
                where: { key: 'ga4_mp_alerts_acknowledged_at' },
            }),
        ])

        const acknowledgedAtMs = ackSetting?.value ? Date.parse(ackSetting.value) : 0
        const cutoffMs = Number.isFinite(acknowledgedAtMs) && acknowledgedAtMs > 0
            ? Math.max(acknowledgedAtMs, since24h.getTime())
            : since24h.getTime()

        let unresolvedCount = 0
        const logs: Ga4MpLogEntry[] = rawLogs.map((row) => {
            let parsed: Record<string, any> = {}
            if (row.details) {
                try {
                    parsed = JSON.parse(row.details)
                } catch {
                    parsed = { error: row.details }
                }
            }
            const createdMs = row.createdAt.getTime()
            const isUnresolved = createdMs > cutoffMs
            if (isUnresolved) unresolvedCount += 1

            return {
                id: row.id,
                action: row.action,
                orderId: row.entityId || parsed.orderId || null,
                status: typeof parsed.status === 'number' ? parsed.status : null,
                error: String(parsed.error || row.action),
                paymentMethod: parsed.paymentMethod || null,
                value: typeof parsed.value === 'number' ? parsed.value : null,
                currency: parsed.currency || 'MAD',
                measurementId: parsed.measurementId || null,
                source: parsed.source || 'checkout',
                createdAt: row.createdAt.toISOString(),
                isUnresolved,
            }
        })

        return {
            logs,
            unresolvedCount,
            totalRecent: rawLogs.filter((r) => r.createdAt >= since24h).length,
            acknowledgedAt: ackSetting?.value || null,
        }
    } catch (err) {
        console.error('[GA4_MP] Erreur lecture logs monitoring:', err)
        return {
            logs: [],
            unresolvedCount: 0,
            totalRecent: 0,
            acknowledgedAt: null,
        }
    }
}

