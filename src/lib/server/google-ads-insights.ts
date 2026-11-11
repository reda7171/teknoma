import 'server-only'

import { prisma } from '@/lib/prisma'
import { META_API_CONFIG_PATH } from '@/lib/server/meta-ads-client'
import {
    GOOGLE_ADS_API_BASE,
    getGoogleAdsCredentials,
    exchangeGoogleAdsAccessToken,
    type GoogleAdsCredentials,
} from '@/lib/server/google-ads-client'
import {
    type AdDatePreset,
    buildCleanCampaignSlug,
    formatYmd,
    getPresetWindowStartDate,
    resolveAdFxRateToMad,
    recordAdSyncTimestamp,
} from '@/lib/server/ads-fx'

interface GoogleAdsSearchRow {
    customer?: { id?: string; descriptiveName?: string; currencyCode?: string }
    campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string }
    metrics?: {
        costMicros?: string | number
        impressions?: string | number
        clicks?: string | number
        conversions?: string | number
    }
}

interface GoogleAdsSearchResponse {
    results?: GoogleAdsSearchRow[]
    nextPageToken?: string
    error?: { code?: number; message?: string; status?: string }
}

async function runGoogleAdsGaql(
    creds: GoogleAdsCredentials,
    accessToken: string,
    query: string
): Promise<{ rows: GoogleAdsSearchRow[]; error?: string; errorCode?: 'TOKEN_EXPIRED' | 'GOOGLE_API_ERROR' }> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': creds.developerToken,
        'Content-Type': 'application/json',
    }
    if (creds.loginCustomerId) {
        headers['login-customer-id'] = creds.loginCustomerId
    }

    const endpoint = `${GOOGLE_ADS_API_BASE}/customers/${encodeURIComponent(creds.customerId)}/googleAds:search`
    const rows: GoogleAdsSearchRow[] = []
    let pageToken: string | undefined

    for (let page = 0; page < 5; page++) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
            cache: 'no-store',
            signal: AbortSignal.timeout(15000),
        })
        const json = (await res.json().catch(() => ({}))) as GoogleAdsSearchResponse
        if (!res.ok || json.error) {
            const detail = json.error?.message || `HTTP ${res.status}`
            return {
                rows,
                errorCode: res.status === 401 ? 'TOKEN_EXPIRED' : 'GOOGLE_API_ERROR',
                error: `Erreur Google Ads API (${creds.customerId}) : ${detail}`,
            }
        }
        if (Array.isArray(json.results)) {
            rows.push(...json.results)
        }
        pageToken = json.nextPageToken
        if (!pageToken) break
    }

    return { rows }
}

/** Vérifie la connectivité OAuth2 + Developer Token Google Ads sans importer ni écrire en base. */
export async function testGoogleAdsConnection(
    overrides?: Partial<Omit<GoogleAdsCredentials, 'missing'>>
): Promise<{ success: boolean; message?: string; error?: string }> {
    const creds = await getGoogleAdsCredentials(overrides)
    const tokenRes = await exchangeGoogleAdsAccessToken(creds)
    if (!tokenRes.ok) {
        return { success: false, error: tokenRes.error }
    }

    const res = await runGoogleAdsGaql(
        creds,
        tokenRes.accessToken,
        'SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1'
    )
    if (res.error) {
        return { success: false, error: res.error }
    }

    const cust = res.rows[0]?.customer
    return {
        success: true,
        message: `Compte Google Ads connecté : "${cust?.descriptiveName || creds.customerId}" (${cust?.currencyCode || 'MAD'}).`,
    }
}

/**
 * Importe les dépenses et performances par campagne depuis Google Ads REST API v17.
 */
