import 'server-only'

import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function isAuthorizedTelegramWebhook(request: Request) {
    const tokenSetting = await prisma.siteSettings.findUnique({
        where: { key: 'telegram_bot_token' },
        select: { value: true }
    })
    const botToken = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || ''
    if (!botToken) return false

    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
    const legacyQuerySecret = new URL(request.url).searchParams.get('token')

    return safeSecretEqual(headerSecret, getTelegramWebhookSecret(botToken))
        || safeSecretEqual(legacyQuerySecret, botToken)
}

export function getTelegramWebhookSecret(botToken: string) {
    return process.env.TELEGRAM_WEBHOOK_SECRET || createHash('sha256').update(botToken).digest('hex')
}

function safeSecretEqual(provided: string | null, expected: string) {
    if (!provided || !expected) return false
    const expectedBuffer = Buffer.from(expected)
    const providedBuffer = Buffer.from(provided)
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
}
