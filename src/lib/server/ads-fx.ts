import 'server-only'

import { prisma } from '@/lib/prisma'
import { invalidateSettingsCache } from '@/lib/server/site-settings'
import { slugifyCampaignName } from '@/lib/utils/utm'

export type AdPlatform = 'META' | 'GOOGLE'
export type AdDatePreset = 'last_7d' | 'last_30d' | 'maximum'

const DEFAULT_FX_RATES: Record<string, number> = {
    MAD: 1,
    USD: 10.0,
    EUR: 10.8,
}

export function formatYmd(date: Date): string {
    return date.toISOString().slice(0, 10)
}

export function getPresetWindowStartDate(preset: AdDatePreset): Date | null {
    if (preset === 'maximum') return null
    const days = preset === 'last_7d' ? 7 : 30
    const d = new Date()
    d.setDate(d.getDate() - (days - 1))
    d.setHours(0, 0, 0, 0)
    return d
}

export function buildCleanCampaignSlug(campaignName: string): string {
    const withoutPrefix = campaignName.replace(/^\[riwaya\]\s*/i, '').trim()
    return slugifyCampaignName(withoutPrefix)
}

/** Résout et mémorise le taux de change devise (USD/EUR) -> MAD depuis SiteSettings. */
export async function resolveAdFxRateToMad(currency: string, overrideFxRate?: number): Promise<number> {
    const upper = (currency || 'MAD').toUpperCase()
    if (upper === 'MAD') return 1

    const settingKey = upper === 'EUR' ? 'ads_fx_rate_eur' : 'ads_fx_rate_usd'
    if (overrideFxRate && overrideFxRate > 0) {
        await prisma.siteSettings.upsert({
            where: { key: settingKey },
            create: {
                key: settingKey,
                value: String(overrideFxRate),
                category: 'api',
                description: `Taux de change Ads ${upper} vers MAD`,
            },
            update: { value: String(overrideFxRate) },
        })
        invalidateSettingsCache([settingKey])
        return overrideFxRate
    }

    const stored = await prisma.siteSettings.findUnique({ where: { key: settingKey } })
    const parsed = stored?.value ? parseFloat(stored.value) : NaN
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return DEFAULT_FX_RATES[upper] || 10.0
}

/** Enregistre la date de dernière synchro d'une plateforme publicitaire. */
export async function recordAdSyncTimestamp(platform: AdPlatform, syncedAt: Date): Promise<void> {
    const key = platform === 'GOOGLE' ? 'google_ads_last_sync_at' : 'meta_ads_last_sync_at'
    await prisma.siteSettings.upsert({
        where: { key },
        create: {
            key,
            value: syncedAt.toISOString(),
            category: 'api',
            description: `Dernière synchronisation ${platform} Ads`,
        },
        update: { value: syncedAt.toISOString() },
    })
    invalidateSettingsCache([key])
}

