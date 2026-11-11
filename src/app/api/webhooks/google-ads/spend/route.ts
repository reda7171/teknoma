import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { ingestGoogleAdsWebhookSpends } from '@/lib/server/google-ads-insights'

export const dynamic = 'force-dynamic'

const GoogleAdsSpendWebhookSchema = z.object({
    preset: z.enum(['last_7d', 'last_30d', 'maximum']).default('last_30d'),
    currency: z.string().trim().min(3).max(10).default('MAD'),
    dateStart: z.string().trim().max(20).optional(),
    dateStop: z.string().trim().max(20).optional(),
    campaigns: z
        .array(
            z.object({
                campaignId: z.string().trim().min(1).max(100),
                campaignName: z.string().trim().min(1).max(255),
                status: z.string().trim().max(50).optional(),
                channelType: z.string().trim().max(80).optional(),
                spend: z.number().min(0).max(10_000_000),
                impressions: z.number().int().min(0).optional(),
                clicks: z.number().int().min(0).optional(),
                conversions: z.number().min(0).optional(),
            })
        )
        .max(200),
})

/**
 * Webhook sécurisé recevant les coûts Google Ads poussés automatiquement par un Script AdsApp.
 */
export async function POST(req: Request) {
    const ip = await getIpIdentifier()
    const rl = await rateLimit(`google-ads-spend-webhook:${ip}`, { limit: 30, windowMs: 60_000 })
    if (!rl.success) {
        return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    if (!isAuthorizedCronRequest(req)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try {
        const rawBody = await req.json()
        const parsed = GoogleAdsSpendWebhookSchema.safeParse(rawBody)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Payload Google Ads invalide' }, { status: 400 })
        }

        const result = await ingestGoogleAdsWebhookSpends(parsed.data)
        return NextResponse.json({
            success: true,
            syncedCount: result.syncedCount,
            fxRateToMad: result.fxRateToMad,
        })
    } catch {
        return NextResponse.json({ success: false, error: 'Erreur lors de la sauvegarde Google Ads' }, { status: 500 })
    }
}