export async function syncGoogleAdsCampaignSpends(
    preset: AdDatePreset = 'last_30d',
    overrideFxRate?: number
): Promise<{
    success: boolean
    syncedCount: number
    currency?: string
    fxRateToMad?: number
    errorCode?: 'TOKEN_EXPIRED' | 'MISSING_CONFIG' | 'GOOGLE_API_ERROR'
    configPath?: string
    error?: string
}> {
    const creds = await getGoogleAdsCredentials()
    const tokenRes = await exchangeGoogleAdsAccessToken(creds)
    if (!tokenRes.ok) {
        return {
            success: false,
            syncedCount: 0,
            errorCode: tokenRes.errorCode,
            configPath: tokenRes.configPath,
            error: tokenRes.error,
        }
    }

    const windowStart = getPresetWindowStartDate(preset)
    const dateFilter = windowStart
        ? `segments.date BETWEEN '${formatYmd(windowStart)}' AND '${formatYmd(new Date())}' AND `
        : ''

    const gaql =
        'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ' +
        'metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, customer.currency_code ' +
        `FROM campaign WHERE ${dateFilter}campaign.status != 'REMOVED'`

    const gaqlRes = await runGoogleAdsGaql(creds, tokenRes.accessToken, gaql)
    if (gaqlRes.error) {
        return {
            success: false,
            syncedCount: 0,
            errorCode: gaqlRes.errorCode || 'GOOGLE_API_ERROR',
            configPath: META_API_CONFIG_PATH,
            error: gaqlRes.error,
        }
    }

    // Agréger par campagne au cas où plusieurs lignes seraient renvoyées
    const aggregated = new Map<
        string,
        {
            name: string
            status: string
            channelType: string | null
            costMicros: number
            impressions: number
            clicks: number
            conversions: number
            currency: string
        }
    >()

    for (const row of gaqlRes.rows) {
        const cid = String(row.campaign?.id || '')
        if (!cid) continue
        const prev = aggregated.get(cid) || {
            name: String(row.campaign?.name || cid),
            status: String(row.campaign?.status || 'ENABLED'),
            channelType: row.campaign?.advertisingChannelType ? String(row.campaign.advertisingChannelType) : null,
            costMicros: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            currency: String(row.customer?.currencyCode || 'MAD').toUpperCase(),
        }
        prev.costMicros += Number(row.metrics?.costMicros || 0) || 0
        prev.impressions += Number(row.metrics?.impressions || 0) || 0
        prev.clicks += Number(row.metrics?.clicks || 0) || 0
        prev.conversions += Number(row.metrics?.conversions || 0) || 0
        aggregated.set(cid, prev)
    }

    const accountCurrency =
        Array.from(aggregated.values())[0]?.currency ||
        String(gaqlRes.rows[0]?.customer?.currencyCode || 'MAD').toUpperCase()
    const fxRateToMad = await resolveAdFxRateToMad(accountCurrency, overrideFxRate)
    const syncedAt = new Date()
    const dateStartStr = windowStart ? formatYmd(windowStart) : null
    const dateStopStr = formatYmd(syncedAt)
    let syncedCount = 0

    for (const [campaignId, item] of aggregated.entries()) {
        const spend = Math.round((item.costMicros / 1_000_000) * 100) / 100
        if (spend <= 0 && item.status !== 'ENABLED') continue

        const spendMad = Math.round(spend * fxRateToMad * 100) / 100
        const ctr = item.impressions > 0 ? Math.round((item.clicks / item.impressions) * 10000) / 100 : 0
        const cpcMad = item.clicks > 0 ? Math.round((spendMad / item.clicks) * 100) / 100 : 0
        const platformConv = Math.round(item.conversions * 100) / 100
        const statusNormalized = item.status === 'ENABLED' ? 'ACTIVE' : item.status

        await prisma.adCampaignSpend.upsert({
            where: { platform_campaignId_datePreset: { platform: 'GOOGLE', campaignId, datePreset: preset } },
            create: {
                platform: 'GOOGLE',
                campaignId,
                campaignName: item.name.slice(0, 255),
                utmSlug: buildCleanCampaignSlug(item.name),
                channelType: item.channelType,
                status: statusNormalized,
                datePreset: preset,
                currency: item.currency,
                spend,
                spendMad,
                fxRateToMad,
                impressions: item.impressions,
                clicks: item.clicks,
                ctr,
                cpcMad,
                platformConv,
                dateStart: dateStartStr,
                dateStop: dateStopStr,
                syncedAt,
            },
            update: {
                campaignName: item.name.slice(0, 255),
                utmSlug: buildCleanCampaignSlug(item.name),
                channelType: item.channelType,
                status: statusNormalized,
                currency: item.currency,
                spend,
                spendMad,
                fxRateToMad,
                impressions: item.impressions,
                clicks: item.clicks,
                ctr,
                cpcMad,
                platformConv,
                dateStart: dateStartStr,
                dateStop: dateStopStr,
                syncedAt,
            },
        })
        syncedCount++
    }

    await prisma.adCampaignSpend.deleteMany({
        where: { platform: 'GOOGLE', campaignId: { startsWith: 'seed_google_' } },
    })
    await recordAdSyncTimestamp('GOOGLE', syncedAt)

    return { success: true, syncedCount, currency: accountCurrency, fxRateToMad }
}

