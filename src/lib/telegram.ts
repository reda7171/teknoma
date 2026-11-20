// Lib Telegram Bot - Envoi de messages et notifications
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { getSalesChannelLabel } from '@/lib/sales-channel'


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


export interface TelegramOrderNotification {
    id: string
    fullName: string
    phone: string
    city: string
    total: number
    status?: string
    source?: string
    salesChannel?: string
    comment?: string | null
    notes?: string | null
    address?: string | null
    items?: {
        id?: string
        quantity: number
        price?: number
        type?: string
        isMissing?: boolean
        book?: { id?: string; title: string; titleEn?: string | null; titleFr?: string | null; language?: string | null; stock?: number } | null
        pack?: { id?: string; name: string; nameFr?: string | null; nameEn?: string | null } | null
        extraProduct?: { id?: string; name: string; stock?: number } | null
        digitalProduct?: { id?: string; title: string } | null
        gift?: { id?: string; name: string } | null
        [key: string]: any
    }[]
    [key: string]: any
}

/**
 * Formate la liste des articles avec le libellé [MANQUANT] si en rupture ou signalé
 */
export function formatOrderItemsList(items?: any[]): { itemsList: string; hasMissing: boolean; missingCount: number } {
    if (!items || items.length === 0) {
        return { itemsList: '', hasMissing: false, missingCount: 0 }
    }

    let hasMissing = false
    let missingCount = 0

    const itemsList = items
        .map(i => {
            let rawTitle = 'Article'
            if (i.book) {
                const lang = (i.book.language || '').toLowerCase().trim()
                if (lang === 'en' && i.book.titleEn) {
                    rawTitle = i.book.titleEn
                } else if (lang === 'fr' && i.book.titleFr) {
                    rawTitle = i.book.titleFr
                } else {
                    rawTitle = i.book.title || i.book.titleEn || i.book.titleFr || 'Livre'
                }
            } else if (i.pack) {
                rawTitle = i.pack.name || i.pack.nameFr || i.pack.nameEn || 'Pack'
            } else if (i.extraProduct) {
                rawTitle = i.extraProduct.name || 'Produit'
            } else if (i.digitalProduct) {
                rawTitle = i.digitalProduct.title || 'Produit Numérique'
            } else if (i.gift) {
                rawTitle = i.gift.name || 'Cadeau'
            }
            const typeBadge = i.type === 'PACK' ? '📦' : i.type === 'DIGITAL' ? '💻' : i.type === 'ACCESSORY' ? '🎁' : '📖'
            const itemPrice = typeof i.price === 'number' ? i.price : Number(i.price) || 0
            const priceText = itemPrice > 0 ? ` • ${itemPrice.toFixed(2)} MAD` : ''
            const qty = i.quantity || 1
            const subtotalText = (itemPrice > 0 && qty > 1) ? ` [Total: ${(itemPrice * qty).toFixed(2)} MAD]` : ''
            
            const isItemMissing = Boolean(
                i.isMissing ||
                (i.book && i.book.stock !== undefined && i.book.stock <= 0) ||
                (i.extraProduct && i.extraProduct.stock !== undefined && i.extraProduct.stock <= 0)
            )

            if (isItemMissing) {
                hasMissing = true
                missingCount++
            }

            const missingBadge = isItemMissing ? ' ⚠️ <b>[MANQUANT]</b>' : ''
            return `  • ${typeBadge} ${escapeHtml(rawTitle)} x${qty}${priceText}${subtotalText}${missingBadge}`
        })
        .join('\n')

    return { itemsList, hasMissing, missingCount }
}

