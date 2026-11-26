import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * Récupère le statut en direct du bot Telegram (getMe) et de son webhook (getWebhookInfo).
 */
export async function POST(req: Request) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) {
            return NextResponse.json({ ok: false, error: 'Authentification requise' }, { status: 401 })
        }
        if (!hasAdminRole(admin, ['ADMIN'])) {
            return NextResponse.json({ ok: false, error: 'Accès interdit' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        let botToken = typeof body?.botToken === 'string' ? body.botToken.trim() : ''

        if (!botToken) {
            const s = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
            botToken = (s?.value || process.env.TELEGRAM_BOT_TOKEN || '').trim()
        }

        if (!botToken) {
            return NextResponse.json({ ok: false, error: 'Bot Token manquant' }, { status: 400 })
        }

        const baseUrl = `https://api.telegram.org/bot${encodeURIComponent(botToken)}`
        const [meRes, whRes] = await Promise.all([
            fetch(`${baseUrl}/getMe`, { cache: 'no-store' }),
            fetch(`${baseUrl}/getWebhookInfo`, { cache: 'no-store' }),
        ])

        const [meData, whData] = await Promise.all([
            meRes.json().catch(() => null),
            whRes.json().catch(() => null),
        ])

        if (!meRes.ok || !meData?.ok) {
            return NextResponse.json(
                { ok: false, error: meData?.description || 'Token Telegram invalide' },
                { status: 400 }
            )
        }

        const wh = whData?.ok ? whData.result : null

        return NextResponse.json({
            ok: true,
            bot: {
                id: meData.result.id,
                username: meData.result.username,
                firstName: meData.result.first_name,
            },
            webhook: {
                url: wh?.url || '',
                pendingUpdateCount: wh?.pending_update_count ?? 0,
                lastErrorMessage: wh?.last_error_message || '',
                lastErrorDate: wh?.last_error_date || null,
            },
        })
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Impossible de joindre l\'API Telegram' },
            { status: 500 }
        )
    }
}
