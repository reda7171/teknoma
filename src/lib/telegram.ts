// Lib Telegram Bot - Envoi de messages et notifications
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

/**
 * Récupérer l'IP du client de manière sécurisée
 */
async function getClientIp(): Promise<string> {
    try {
        const headersList = await headers()
        const forwardedFor = headersList.get('x-forwarded-for')
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim()
        }
        return headersList.get('x-real-ip') || 'unknown'
    } catch (e) {
        return 'system'
    }
}

/**
 * Récupérer la localisation à partir de l'IP
 */
async function getLocationFromIp(ip: string): Promise<string> {
    if (!ip || ip === 'unknown' || ip === 'system' || ip.startsWith('127.') || ip === '::1') {
        return 'Localisation inconnue'
    }
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`)
        const data = await res.json()
        if (data.status === 'success') {
            return `${data.country}, ${data.city}`
        }
    } catch (e) {}
    return 'Localisation inconnue'
}


const TELEGRAM_API = 'https://api.telegram.org/bot'

// Récupérer le token Telegram depuis la base de données
async function getTelegramToken(): Promise<string> {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
    return setting?.value || process.env.TELEGRAM_BOT_TOKEN || ''
}

async function getTelegramChatId(): Promise<string> {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } })
    return setting?.value || process.env.TELEGRAM_CHAT_ID || ''
}


// Envoyer une notification de nouvelle commande avec boutons de changement de statut
export async function sendOrderNotification(order: {
    id: string
    fullName: string
    phone: string
    city: string
    total: number
    status: string
    source?: string
    comment?: string | null
    items?: { quantity: number; book?: { title: string } | null; pack?: { name: string } | null }[]
}) {
    const botToken = await getTelegramToken()
    const chatId = await getTelegramChatId()

    if (!botToken || !chatId) return

    const orderSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_notify_orders' } })
    if (orderSetting?.value === 'false') return

    const ip = await getClientIp()
    const location = await getLocationFromIp(ip)
    const shortId = order.id.slice(0, 8).toUpperCase()
    const itemsList = order.items
        ?.map(i => `  • ${i.book?.title || i.pack?.name || 'Article'} x${i.quantity}`)
        .join('\n') || ''

    const templateSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_template_order' } })
    let text = templateSetting?.value || `🛒 <b>Nouvelle Commande #{{shortId}}</b>\n\n👤 <b>Client:</b> {{fullName}}\n📱 <b>Source:</b> {{source}}\n📞 <b>Téléphone:</b> {{phone}}\n📍 <b>Ville (Saisie):</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n💰 <b>Total:</b> {{total}} MAD\n{{comment}}\n{{itemsList}}\n🌐 <b>IP:</b> {{ip}}\n\n🔗 <a href="{{orderUrl}}">Voir la commande</a>`

    text = text.replace(/\{\{shortId\}\}/g, shortId)
               .replace(/\{\{fullName\}\}/g, order.fullName)
               .replace(/\{\{source\}\}/g, order.source || 'Boutique')
               .replace(/\{\{phone\}\}/g, order.phone)
               .replace(/\{\{city\}\}/g, order.city)
               .replace(/\{\{location\}\}/g, location)
               .replace(/\{\{total\}\}/g, order.total.toFixed(2))
               .replace(/\{\{comment\}\}/g, order.comment ? `📝 <b>Note:</b> ${order.comment}` : '')
               .replace(/\{\{itemsList\}\}/g, itemsList ? `📦 <b>Articles:</b>\n${itemsList}` : '')
               .replace(/\{\{ip\}\}/g, ip)
               .replace(/\{\{orderUrl\}\}/g, `${process.env.NEXTAUTH_URL}/fr/admin/orders/${order.id}`)

    let cleanPhone = order.phone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '212' + cleanPhone.substring(1)
    } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) {
        cleanPhone = '212' + cleanPhone
    }

    const whatsappTemplateSetting = await prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_order' } })
    let whatsappText = whatsappTemplateSetting?.value || `Bonjour {{fullName}},\n\nVotre commande #{{shortId}} sur Riwaya a bien été reçue. Nous préparons votre colis pour une livraison rapide à {{city}}.\n\nMerci de votre confiance ! 📚✨`
    whatsappText = whatsappText.replace(/\{\{fullName\}\}/g, order.fullName)
                               .replace(/\{\{shortId\}\}/g, shortId)
                               .replace(/\{\{city\}\}/g, order.city)

    const whatsappMsg = encodeURIComponent(whatsappText)
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${whatsappMsg}`

    const orderData = await prisma.order.findUnique({
        where: { id: order.id },
        select: { shippingCompany: true }
    });

    const activeShippingCompanies = orderData?.shippingCompany ? [orderData.shippingCompany] : [];
    const shippingButtons = activeShippingCompanies.map(comp => {
        // Map the company to its corresponding command
        // This is a naive mapping based on ID. We can refine it later if needed.
        const cmd = comp.name.toLowerCase().includes('olivraison') ? 'so' : 'sw';
        return { text: `🚀 Expédier ${comp.name}`, callback_data: `${cmd}:${order.id}` };
    });

    const inline_keyboard = [
        [
            { text: '💬 WhatsApp Confirm', url: whatsappUrl }
        ],
        [
            { text: '✅ Confirmer', callback_data: `os:${order.id}:CONFIRMED` },
            { text: '🚚 En livraison', callback_data: `os:${order.id}:SHIPPED` }
        ]
    ];

    if (shippingButtons.length > 0) {
        inline_keyboard.push(shippingButtons);
    }

    inline_keyboard.push(
        [
            { text: '📦 Livrée', callback_data: `os:${order.id}:DELIVERED` },
            { text: '🔄 Retournée', callback_data: `os:${order.id}:RETURNED` }
        ],
        [
            { text: '✨ Générer Visuel', callback_data: `gen_creative:${order.id}` }
        ],
        [
            { text: '❌ Annuler', callback_data: `os:${order.id}:CANCELLED` }
        ]
    );

    const keyboard = { inline_keyboard };

    const chatIds = String(chatId).split(',').map(id => id.trim()).filter(id => id.length > 0)

    const promises = chatIds.map(id => 
        fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: id,
                text,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        }).then(res => res.json())
    )

    const results = await Promise.all(promises)
    return results[0]
}

/**
 * Envoyer une photo unique
 */
export async function sendTelegramPhoto(photoUrl: string, caption: string, chatId?: string, botToken?: string, keyboard?: any) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)
    
    const promises = chatIds.map(cid => 
        fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: cid,
                photo: photoUrl,
                caption,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        }).then(res => res.json())
    )

    const results = await Promise.all(promises)
    return results[0]
}

/**
 * Envoyer un album (MediaGroup)
 */
export async function sendTelegramMediaGroup(media: { type: 'photo', media: string, caption?: string }[], chatId?: string, botToken?: string) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id || media.length === 0) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)
    
    const promises = chatIds.map(cid => 
        fetch(`${TELEGRAM_API}${token}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: cid,
                media: media.map(m => ({ ...m, parse_mode: 'HTML' }))
            })
        }).then(res => res.json())
    )

    const results = await Promise.all(promises)
    return results[0]
}

