import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { preindexCatalogCovers } from '@/lib/actions/gemini-cache'
import { sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/**
 * Tâche cron nocturne : Indexation pré-calculée des couvertures des nouveaux arrivages
 * Fréquence recommandée : 1x par nuit (ex: 03:00)
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await preindexCatalogCovers({ bypassAuth: true })

        if (result.success && result.indexedCount > 0) {
            try {
                await sendTelegramMessage(
                    `📸 <b>Indexation Nocturne Couvertures (Gemini)</b>\n\n` +
                    `✅ <b>${result.indexedCount}</b> nouvelle(s) couverture(s) indexée(s) dans le cache.\n` +
                    `📦 Ignorées (déjà en cache): ${result.skippedCount}\n` +
                    `⚡ Total analysé: ${result.totalProcessed}`
                )
            } catch (tgErr) {
                console.warn('[Cron Index Covers] Erreur notification Telegram:', tgErr)
            }
        }

        return NextResponse.json({
            success: result.success,
            indexedCount: result.indexedCount,
            skippedCount: result.skippedCount,
            errorsCount: result.errorsCount,
            totalProcessed: result.totalProcessed,
            message: result.message
        })
    } catch (error: any) {
        console.error('[Cron Index Covers] Erreur:', error)
        return NextResponse.json({ success: false, error: error?.message || 'Erreur interne' }, { status: 500 })
    }
}