export function buildOrderKeyboard(orderId: string, whatsappUrl: string, activeShippingCompanies: string[] = [], hasMissing = false) {
    const shippingButtons = activeShippingCompanies.map(compName => {
        const cmd = compName.toLowerCase().includes('olivraison') ? 'so' : 'sw'
        return { text: `🚀 Expédier ${compName}`, callback_data: `${cmd}:${orderId}` }
    })

    const inline_keyboard: any[][] = [
        [
            { text: '💬 WhatsApp Confirm', url: whatsappUrl }
        ],
        [
            { text: '✅ Confirmer', callback_data: `os:${orderId}:CONFIRMED` },
            { text: '🚚 En livraison', callback_data: `os:${orderId}:SHIPPED` }
        ]
    ]

    if (shippingButtons.length > 0) {
        inline_keyboard.push(shippingButtons)
    }

    inline_keyboard.push(
        [
            { text: '📦 Livrée', callback_data: `os:${orderId}:DELIVERED` },
            { text: '🔄 Retournée', callback_data: `os:${orderId}:RETURNED` }
        ],
        [
            { text: hasMissing ? '⚠️ Manquant (Modifier)' : '⚠️ Déclarer Manquant', callback_data: `toggle_missing:${orderId}` },
            { text: '✨ Générer Visuel', callback_data: `gen_creative:${orderId}` }
        ],
        [
            { text: '❌ Annuler', callback_data: `os:${orderId}:CANCELLED` }
        ]
    )

    return { inline_keyboard }
}