// Répondre à un callback (bouton pressé)
export async function answerCallbackQuery(callbackQueryId: string, text: string, token: string) {
    await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    })
}

/**
 * Échapper les caractères HTML pour Telegram
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// Modifier le message original après action
export async function editTelegramMessage(chatId: string | number, messageId: number, text: string, token: string, replyMarkup?: any) {
    await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        })
    })
}

// Configurer le webhook Telegram
export async function setTelegramWebhook(webhookUrl: string, token: string) {
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
    })
    return res.json()
}

// Supprimer le webhook
export async function deleteTelegramWebhook(token: string) {
    const res = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, { method: 'POST' })
    return res.json()
}
// Envoyer une notification lors de l'inscription d'un nouvel utilisateur
export async function sendUserRegistrationNotification(user: {
    fullName: string
    email: string
    phone?: string
    city: string
    role?: string
}) {
    const botToken = await getTelegramToken()
    const chatId = await getTelegramChatId()

    if (!botToken || !chatId) return

    const regSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_notify_register' } })
    if (regSetting?.value !== 'true') return

    const ip = await getClientIp()
    const location = await getLocationFromIp(ip)
    const templateSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_template_register' } })
    let text = templateSetting?.value || `👤 <b>Nouveau Compte Créé</b>\n\n📛 <b>Nom:</b> {{fullName}}\n📧 <b>Email:</b> {{email}}\n{{phone}}📍 <b>Ville:</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n🔑 <b>Rôle:</b> {{role}}\n🌐 <b>IP:</b> {{ip}}\n📅 <b>Date:</b> {{date}}`

    text = text.replace(/\{\{fullName\}\}/g, user.fullName)
               .replace(/\{\{email\}\}/g, user.email)
               .replace(/\{\{phone\}\}/g, user.phone ? `📞 <b>Téléphone:</b> ${user.phone}\n` : '')
               .replace(/\{\{city\}\}/g, user.city)
               .replace(/\{\{location\}\}/g, location)
               .replace(/\{\{role\}\}/g, user.role || 'USER')
               .replace(/\{\{ip\}\}/g, ip)
               .replace(/\{\{date\}\}/g, new Date().toLocaleString('fr-FR'))

    const chatIds = String(chatId).split(',').map(id => id.trim()).filter(id => id.length > 0)

    const promises = chatIds.map(id => 
        fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: id,
                text,
                parse_mode: 'HTML'
            })
        }).then(res => res.json())
    )

    const results = await Promise.all(promises)
    return results[0]
}

/**
 * Envoyer un message Telegram générique
 */
