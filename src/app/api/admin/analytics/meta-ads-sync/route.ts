import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeAdminApi } from '@/lib/api-authorization'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { getCronSecret } from '@/lib/cron-auth'
import { createAuditLog } from '@/lib/server/audit'
import {
    getUnifiedAdsRoasReport,
    type AdPlatformFilter,
    type AdSyncWarning,
} from '@/lib/server/ads-roas-report'
import { syncMetaCampaignSpends } from '@/lib/server/meta-ads-insights'
import { syncGoogleAdsCampaignSpends, buildGoogleAdsSpendSyncScript } from '@/lib/server/google-ads-insights'
import type { AdDatePreset } from '@/lib/server/ads-fx'

export const dynamic = 'force-dynamic'

const PresetSchema = z.enum(['last_7d', 'last_30d', 'maximum']).default('last_30d')
const PlatformSchema = z.enum(['ALL', 'META', 'GOOGLE']).default('ALL')

const SyncBodySchema = z.object({
    preset: PresetSchema,
    platform: PlatformSchema.default('ALL'),
    fxRate: z.number().min(0.1).max(50).optional(),
})

/**
 * GET /api/admin/analytics/meta-ads-sync
 * Retourne le rapport ROAS consolidé (Meta Ads + Google Ads) ou génère le script AdsApp (ADMIN).
 */
export async function GET(req: Request) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const ip = await getIpIdentifier()
    const rl = await rateLimit(`ads-roas-get:${ip}`, { limit: 60, windowMs: 60_000 })
    if (!rl.success) {
        return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'google-script') {
        const adminOnly = await authorizeAdminApi(['ADMIN'])
        if (adminOnly) return adminOnly

        const cronSecret = getCronSecret()
        if (!cronSecret) {
            return NextResponse.json(
                { success: false, error: 'Variable serveur CRON_SECRET absente (.env).' },
                { status: 500 }
            )
        }
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.riwaya.store').replace(/\/$/, '')
        const script = buildGoogleAdsSpendSyncScript(`${siteUrl}/api/webhooks/google-ads/spend`, cronSecret)
        return NextResponse.json({ success: true, script })
    }

    try {
        const presetParsed = PresetSchema.safeParse(url.searchParams.get('preset') || 'last_30d')
        const platformParsed = PlatformSchema.safeParse(url.searchParams.get('platform') || 'ALL')
        const preset: AdDatePreset = presetParsed.success ? presetParsed.data : 'last_30d'
        const platformFilter: AdPlatformFilter = platformParsed.success ? platformParsed.data : 'ALL'
        const auto = url.searchParams.get('auto') !== '0'

        const report = await getUnifiedAdsRoasReport({
            preset,
            platformFilter,
            autoSyncIfStale: auto,
        })
        return NextResponse.json({ success: true, report })
    } catch {
        return NextResponse.json(
            { success: false, error: 'Impossible de charger les données ROAS.' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/analytics/meta-ads-sync
 * Force la synchronisation des coûts Meta Ads et/ou Google Ads et recalcule le ROAS réel.
 */
export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const ip = await getIpIdentifier()
    const rl = await rateLimit(`ads-roas-post:${ip}`, { limit: 20, windowMs: 60_000 })
    if (!rl.success) {
        return NextResponse.json({ error: 'Trop de requêtes de synchronisation' }, { status: 429 })
    }

    try {
        const rawBody = await req.json().catch(() => ({}))
        const parsed = SyncBodySchema.safeParse(rawBody)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Paramètres invalides.' }, { status: 400 })
        }

        const { preset, platform, fxRate } = parsed.data
        const syncedPlatforms: string[] = []
        const syncWarnings: AdSyncWarning[] = []
        let syncedCount = 0

        if (platform === 'ALL' || platform === 'META') {
            const metaRes = await syncMetaCampaignSpends(preset, fxRate)
            if (metaRes.success) {
                syncedCount += metaRes.syncedCount
                syncedPlatforms.push(`Meta(${metaRes.syncedCount})`)
            } else if (metaRes.error && (platform === 'META' || metaRes.errorCode !== 'MISSING_CONFIG')) {
                syncWarnings.push({
                    platform: 'META',
                    error: metaRes.error,
                    errorCode: metaRes.errorCode,
                    configPath: metaRes.configPath,
                })
            }
        }

        if (platform === 'ALL' || platform === 'GOOGLE') {
            const gRes = await syncGoogleAdsCampaignSpends(preset, fxRate)
            if (gRes.success) {
                syncedCount += gRes.syncedCount
                syncedPlatforms.push(`Google(${gRes.syncedCount})`)
            } else if (gRes.error && (platform === 'GOOGLE' || gRes.errorCode !== 'MISSING_CONFIG')) {
                syncWarnings.push({
                    platform: 'GOOGLE',
                    error: gRes.error,
                    errorCode: gRes.errorCode,
                    configPath: gRes.configPath,
                })
            }
        }

        const report = await getUnifiedAdsRoasReport({
            preset,
            platformFilter: platform,
            autoSyncIfStale: false,
        })
        if (syncWarnings.length > 0) {
            report.warnings = syncWarnings
        }

        const overallSuccess = syncedPlatforms.length > 0 || syncWarnings.length === 0
        if (syncedCount > 0) {
            await createAuditLog({
                action: 'SYNC',
                entity: 'CAMPAIGN',
                entityId: `${platform}:${preset}`,
                details: `Import coûts Ads (${preset}) : ${syncedPlatforms.join(', ')}`,
            })
        }

        return NextResponse.json({
            success: overallSuccess && syncWarnings.length === 0,
            syncedCount,
            error: syncWarnings[0]?.error,
            errorCode: syncWarnings[0]?.errorCode,
            configPath: syncWarnings[0]?.configPath,
            report,
        })
    } catch {
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la synchronisation des coûts Ads.' },
            { status: 500 }
        )
    }
}
