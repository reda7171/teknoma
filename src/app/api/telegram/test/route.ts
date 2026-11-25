import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * Envoie un message de test Telegram depuis l'admin.
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
        let chatId = typeof body?.chatId === 'string' ? body.chatId.trim() : ''

        // Fallback sur les paramètres enregistrés en base si champs vides
        if (!botToken) {
            const s = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
            botToken = (s?.value || process.env.TELEGRAM_BOT_TOKEN || '').trim()
        }
        if (!chatId) {
            const s = await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } })
            chatId = (s?.value || process.env.TELEGRAM_CHAT_ID || '').trim()
        }

        if (!botToken || !chatId) {
            return NextResponse.json(
                { ok: false, error: 'Bot Token ou Chat ID manquant' },
                { status: 400 }
            )
        }

        const text =
            '✅ <b>Test Tekno Store réussi !</b>\n\n' +
            'Votre bot Telegram est correctement connecté à <b>tekno.ma</b> et prêt à recevoir vos notifications.'

        const tgRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        })

        const tgData = await tgRes.json().catch(() => null)

        if (!tgRes.ok || !tgData?.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: tgData?.description || `Erreur API Telegram (${tgRes.status})`,
                },
                { status: 400 }
            )
        }

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: false, error: 'Erreur lors de l\'envoi vers Telegram' }, { status: 500 })
    }
}