// Envoyer une notification de nouvelle commande avec boutons de changement de statut
export async function sendOrderNotification(order: TelegramOrderNotification) {
    const botToken = await getTelegramToken()
    const chatId = await getTelegramChatId()

    if (!botToken || !chatId) return

    const orderSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_notify_orders' } })
    if (orderSetting?.value === 'false') return

    const ip = await getClientIp()
    const location = await getLocationFromIp(ip)
    const shortId = order.id.slice(0, 8).toUpperCase()
    const channelLabel = getSalesChannelLabel(order.salesChannel)
    const { itemsList, hasMissing, missingCount } = formatOrderItemsList(order.items)

    const templateSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_template_order' } })
    let text = templateSetting?.value || `🛒 <b>Nouvelle Commande #{{shortId}}</b>\n\n🏪 <b>Canal:</b> {{channel}}\n👤 <b>Client:</b> {{fullName}}\n📱 <b>Source:</b> {{source}}\n📞 <b>Téléphone:</b> {{phone}}\n📍 <b>Ville (Saisie):</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n💰 <b>Total:</b> {{total}} MAD\n{{comment}}\n{{itemsList}}\n🌐 <b>IP:</b> {{ip}}\n\n🔗 <a href="{{orderUrl}}">Voir la commande</a>`
    const templateHasChannel = text.includes('{{channel}}')

    text = text.replace(/\{\{shortId\}\}/g, escapeHtml(shortId))
               .replace(/\{\{fullName\}\}/g, escapeHtml(order.fullName))
               .replace(/\{\{source\}\}/g, escapeHtml(order.source || 'Boutique'))
               .replace(/\{\{channel\}\}/g, escapeHtml(channelLabel))
               .replace(/\{\{phone\}\}/g, escapeHtml(order.phone))
               .replace(/\{\{city\}\}/g, escapeHtml(order.city))
               .replace(/\{\{location\}\}/g, escapeHtml(location))
               .replace(/\{\{total\}\}/g, order.total.toFixed(2))
               .replace(/\{\{comment\}\}/g, order.comment ? `📝 <b>Note:</b> ${escapeHtml(order.comment)}` : '')
               .replace(/\{\{itemsList\}\}/g, itemsList ? `📦 <b>Articles:</b>\n${itemsList}` : '')
               .replace(/\{\{ip\}\}/g, ip)
               .replace(/\{\{orderUrl\}\}/g, `${process.env.NEXTAUTH_URL}/fr/admin/orders/${order.id}`)

    if (!templateHasChannel) {
        text += `\n\n🏪 <b>Canal:</b> ${escapeHtml(channelLabel)}`
    }

    if (hasMissing) {
        text = `🚨 <b>COMMANDE AVEC ${missingCount} ARTICLE(S) MANQUANT(S) !</b>\n\n` + text
    }

    try {
        const { resolveActiveWhatsAppAgent } = await import('@/lib/whatsapp-presence')
        const activeAgent = await resolveActiveWhatsAppAgent()
        if (activeAgent?.name) {
            text += `\n👤 <b>Admin assigné :</b> ${escapeHtml(activeAgent.name)}`
        }
    } catch {
        // ignore presence error
    }

    let cleanPhone = order.phone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '212' + cleanPhone.substring(1)
    } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) {
        cleanPhone = '212' + cleanPhone
    }

    const whatsappTemplateSetting = await prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_order' } })
    const defaultWaTemplate = `Bonjour {{fullName}},\n\nVotre commande #{{shortId}} sur Riwaya d'un montant de {{total}} a bien été reçue. Nous préparons votre colis pour une livraison rapide à {{city}} (Paiement à la livraison).\n\nMerci de votre confiance ! 📚✨`
    let whatsappText = whatsappTemplateSetting?.value || defaultWaTemplate
    const formattedTotal = `${order.total.toFixed(2)} MAD`
    whatsappText = whatsappText.replace(/\{\{fullName\}\}/g, order.fullName)
                               .replace(/\{\{shortId\}\}/g, shortId)
                               .replace(/\{\{city\}\}/g, order.city)
                               .replace(/\{\{total\}\}/g, formattedTotal)

    // Si l'ancien template personnalisé ne contenait pas encore la variable {{total}}
    if (!whatsappText.includes(order.total.toFixed(2)) && !whatsappText.includes('MAD') && !whatsappText.includes('DH')) {
        whatsappText = whatsappText.replace(
            /(\n\nMerci de votre confiance)/,
            `\n💰 Montant total : ${formattedTotal} (Paiement à la livraison)\n$1`
        )
    }

    const whatsappMsg = encodeURIComponent(whatsappText)
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${whatsappMsg}`

    const orderData = await prisma.order.findUnique({
        where: { id: order.id },
        select: { shippingCompany: true }
    });

    const activeShippingCompanies = orderData?.shippingCompany ? [orderData.shippingCompany] : [];
    const keyboard = buildOrderKeyboard(order.id, whatsappUrl, activeShippingCompanies, hasMissing);

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
export async function sendTelegramDocument(
    document: Buffer | string,
    filename: string = 'document.pdf',
    caption?: string,
    chatId?: string,
    botToken?: string,
    keyboard?: any
) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)

    const promises = chatIds.map(async cid => {
        try {
            if (typeof document === 'string' && document.startsWith('http')) {
                const res = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: cid,
                        document: document,
                        caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    })
                })
                return res.json()
            } else {
                const formData = new FormData()
                formData.append('chat_id', cid)
                const buf = Buffer.isBuffer(document)
                    ? document
                    : Buffer.from(document, 'base64')
                const blob = new Blob([buf as any], { type: 'application/pdf' })
                formData.append('document', blob, filename)
                if (caption) formData.append('caption', caption)
                formData.append('parse_mode', 'HTML')
                if (keyboard) formData.append('reply_markup', JSON.stringify(keyboard))

                const res = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
                    method: 'POST',
                    body: formData as any
                })
                return res.json()
            }
        } catch (err) {
            console.error('[TELEGRAM] Erreur envoi document:', err)
            return null
        }
    })

    const results = await Promise.all(promises)
    return results[0]
}

export async function sendTelegramMediaGroup(media: { type: 'photo', media: string, caption?: string }[], chatId?: string, botToken?: string) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id || media.length === 0) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)
    
    let isLocalFile = false
    for (const m of media) {
        if (!m.media.startsWith('http')) {
            isLocalFile = true
            break
        }
    }

    if (isLocalFile) {
        const promises = chatIds.map(async cid => {
            const formData = new FormData()
            formData.append('chat_id', cid)

            const mediaArray: any[] = []
            const fs = await import('fs/promises')
            const path = await import('path')

            for (let i = 0; i < media.length; i++) {
                const m = media[i]
                if (m.media.startsWith('http')) {
                    mediaArray.push({ type: m.type, media: m.media, caption: m.caption, parse_mode: 'HTML' })
                } else {
                    try {
                        const fileBuffer = await fs.readFile(m.media)
                        const blob = new Blob([fileBuffer as any])
                        const filename = path.basename(m.media)
                        formData.append(`photo${i}`, blob, filename)
                        mediaArray.push({ type: m.type, media: `attach://photo${i}`, caption: m.caption, parse_mode: 'HTML' })
                    } catch (err) {
                        console.error('[TELEGRAM] Error reading local media file:', m.media, err)
                    }
                }
            }
            
            if (mediaArray.length === 0) return null
            formData.append('media', JSON.stringify(mediaArray))

            return fetch(`${TELEGRAM_API}${token}/sendMediaGroup`, {
                method: 'POST',
                body: formData as any
            }).then(res => res.json())
        })

        const results = await Promise.all(promises)
        return results[0]
    } else {
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
    const { getTelegramWebhookSecret } = await import('@/lib/telegram-webhook-auth')
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: webhookUrl,
            secret_token: getTelegramWebhookSecret(token)
        })
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
    
    const headersList = await headers()
    const session = headersList.get('user-agent') || 'Inconnu'

    let text = templateSetting?.value || `👤 <b>Nouveau Compte Créé</b>\n\n📛 <b>Nom:</b> {{fullName}}\n📧 <b>Email:</b> {{email}}\n{{phone}}📍 <b>Ville:</b> {{city}}\n🌍 <b>Pays/Ville (IP):</b> {{location}}\n🔑 <b>Rôle:</b> {{role}}\n🌐 <b>IP:</b> {{ip}}\n💻 <b>Session:</b> {{session}}\n📅 <b>Date:</b> {{date}}`

    text = text.replace(/\{\{fullName\}\}/g, user.fullName)
               .replace(/\{\{email\}\}/g, user.email)
               .replace(/\{\{phone\}\}/g, user.phone ? `📞 <b>Téléphone:</b> ${user.phone}\n` : '')
               .replace(/\{\{city\}\}/g, user.city)
               .replace(/\{\{location\}\}/g, location)
               .replace(/\{\{role\}\}/g, user.role || 'USER')
               .replace(/\{\{ip\}\}/g, ip)
               .replace(/\{\{session\}\}/g, session)
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
export async function sendTelegramDocumentBuffer(documentBuffer: Buffer, filename: string, caption: string, chatId?: string, botToken?: string) {
    const token = botToken || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } }))?.value || process.env.TELEGRAM_BOT_TOKEN
    const id = chatId || (await prisma.siteSettings.findUnique({ where: { key: 'telegram_chat_id' } }))?.value
    
    if (!token || !id) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(i => i.length > 0)
    
    const promises = chatIds.map(cid => {
        const formData = new FormData()
        formData.append('chat_id', cid)
        formData.append('caption', caption)
        formData.append('parse_mode', 'HTML')
        formData.append('document', new Blob([documentBuffer as any], { type: 'application/pdf' }), filename)

        return fetch(`${TELEGRAM_API}${token}/sendDocument`, {
            method: 'POST',
            body: formData
        }).then(res => res.json())
    })

    const results = await Promise.all(promises)
    return results[0]
}

export async function sendTelegramAlert(text: string) {
    const token = await getTelegramToken()
    const id = await getTelegramChatId()
    if (!token || !id) return null

    const chatIds = String(id).split(',').map(i => i.trim()).filter(Boolean)
    const promises = chatIds.map(cid =>
        fetch(`${TELEGRAM_API}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: cid,
                text,
                parse_mode: 'HTML'
            })
        }).then(res => res.json()).catch(() => null)
    )
    return Promise.all(promises)
}

