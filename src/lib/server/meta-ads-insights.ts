import 'server-only'

import { prisma } from '@/lib/prisma'
import {
    META_GRAPH_API_BASE,
    META_API_CONFIG_PATH,
    getMetaAdsCredentials,
    classifyMetaGraphError,
    type MetaApiErrorCode,
    type MetaGraphErrorPayload,
} from '@/lib/server/meta-ads-client'
import {
    type AdDatePreset,
    buildCleanCampaignSlug,
    formatYmd,
    getPresetWindowStartDate,
    resolveAdFxRateToMad,
    recordAdSyncTimestamp,
} from '@/lib/server/ads-fx'

interface MetaActionItem {
    action_type?: string
    value?: string | number
}

interface MetaGraphInsightRow {
    id?: string
    name?: string
    status?: string
    effective_status?: string
    objective?: string
    campaign_id?: string
    campaign_name?: string
    spend?: string | number
    impressions?: string | number
    clicks?: string | number
    ctr?: string | number
    actions?: MetaActionItem[]
    date_start?: string
    date_stop?: string
}

interface MetaGraphApiPayload {
    error?: MetaGraphErrorPayload
    currency?: string
    data?: MetaGraphInsightRow[]
    paging?: { next?: string }
}

async function fetchMetaJson(url: string): Promise<MetaGraphApiPayload> {
    const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
    })
    return res.json() as Promise<MetaGraphApiPayload>
}

function extractMetaPurchases(actions: unknown): number {
    if (!Array.isArray(actions)) return 0
    let best = 0
    for (const entry of actions as MetaActionItem[]) {
        const type = String(entry?.action_type || '').toLowerCase()
        if (
            type === 'offsite_conversion.fb_pixel_purchase' ||
            type === 'purchase' ||
            type === 'omni_purchase'
        ) {
            const val = parseInt(String(entry?.value || '0'), 10)
            if (Number.isFinite(val) && val > best) best = val
        }
    }
    return best
}

async function fetchAllInsightsPages(
    initialUrl: string
): Promise<{ rows: MetaGraphInsightRow[]; error?: MetaGraphErrorPayload }> {
    const rows: MetaGraphInsightRow[] = []
    let nextUrl: string | null = initialUrl

    for (let page = 0; page < 5 && nextUrl; page++) {
        const data = await fetchMetaJson(nextUrl)
        if (data?.error) {
            return { rows, error: data.error }
        }
        if (Array.isArray(data?.data)) {
            rows.push(...data.data)
        }
        nextUrl = typeof data?.paging?.next === 'string' ? data.paging.next : null
    }
    return { rows }
}

/**
 * Importe les dépenses et métriques Meta Marketing API par campagne dans MySQL (`ad_campaign_spends`).
 */
