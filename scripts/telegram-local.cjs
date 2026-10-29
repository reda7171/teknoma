require('dotenv').config({ quiet: true })
const { PrismaClient } = require('@prisma/client')
const { createHash } = require('node:crypto')

const prisma = new PrismaClient()
const baseUrl = new URL(process.env.TELEGRAM_LOCAL_URL || 'http://localhost:3000')
if (!['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)) {
    throw new Error('TELEGRAM_LOCAL_URL must point to localhost')
}

async function main() {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
    const token = setting?.value || process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('Telegram bot token is missing')
    async function telegram(method, body) {
        const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), signal: AbortSignal.timeout(40000),
        })
        const result = await response.json()
        if (!result.ok) throw new Error(`Telegram ${method} failed (${result.error_code})`)
        return result.result
    }
    const webhook = await telegram('getWebhookInfo', {})
    if (webhook.url) throw new Error('This bot has an active webhook; local polling was not started')
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || createHash('sha256').update(token).digest('hex')
    let offset = 0
    console.log(`Telegram relay ready: ${baseUrl.origin}`)
    for (;;) {
        try {
            const updates = await telegram('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] })
            for (const update of updates) {
                if (update.callback_query) {
                    const response = await fetch(new URL('/api/webhooks/telegram', baseUrl), {
                        method: 'POST', redirect: 'error',
                        headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret },
                        body: JSON.stringify(update), signal: AbortSignal.timeout(30000),
                    })
                    if (!response.ok) throw new Error(`Local webhook returned HTTP ${response.status}`)
                    console.log('Telegram button processed')
                }
                offset = update.update_id + 1
            }
        } catch (error) {
            // Avoid printing network exceptions that could contain the bot token.
            console.error(error.message?.startsWith('Local webhook') ? error.message : 'Telegram relay unavailable; retrying in 3 seconds')
            await new Promise(resolve => setTimeout(resolve, 3000))
        }
    }
}

main().catch(() => { console.error('Telegram relay could not start: check bot configuration and webhook'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
