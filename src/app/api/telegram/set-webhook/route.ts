import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { setTelegramWebhook } from '@/lib/telegram'

export async function POST(req: Request) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })
        
        const { botToken, webhookUrl } = await req.json()
        
        if (!botToken || !webhookUrl) {
            return NextResponse.json({ ok: false, error: 'Token ou Webhook URL manquant' }, { status: 400 })
        }

        const parsedWebhookUrl = new URL(webhookUrl)
        const configuredOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store')
        if (parsedWebhookUrl.protocol !== 'https:' || parsedWebhookUrl.origin !== configuredOrigin.origin) {
            return NextResponse.json({ ok: false, error: 'URL de webhook non autoris\u00e9e' }, { status: 400 })
        }

        const res = await setTelegramWebhook(webhookUrl, botToken)

        if (!res.ok) {
            return NextResponse.json({ ok: false, error: res.description || 'Erreur lors de la configuration du webhook' }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ ok: false, error: message }, { status: 500 })
    }
}