export async function syncMetaCampaignSpends(
    preset: AdDatePreset = 'last_30d',
    overrideFxRate?: number
): Promise<{
    success: boolean
    syncedCount: number
    currency?: string
    fxRateToMad?: number
    errorCode?: MetaApiErrorCode
    configPath?: string
    error?: string
}> {
    const creds = await getMetaAdsCredentials(false)
    if (creds.missing) {
        return {
            success: false,
            syncedCount: 0,
            errorCode: 'MISSING_CONFIG',
            configPath: META_API_CONFIG_PATH,
            error: 'Token Meta Marketing ou Ad Account ID manquant dans Config > API.',
        }
    }

    const { accessToken, adAccountId } = creds

    try {
        const accData = await fetchMetaJson(
            `${META_GRAPH_API_BASE}/${encodeURIComponent(adAccountId)}?fields=name,currency&access_token=${encodeURIComponent(accessToken)}`
        )
        if (accData?.error) {
            return { syncedCount: 0, ...classifyMetaGraphError('Validation Compte Meta Ads', accData.error) }
        }

        const currency = String(accData?.currency || 'MAD').toUpperCase()
        const fxRateToMad = await resolveAdFxRateToMad(currency, overrideFxRate)

        const campaignsData = await fetchMetaJson(
            `${META_GRAPH_API_BASE}/${encodeURIComponent(adAccountId)}/campaigns?fields=id,name,status,effective_status,objective&limit=200&access_token=${encodeURIComponent(accessToken)}`
        )
        if (campaignsData?.error) {
            return { syncedCount: 0, ...classifyMetaGraphError('Lecture Campagnes Meta', campaignsData.error) }
        }

        const metaMap = new Map<string, { name: string; status: string; objective: string | null }>()
        if (Array.isArray(campaignsData?.data)) {
            for (const c of campaignsData.data) {
                metaMap.set(String(c.id), {
                    name: String(c.name || c.id),
                    status: String(c.effective_status || c.status || 'UNKNOWN'),
                    objective: c.objective ? String(c.objective) : null,
                })
            }
        }

        const windowStart = getPresetWindowStartDate(preset)
        const timeParam = windowStart
            ? `time_range=${encodeURIComponent(JSON.stringify({ since: formatYmd(windowStart), until: formatYmd(new Date()) }))}`
            : 'date_preset=maximum'

        const insightsUrl =
            `${META_GRAPH_API_BASE}/${encodeURIComponent(adAccountId)}/insights` +
            `?level=campaign&${timeParam}&limit=200` +
            `&fields=campaign_id,campaign_name,spend,impressions,clicks,ctr,actions,date_start,date_stop` +
            `&access_token=${encodeURIComponent(accessToken)}`

        const { rows: insightRows, error: insightsError } = await fetchAllInsightsPages(insightsUrl)
        if (insightsError) {
            return { syncedCount: 0, ...classifyMetaGraphError('Import Dépenses Meta', insightsError) }
        }

        const syncedAt = new Date()
        const seenCampaignIds = new Set<string>()
        let syncedCount = 0

        for (const row of insightRows) {
            const campaignId = String(row.campaign_id || '')
            if (!campaignId) continue
            seenCampaignIds.add(campaignId)

            const metaInfo = metaMap.get(campaignId)
            const campaignName = String(row.campaign_name || metaInfo?.name || campaignId)
            const spend = Math.round((parseFloat(String(row.spend || '0')) || 0) * 100) / 100
            const spendMad = Math.round(spend * fxRateToMad * 100) / 100
            const impressions = parseInt(String(row.impressions || '0'), 10) || 0
            const clicks = parseInt(String(row.clicks || '0'), 10) || 0
            const ctr = Math.round((parseFloat(String(row.ctr || '0')) || 0) * 100) / 100
            const cpcMad = clicks > 0 ? Math.round((spendMad / clicks) * 100) / 100 : 0
            const platformConv = extractMetaPurchases(row.actions)
            const utmSlug = buildCleanCampaignSlug(campaignName)

            await prisma.adCampaignSpend.upsert({
                where: { platform_campaignId_datePreset: { platform: 'META', campaignId, datePreset: preset } },
                create: {
                    platform: 'META',
                    campaignId,
                    campaignName: campaignName.slice(0, 255),
                    utmSlug,
                    channelType: metaInfo?.objective || null,
                    status: metaInfo?.status || 'ACTIVE',
                    datePreset: preset,
                    currency,
                    spend,
                    spendMad,
                    fxRateToMad,
                    impressions,
                    clicks,
                    ctr,
                    cpcMad,
                    platformConv,
                    dateStart: row.date_start ? String(row.date_start).slice(0, 20) : null,
                    dateStop: row.date_stop ? String(row.date_stop).slice(0, 20) : null,
                    syncedAt,
                },
                update: {
                    campaignName: campaignName.slice(0, 255),
                    utmSlug,
                    channelType: metaInfo?.objective || null,
                    status: metaInfo?.status || 'ACTIVE',
                    currency,
                    spend,
                    spendMad,
                    fxRateToMad,
                    impressions,
                    clicks,
                    ctr,
                    cpcMad,
                    platformConv,
                    dateStart: row.date_start ? String(row.date_start).slice(0, 20) : null,
                    dateStop: row.date_stop ? String(row.date_stop).slice(0, 20) : null,
                    syncedAt,
                },
            })
            syncedCount++
        }

        // Garder une trace des campagnes ACTIVE récemment lancées à 0 MAD
        for (const [campaignId, info] of metaMap.entries()) {
            if (seenCampaignIds.has(campaignId) || info.status !== 'ACTIVE') continue
            await prisma.adCampaignSpend.upsert({
                where: { platform_campaignId_datePreset: { platform: 'META', campaignId, datePreset: preset } },
                create: {
                    platform: 'META',
                    campaignId,
                    campaignName: info.name.slice(0, 255),
                    utmSlug: buildCleanCampaignSlug(info.name),
                    channelType: info.objective,
                    status: info.status,
                    datePreset: preset,
                    currency,
                    spend: 0,
                    spendMad: 0,
                    fxRateToMad,
                    syncedAt,
                },
                update: {
                    campaignName: info.name.slice(0, 255),
                    utmSlug: buildCleanCampaignSlug(info.name),
                    channelType: info.objective,
                    status: info.status,
                    currency,
                    fxRateToMad,
                    syncedAt,
                },
            })
            syncedCount++
        }

        await prisma.adCampaignSpend.deleteMany({
            where: { platform: 'META', campaignId: { startsWith: 'seed_meta_' } },
        })
        await recordAdSyncTimestamp('META', syncedAt)

        return { success: true, syncedCount, currency, fxRateToMad }
    } catch {
        return {
            success: false,
            syncedCount: 0,
            errorCode: 'META_API_ERROR',
            error: 'Impossible de joindre graph.facebook.com lors de la synchronisation Meta Ads.',
        }
    }
}