/** Enregistre les coûts Google Ads poussés directement par Google Ads Script (`AdsApp`). */
export async function ingestGoogleAdsWebhookSpends(payload: {
    preset: AdDatePreset
    currency: string
    dateStart?: string
    dateStop?: string
    campaigns: Array<{
        campaignId: string
        campaignName: string
        status?: string
        channelType?: string
        spend: number
        impressions?: number
        clicks?: number
        conversions?: number
    }>
}): Promise<{ syncedCount: number; fxRateToMad: number }> {
    const currency = (payload.currency || 'MAD').toUpperCase()
    const fxRateToMad = await resolveAdFxRateToMad(currency)
    const syncedAt = new Date()
    let syncedCount = 0

    for (const c of payload.campaigns) {
        const spend = Math.round((Number(c.spend) || 0) * 100) / 100
        const spendMad = Math.round(spend * fxRateToMad * 100) / 100
        const impressions = Math.round(Number(c.impressions) || 0)
        const clicks = Math.round(Number(c.clicks) || 0)
        const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0
        const cpcMad = clicks > 0 ? Math.round((spendMad / clicks) * 100) / 100 : 0
        const rawStatus = (c.status || 'ENABLED').toUpperCase()
        const status = rawStatus === 'ENABLED' ? 'ACTIVE' : rawStatus

        await prisma.adCampaignSpend.upsert({
            where: {
                platform_campaignId_datePreset: {
                    platform: 'GOOGLE',
                    campaignId: String(c.campaignId).slice(0, 100),
                    datePreset: payload.preset,
                },
            },
            create: {
                platform: 'GOOGLE',
                campaignId: String(c.campaignId).slice(0, 100),
                campaignName: String(c.campaignName).slice(0, 255),
                utmSlug: buildCleanCampaignSlug(c.campaignName),
                channelType: c.channelType ? String(c.channelType).slice(0, 80) : 'SEARCH',
                status,
                datePreset: payload.preset,
                currency,
                spend,
                spendMad,
                fxRateToMad,
                impressions,
                clicks,
                ctr,
                cpcMad,
                platformConv: Number(c.conversions) || 0,
                dateStart: payload.dateStart || null,
                dateStop: payload.dateStop || null,
                syncedAt,
            },
            update: {
                campaignName: String(c.campaignName).slice(0, 255),
                utmSlug: buildCleanCampaignSlug(c.campaignName),
                channelType: c.channelType ? String(c.channelType).slice(0, 80) : 'SEARCH',
                status,
                currency,
                spend,
                spendMad,
                fxRateToMad,
                impressions,
                clicks,
                ctr,
                cpcMad,
                platformConv: Number(c.conversions) || 0,
                dateStart: payload.dateStart || null,
                dateStop: payload.dateStop || null,
                syncedAt,
            },
        })
        syncedCount++
    }

    if (syncedCount > 0) {
        await prisma.adCampaignSpend.deleteMany({
            where: { platform: 'GOOGLE', campaignId: { startsWith: 'seed_google_' } },
        })
        await recordAdSyncTimestamp('GOOGLE', syncedAt)
    }

    return { syncedCount, fxRateToMad }
}

/** Génère un script AdsApp prêt à coller dans Google Ads (utile sans Developer Token approuvé). */
export function buildGoogleAdsSpendSyncScript(webhookUrl: string, cronSecret: string): string {
    return `// Script Google Ads (AdsApp) -> Export automatique des coûts campagnes vers Riwaya
function main() {
  var currency = AdsApp.currentAccount().getCurrencyCode();
  var presets = [
    { preset: 'last_7d', range: 'LAST_7_DAYS' },
    { preset: 'last_30d', range: 'LAST_30_DAYS' }
  ];
  for (var i = 0; i < presets.length; i++) {
    var p = presets[i];
    var list = [];
    var it = AdsApp.campaigns().withCondition("Status != REMOVED").forDateRange(p.range).get();
    while (it.hasNext()) {
      var c = it.next();
      var st = c.getStatsFor(p.range);
      list.push({
        campaignId: String(c.getId()),
        campaignName: c.getName(),
        status: c.isEnabled() ? 'ENABLED' : 'PAUSED',
        channelType: typeof c.getAdvertisingChannelType === 'function' ? c.getAdvertisingChannelType() : 'SEARCH',
        spend: st.getCost(),
        impressions: st.getImpressions(),
        clicks: st.getClicks(),
        conversions: st.getConversions()
      });
    }
    UrlFetchApp.fetch(${JSON.stringify(webhookUrl)}, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ${JSON.stringify(cronSecret)} },
      payload: JSON.stringify({ preset: p.preset, currency: currency, campaigns: list }),
      muteHttpExceptions: true
    });
  }
}`
}

