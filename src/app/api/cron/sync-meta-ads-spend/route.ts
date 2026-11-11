import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { syncMetaCampaignSpends } from '@/lib/server/meta-ads-insights'
import type { AdDatePreset } from '@/lib/server/ads-fx'

export const dynamic = 'force-dynamic'

const PRESETS_TO_SYNC: AdDatePreset[] = ['last_7d', 'last_30d', 'maximum']

/**
 * Endpoint Cron quotidien/bi-horaire pour importer les coûts par campagne Meta Ads.
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const results: Array<{ preset: AdDatePreset; success: boolean; syncedCount: number; error?: string }> = []
        for (const preset of PRESETS_TO_SYNC) {
            const res = await syncMetaCampaignSpends(preset)
            results.push({
                preset,
                success: res.success,
                syncedCount: res.syncedCount,
                ...(res.error ? { error: res.error } : {}),
            })
        }

        const allFailed = results.every((r) => !r.success)
        if (allFailed) {
            return NextResponse.json(
                { success: false, error: results[0]?.error || 'Échec synchronisation Meta Ads', results },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Coûts Meta Ads importés avec succès.',
            results,
        })
    } catch {
        return NextResponse.json({ success: false, error: 'Erreur serveur Cron Meta Ads' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    return GET(req)
}
