import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { syncGoogleAdsCampaignSpends } from '@/lib/server/google-ads-insights'
import type { AdDatePreset } from '@/lib/server/ads-fx'

export const dynamic = 'force-dynamic'

const PRESETS_TO_SYNC: AdDatePreset[] = ['last_7d', 'last_30d', 'maximum']

/**
 * Endpoint Cron pour importer automatiquement les coûts par campagne Google Ads (REST API v17).
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const results: Array<{ preset: AdDatePreset; success: boolean; syncedCount: number; error?: string }> = []
        for (const preset of PRESETS_TO_SYNC) {
            const res = await syncGoogleAdsCampaignSpends(preset)
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
                { success: false, error: results[0]?.error || 'Échec synchronisation Google Ads', results },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Coûts Google Ads importés avec succès.',
            results,
        })
    } catch {
        return NextResponse.json({ success: false, error: 'Erreur serveur Cron Google Ads' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    return GET(req)
}

