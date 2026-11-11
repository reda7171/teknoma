import 'server-only'

import { prisma } from '@/lib/prisma'
import { slugifyCampaignName } from '@/lib/utils/utm'
import { getMetaAdsCredentials, META_API_CONFIG_PATH, type MetaApiErrorCode } from '@/lib/server/meta-ads-client'
import { getGoogleAdsCredentials } from '@/lib/server/google-ads-client'
import { syncMetaCampaignSpends } from '@/lib/server/meta-ads-insights'
import { syncGoogleAdsCampaignSpends } from '@/lib/server/google-ads-insights'
import {
    type AdPlatform,
    type AdDatePreset,
    getPresetWindowStartDate,
    resolveAdFxRateToMad,
} from '@/lib/server/ads-fx'

export type AdPlatformFilter = 'ALL' | AdPlatform

export interface AdSyncWarning {
    platform: AdPlatform
    error: string
    errorCode?: MetaApiErrorCode | 'GOOGLE_API_ERROR'
    configPath?: string
}

export interface AdCampaignRoasRow {
    platform: AdPlatform
    campaignId: string
    campaignName: string
    utmSlug: string
    channelType: string | null
    status: string
    currency: string
    spend: number
    spendMad: number
    fxRateToMad: number
    impressions: number
    clicks: number
    ctr: number
    cpcMad: number
    platformConv: number
    codTotalOrders: number
    codDeliveredOrders: number
    codCancelledOrders: number
    codDeliveryRate: number
    codGrossRevenue: number
    codDeliveredRevenue: number
    realRoas: number
    grossRoas: number
    cpaMad: number
    netMarginMad: number
    dateStart: string | null
    dateStop: string | null
    syncedAt: string
}

export interface PlatformRoasBreakdown {
    spendMad: number
    deliveredRevenue: number
    orders: number
    deliveredOrders: number
    realRoas: number
}

export interface UnifiedAdsRoasReport {
    preset: AdDatePreset
    platformFilter: AdPlatformFilter
    hasMetaCredentials: boolean
    hasGoogleCredentials: boolean
    accountCurrency: string
    fxRateToMad: number
    lastSyncedAt: string | null
    warnings: AdSyncWarning[]
    summary: {
        totalSpendOriginal: number
        totalSpendMad: number
        totalImpressions: number
        totalClicks: number
        avgCtr: number
        totalOrders: number
        totalDeliveredOrders: number
        totalDeliveredRevenue: number
        totalGrossRevenue: number
        unmatchedOrdersCount: number
        unmatchedDeliveredRevenue: number
        globalRealRoas: number
        globalGrossRoas: number
        globalCpaMad: number
        globalNetMarginMad: number
        byPlatform: {
            META: PlatformRoasBreakdown
            GOOGLE: PlatformRoasBreakdown
        }
    }
    campaigns: AdCampaignRoasRow[]
}

const STALE_SYNC_MS = 2 * 60 * 60 * 1000
const META_SOURCES = new Set(['facebook', 'fb', 'instagram', 'ig', 'meta', 'paid_social'])
const GOOGLE_SOURCES = new Set(['google', 'google_ads', 'adwords', 'sem'])

interface CampaignLookup {
    ids: Map<string, string>
    names: Map<string, string>
    slugs: Map<string, string>
}

function createLookup(): CampaignLookup {
    return { ids: new Map(), names: new Map(), slugs: new Map() }
}

function indexCampaign(lookup: CampaignLookup, compositeKey: string, campaignId: string, name: string, utmSlug: string) {
    lookup.ids.set(campaignId, compositeKey)
    lookup.names.set(name.toLowerCase(), compositeKey)
    lookup.slugs.set(utmSlug, compositeKey)
    const fullSlug = slugifyCampaignName(name)
    if (!lookup.slugs.has(fullSlug)) lookup.slugs.set(fullSlug, compositeKey)
}

