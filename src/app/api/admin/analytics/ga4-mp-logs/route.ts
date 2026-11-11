import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeAdminApi } from '@/lib/api-authorization'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { invalidateSettingsCache } from '@/lib/server/site-settings'
import {
    getGa4MpConfig,
    getGa4MpMonitoringStatus,
    logGa4MpEvent,
} from '@/lib/server/ga4-mp-logger'

const PostActionSchema = z.object({
    action: z.enum(['acknowledge', 'test_debug']),
})

export async function GET() {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const ip = await getIpIdentifier()
    const rl = await rateLimit(`ga4-mp-logs-get:${ip}`, { limit: 120, windowMs: 60000 })
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Trop de requêtes' },
            { status: 429, headers: { 'Cache-Control': 'no-store' } }
        )
    }

    const [status, config] = await Promise.all([
        getGa4MpMonitoringStatus(),
        getGa4MpConfig(),
    ])

    return NextResponse.json(
        {
            success: true,
            hasConfig: Boolean(config.measurementId && config.apiSecret),
            hasMeasurementId: Boolean(config.measurementId),
            hasApiSecret: Boolean(config.apiSecret),
            ...status,
        },
        { headers: { 'Cache-Control': 'no-store' } }
    )
}

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const ip = await getIpIdentifier()
    const rl = await rateLimit(`ga4-mp-logs-post:${ip}`, { limit: 20, windowMs: 60000 })
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Trop de requêtes, patientez une minute.' },
            { status: 429, headers: { 'Cache-Control': 'no-store' } }
        )
    }

    try {
        const body = await req.json()
        const { action } = PostActionSchema.parse(body)

        if (action === 'acknowledge') {
            const nowIso = new Date().toISOString()
            await prisma.siteSettings.upsert({
                where: { key: 'ga4_mp_alerts_acknowledged_at' },
                update: { value: nowIso },
                create: {
                    key: 'ga4_mp_alerts_acknowledged_at',
                    value: nowIso,
                    category: 'analytics',
                    description: 'Horodatage du dernier acquittement des alertes GA4 Measurement Protocol',
                },
            })
            invalidateSettingsCache(['ga4_mp_alerts_acknowledged_at'])

            const status = await getGa4MpMonitoringStatus()
            return NextResponse.json(
                { success: true, ...status },
                { headers: { 'Cache-Control': 'no-store' } }
            )
        }

        // Action test_debug : vérifier le endpoint officiel /debug/mp/collect
        const { measurementId, apiSecret } = await getGa4MpConfig()
        if (!measurementId || !apiSecret) {
            const missingMsg = !measurementId
                ? 'ID GA4 (google_analytics_id) manquant'
                : 'API Secret GA4 (google_analytics_api_secret) manquant'

            await logGa4MpEvent({
                action: 'MP_COLLECT_MISSING_CONFIG',
                error: missingMsg,
                measurementId,
                source: 'debug',
            })
            const status = await getGa4MpMonitoringStatus()
            return NextResponse.json(
                {
                    success: false,
                    error: missingMsg,
                    validationMessages: [],
                    ...status,
                },
                { headers: { 'Cache-Control': 'no-store' } }
            )
        }

        const testOrderId = `DIAG-${Date.now()}`
        const debugPayload = {
            client_id: `${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
            events: [
                {
                    name: 'purchase',
                    params: {
                        transaction_id: testOrderId,
                        value: 199,
                        currency: 'MAD',
                        shipping: 30,
                        payment_type: 'COD',
                        engagement_time_msec: 100,
                        items: [
                            {
                                item_id: 'diag-book-001',
                                item_name: 'Diagnostic GA4 Riwaya',
                                price: 169,
                                quantity: 1,
                                item_category: 'BOOK',
                            },
                        ],
                    },
                },
            ],
        }

        const res = await fetch(
            `https://www.google-analytics.com/debug/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debugPayload),
            }
        )

        const rawText = await res.text().catch(() => '')
        let parsedDebug: { validationMessages?: Array<{ description?: string; validationCode?: string }> } = {}
        try {
            parsedDebug = rawText ? JSON.parse(rawText) : {}
        } catch {
            parsedDebug = {}
        }

        const messages = Array.isArray(parsedDebug.validationMessages) ? parsedDebug.validationMessages : []

        if (!res.ok || messages.length > 0) {
            const detail =
                messages.map((m) => `${m.validationCode || 'WARN'}: ${m.description || ''}`).join(' | ') ||
                rawText.slice(0, 280) ||
                `HTTP ${res.status}`

            await logGa4MpEvent({
                action: !res.ok ? 'MP_COLLECT_ERROR' : 'MP_COLLECT_DEBUG_WARNING',
                orderId: testOrderId,
                status: res.status,
                paymentMethod: 'COD',
                value: 199,
                measurementId,
                error: detail,
                source: 'debug',
            })
        }

        const status = await getGa4MpMonitoringStatus()
        return NextResponse.json(
            {
                success: res.ok && messages.length === 0,
                httpStatus: res.status,
                validationMessages: messages,
                ...status,
            },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Requête invalide' },
                { status: 400, headers: { 'Cache-Control': 'no-store' } }
            )
        }
        return NextResponse.json(
            { error: 'Erreur interne lors du diagnostic GA4' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        )
    }
}