export async function sendTelegramMessage(text: string, forceChatId?: string, forceToken?: string, replyMarkup?: any) {
    const token = forceToken || await getTelegramToken()
    const chatId = forceChatId || await getTelegramChatId()

    if (!token || !chatId) return

    const ip = await getClientIp()
    const location = await getLocationFromIp(ip)
    const textWithIp = text.includes('🌐 <b>IP:</b>') ? text : `${text}\n\n🌍 <b>Localisation:</b> ${location}\n🌐 <b>IP:</b> ${ip}`

    const chatIds = String(chatId).split(',').map(id => id.trim()).filter(id => id.length > 0)

    const promises = chatIds.map(id => 
        fetch(`${TELEGRAM_API}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: id,
                text: textWithIp,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            })
        }).then(res => res.json())
    )

    const results = await Promise.all(promises)
    return results[0]
}

/**
 * Notification pour un nouvel avis client (avec boutons)
 */
export async function sendReviewNotification(review: { id: string, fullName: string, rating: number, comment: string }) {
    const shouldNotify = await prisma.siteSettings.findUnique({ where: { key: 'telegram_notify_reviews' } })
    if (shouldNotify?.value === 'false') return

    const templateSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_template_review' } })
    let text = templateSetting?.value || `⭐ <b>Nouvel Avis Client</b>\n\n👤 <b>Client:</b> {{fullName}}\n⭐ <b>Note:</b> {{rating}}/5\n💬 <b>Message:</b> <i>{{comment}}</i>\n\n📥 <i>Action requise :</i>`

    text = text.replace(/\{\{fullName\}\}/g, review.fullName)
               .replace(/\{\{rating\}\}/g, review.rating.toString())
               .replace(/\{\{comment\}\}/g, review.comment)

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: '✅ Approuver', callback_data: `approve_review:${review.id}` },
                { text: '🗑️ Supprimer', callback_data: `delete_review:${review.id}` }
            ]
        ]
    }

    return sendTelegramMessage(text, undefined, undefined, replyMarkup)
}

/**
 * Alerte stock faible
 */
export async function sendLowStockNotification(book: { id: string, title: string, stock: number }) {
    const botToken = await getTelegramToken()
    const chatId = await getTelegramChatId()
    if (!botToken || !chatId) return

    const shouldNotify = await prisma.siteSettings.findUnique({ where: { key: 'telegram_notify_low_stock' } })
    if (shouldNotify?.value === 'false') return

    const templateSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_template_low_stock' } })
    let text = templateSetting?.value || `⚠️ <b>Alerte Stock Faible</b>\n\n📖 <b>Livre:</b> {{title}}\n📦 <b>Stock restant:</b> <b>{{stock}}</b>\n\n<i>Action rapide disponible :</i>`

    text = text.replace(/\{\{title\}\}/g, book.title)
               .replace(/\{\{stock\}\}/g, book.stock.toString())

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: '🏷️ Promo Flash (-10%)', callback_data: `promo_flash:${book.id}` },
            ],
            [
                { text: '📦 Restock +10', callback_data: `restock:${book.id}:10` },
                { text: '🚫 Masquer', callback_data: `hide_book:${book.id}` }
            ]
        ]
    }

    return sendTelegramMessage(text, undefined, undefined, replyMarkup)
}

/**
 * Envoyer un document Telegram (PDF, etc.)
 */
export async function sendTelegramDocument(documentBuffer: Buffer, filename: string, caption: string, chatId?: string, botToken?: string) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)
    
    const promises = chatIds.map(cid => {
        const formData = new FormData()
        formData.append('chat_id', cid)
        formData.append('caption', caption)
        formData.append('parse_mode', 'HTML')
        formData.append('document', new Blob([documentBuffer], { type: 'application/pdf' }), filename)

        return fetch(`${TELEGRAM_API}${token}/sendDocument`, {
            method: 'POST',
            body: formData
        }).then(res => res.json())
    })

    const results = await Promise.all(promises)
    return results[0]
}