function resolveCampaignKey(orderUtmCampaign: string | null, lookup: CampaignLookup): string | null {
    if (!orderUtmCampaign) return null
    const raw = orderUtmCampaign.trim()
    if (!raw) return null

    if (lookup.ids.has(raw)) return lookup.ids.get(raw) || null
    const lower = lookup.names.get(raw.toLowerCase())
    if (lower) return lower

    const slug = slugifyCampaignName(raw.replace(/^\[riwaya\]\s*/i, ''))
    return lookup.slugs.get(slug) || null
}

/**
 * Agrège les coûts importés (Meta Ads + Google Ads) et calcule le ROAS COD réel par campagne.
 */
export async function getUnifiedAdsRoasReport(options: {
    preset?: AdDatePreset
    platformFilter?: AdPlatformFilter
    autoSyncIfStale?: boolean
} = {}): Promise<UnifiedAdsRoasReport> {
    const preset: AdDatePreset = options.preset || 'last_30d'
    const platformFilter: AdPlatformFilter = options.platformFilter || 'ALL'

    const [metaCreds, googleCreds] = await Promise.all([
        getMetaAdsCredentials(false),
        getGoogleAdsCredentials(),
    ])
    const warnings: AdSyncWarning[] = []

    const fetchCached = () =>
        prisma.adCampaignSpend.findMany({
            where: {
                datePreset: preset,
                ...(platformFilter !== 'ALL' ? { platform: platformFilter } : {}),
            },
            orderBy: [{ spendMad: 'desc' }, { syncedAt: 'desc' }],
        })

    let cachedRows = await fetchCached()

    if (options.autoSyncIfStale !== false) {
        const nowMs = Date.now()
        const maxSyncFor = (plat: AdPlatform) =>
            cachedRows
                .filter((r) => r.platform === plat)
                .reduce((m, r) => Math.max(m, r.syncedAt ? r.syncedAt.getTime() : 0), 0)

        const needMeta =
            (platformFilter === 'ALL' || platformFilter === 'META') &&
            !metaCreds.missing &&
            nowMs - maxSyncFor('META') > STALE_SYNC_MS

        const needGoogle =
            (platformFilter === 'ALL' || platformFilter === 'GOOGLE') &&
            !googleCreds.missing &&
            nowMs - maxSyncFor('GOOGLE') > STALE_SYNC_MS

        let refreshedAny = false
        if (needMeta) {
            const res = await syncMetaCampaignSpends(preset)
            if (res.success) refreshedAny = true
            else if (res.error) {
                warnings.push({
                    platform: 'META',
                    error: res.error,
                    errorCode: res.errorCode,
                    configPath: res.configPath || META_API_CONFIG_PATH,
                })
            }
        }
        if (needGoogle) {
            const res = await syncGoogleAdsCampaignSpends(preset)
            if (res.success) refreshedAny = true
            else if (res.error) {
                warnings.push({
                    platform: 'GOOGLE',
                    error: res.error,
                    errorCode: res.errorCode,
                    configPath: res.configPath || META_API_CONFIG_PATH,
                })
            }
        }
        if (refreshedAny) {
            cachedRows = await fetchCached()
        }
    }

    const lookups: Record<AdPlatform, CampaignLookup> = {
        META: createLookup(),
        GOOGLE: createLookup(),
    }
    const rowMap = new Map<string, AdCampaignRoasRow>()

    for (const c of cachedRows) {
        const plat: AdPlatform = c.platform === 'GOOGLE' ? 'GOOGLE' : 'META'
        const compositeKey = `${plat}:${c.campaignId}`
        indexCampaign(lookups[plat], compositeKey, c.campaignId, c.campaignName, c.utmSlug)

        rowMap.set(compositeKey, {
            platform: plat,
            campaignId: c.campaignId,
            campaignName: c.campaignName,
            utmSlug: c.utmSlug,
            channelType: c.channelType,
            status: c.status,
            currency: c.currency,
            spend: c.spend,
            spendMad: c.spendMad,
            fxRateToMad: c.fxRateToMad,
            impressions: c.impressions,
            clicks: c.clicks,
            ctr: c.ctr,
            cpcMad: c.cpcMad,
            platformConv: c.platformConv,
            codTotalOrders: 0,
            codDeliveredOrders: 0,
            codCancelledOrders: 0,
            codDeliveryRate: 0,
            codGrossRevenue: 0,
            codDeliveredRevenue: 0,
            realRoas: 0,
            grossRoas: 0,
            cpaMad: 0,
            netMarginMad: -Math.round(c.spendMad),
            dateStart: c.dateStart,
            dateStop: c.dateStop,
            syncedAt: c.syncedAt.toISOString(),
        })
    }

    const windowStart = getPresetWindowStartDate(preset)
    const orders = await prisma.order.findMany({
        where: {
            ...(windowStart ? { createdAt: { gte: windowStart } } : {}),
            OR: [
                { utmCampaign: { not: null } },
                { utmSource: { not: null } },
                { utmMedium: { not: null } },
                { fbclid: { not: null } },
                { comment: { contains: 'gclid:' } },
            ],
        },
        select: {
            id: true,
            total: true,
            status: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            fbclid: true,
            comment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
    })

    const platformStats: Record<AdPlatform, { spendMad: number; deliveredRevenue: number; orders: number; deliveredOrders: number }> = {
        META: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0 },
        GOOGLE: { spendMad: 0, deliveredRevenue: 0, orders: 0, deliveredOrders: 0 },
    }

    let matchedDeliveredRevenue = 0
    let unmatchedDeliveredRevenue = 0
    let unmatchedOrdersCount = 0
    let totalOrders = 0
    let totalDeliveredOrders = 0
    let totalGrossRevenue = 0

    for (const order of orders) {
        const src = (order.utmSource || '').toLowerCase().trim()
        const med = (order.utmMedium || '').toLowerCase().trim()
        const isMeta = META_SOURCES.has(src) || Boolean(order.fbclid)
        const isGoogle =
            !isMeta &&
            (GOOGLE_SOURCES.has(src) ||
                (order.comment || '').toLowerCase().includes('gclid:') ||
                (med === 'cpc' && (!src || src === 'google')))

        // Ignorer les autres sources externes (Avito, TikTok, etc.)
        if (src && !isMeta && !isGoogle) continue

        let matchedKey: string | null = null
        let resolvedPlatform: AdPlatform | null = isMeta ? 'META' : isGoogle ? 'GOOGLE' : null

        if (isMeta) {
            matchedKey = resolveCampaignKey(order.utmCampaign, lookups.META)
        } else if (isGoogle) {
            matchedKey = resolveCampaignKey(order.utmCampaign, lookups.GOOGLE)
        } else {
            matchedKey =
                resolveCampaignKey(order.utmCampaign, lookups.META) ||
                resolveCampaignKey(order.utmCampaign, lookups.GOOGLE)
            if (matchedKey) {
                resolvedPlatform = matchedKey.startsWith('GOOGLE:') ? 'GOOGLE' : 'META'
            }
        }

        if (!resolvedPlatform) continue
        if (platformFilter !== 'ALL' && resolvedPlatform !== platformFilter) continue

        const orderTotal = Number(order.total || 0)
        const isDelivered = order.status === 'DELIVERED'
        const isCancelled = order.status === 'CANCELLED' || order.status === 'RETURNED'

        totalOrders++
        totalGrossRevenue += orderTotal
        platformStats[resolvedPlatform].orders++
        if (isDelivered) {
            totalDeliveredOrders++
            platformStats[resolvedPlatform].deliveredOrders++
            platformStats[resolvedPlatform].deliveredRevenue += orderTotal
        }

        if (matchedKey) {
            const row = rowMap.get(matchedKey)
            if (!row) continue
            row.codTotalOrders++
            row.codGrossRevenue += orderTotal
            if (isDelivered) {
                row.codDeliveredOrders++
                row.codDeliveredRevenue += orderTotal
                matchedDeliveredRevenue += orderTotal
            } else if (isCancelled) {
                row.codCancelledOrders++
            }
        } else {
            unmatchedOrdersCount++
            if (isDelivered) unmatchedDeliveredRevenue += orderTotal
        }
    }

    let totalSpendOriginal = 0
    let totalSpendMad = 0
    let totalImpressions = 0
    let totalClicks = 0
    let latestSyncMs = 0

    const campaigns = Array.from(rowMap.values()).map((c) => {
        totalSpendOriginal += c.spend
        totalSpendMad += c.spendMad
        platformStats[c.platform].spendMad += c.spendMad
        totalImpressions += c.impressions
        totalClicks += c.clicks
        latestSyncMs = Math.max(latestSyncMs, new Date(c.syncedAt).getTime())

        const deliveredRevenue = Math.round(c.codDeliveredRevenue)
        const grossRevenue = Math.round(c.codGrossRevenue)
        const spendMad = Math.round(c.spendMad * 100) / 100

        return {
            ...c,
            codDeliveredRevenue: deliveredRevenue,
            codGrossRevenue: grossRevenue,
            codDeliveryRate: c.codTotalOrders > 0 ? Math.round((c.codDeliveredOrders / c.codTotalOrders) * 100) : 0,
            realRoas: spendMad > 0 ? Number((deliveredRevenue / spendMad).toFixed(2)) : 0,
            grossRoas: spendMad > 0 ? Number((grossRevenue / spendMad).toFixed(2)) : 0,
            cpaMad: c.codDeliveredOrders > 0 ? Math.round(spendMad / c.codDeliveredOrders) : 0,
            netMarginMad: Math.round(deliveredRevenue - spendMad),
        }
    })

    const totalDeliveredRevenue = Math.round(matchedDeliveredRevenue + unmatchedDeliveredRevenue)
    const roundedSpendMad = Math.round(totalSpendMad * 100) / 100
    const accountCurrency = campaigns[0]?.currency || 'MAD'
    const fxRateToMad =
        campaigns[0]?.fxRateToMad ||
        (accountCurrency === 'MAD' ? 1 : await resolveAdFxRateToMad(accountCurrency))

    const buildPlatformBreakdown = (plat: AdPlatform): PlatformRoasBreakdown => {
        const s = platformStats[plat]
        const spend = Math.round(s.spendMad * 100) / 100
        const rev = Math.round(s.deliveredRevenue)
        return {
            spendMad: spend,
            deliveredRevenue: rev,
            orders: s.orders,
            deliveredOrders: s.deliveredOrders,
            realRoas: spend > 0 ? Number((rev / spend).toFixed(2)) : 0,
        }
    }

    return {
        preset,
        platformFilter,
        hasMetaCredentials: !metaCreds.missing,
        hasGoogleCredentials: !googleCreds.missing,
        accountCurrency,
        fxRateToMad,
        lastSyncedAt: latestSyncMs > 0 ? new Date(latestSyncMs).toISOString() : null,
        warnings,
        summary: {
            totalSpendOriginal: Math.round(totalSpendOriginal * 100) / 100,
            totalSpendMad: roundedSpendMad,
            totalImpressions,
            totalClicks,
            avgCtr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
            totalOrders,
            totalDeliveredOrders,
            totalDeliveredRevenue,
            totalGrossRevenue: Math.round(totalGrossRevenue),
            unmatchedOrdersCount,
            unmatchedDeliveredRevenue: Math.round(unmatchedDeliveredRevenue),
            globalRealRoas: roundedSpendMad > 0 ? Number((totalDeliveredRevenue / roundedSpendMad).toFixed(2)) : 0,
            globalGrossRoas: roundedSpendMad > 0 ? Number((totalGrossRevenue / roundedSpendMad).toFixed(2)) : 0,
            globalCpaMad: totalDeliveredOrders > 0 ? Math.round(roundedSpendMad / totalDeliveredOrders) : 0,
            globalNetMarginMad: Math.round(totalDeliveredRevenue - roundedSpendMad),
            byPlatform: {
                META: buildPlatformBreakdown('META'),
                GOOGLE: buildPlatformBreakdown('GOOGLE'),
            },
        },
        campaigns,
    }
}

