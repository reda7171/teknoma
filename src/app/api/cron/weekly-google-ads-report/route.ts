import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { sendWeeklyGoogleAdsCodReport } from '@/lib/server/google-ads-reporting'

export const dynamic = 'force-dynamic'

/**
 * Endpoint Cron Hebdomadaire pour le rapport Google Ads COD sur Telegram
 * Déclenché chaque semaine (ex: lundi à 09h00) via Crontab VPS, Vercel Cron, ou n8n.
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await sendWeeklyGoogleAdsCodReport(7)

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Rapport hebdomadaire Google Ads COD transmis à Telegram avec succès.',
            summary: result.summary
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || 'Erreur serveur' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    return GET(req)
}
