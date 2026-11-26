'use server'

import { sendTelegramMessage } from '@/lib/telegram'
import { getIpIdentifier } from '@/lib/rate-limit'
import { isAuthenticated } from '@/lib/actions/auth'

export async function notifyAddToCart(productTitle: string, price: number, type: string, sessionId?: string, cartTotal?: number, cartItemsText?: string, discount?: number | null, productId?: string) {
    try {
        if (type === 'BOOK' || type === 'PRODUIT') {
            if (productId) {
                const { prisma } = await import('@/lib/prisma')
                await prisma.book.update({
                    where: { id: productId },
                    data: { cartAdditions: { increment: 1 } }
                }).catch(() => {})
            }
        }

        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        const cleanTitle = productTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const cleanItemsText = cartItemsText ? cartItemsText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            let replyMarkup
            if (sessionId) {
                replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '🎁 -10 Dhs', callback_data: `offer_10:${sessionId}` },
                            { text: '🎁 -20 Dhs', callback_data: `offer_20:${sessionId}` },
                            { text: '🎁 -30 Dhs', callback_data: `offer_30:${sessionId}` }
                        ],
                        [
                            { text: '🟢 Ping (Session)', callback_data: `ping:${sessionId}` }
                        ]
                    ]
                }
            }
            // On envoie une notification asynchrone
            let message = `🛒 <b>Nouveau Produit Ajouté</b>${adminTag}\n\nUn client vient d'ajouter un produit à son panier :\n📱 <b>Produit:</b> ${cleanTitle}\n🏷️ <b>Type:</b> ${type}\n💰 <b>Prix:</b> ${price.toFixed(2)} درهم\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`

            if (discount) {
                message += `\n🎯 <b>Réduction active:</b> ${discount} درهم`
            }

            if (cartTotal !== undefined) {
                message += `\n\n💳 <b>Total du panier actuel:</b> ${cartTotal.toFixed(2)} درهم`
            }
            if (cleanItemsText) {
                message += `\n📦 <b>Contenu du panier:</b>\n<i>${cleanItemsText}</i>`
            }

            await sendTelegramMessage(
                message,
                undefined,
                undefined,
                replyMarkup
            )
        }

        return { success: true }
    } catch (error) {
        console.error('Erreur notifyAddToCart:', error)
        return { success: false }
    }
}

export async function notifyRemoveFromCart(productTitle: string, price: number, type: string, cartTotal?: number, sessionId?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        const cleanTitle = (productTitle || 'Produit inconnu').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            let replyMarkup
            if (sessionId) {
                replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '🎁 -10 Dhs', callback_data: `offer_10:${sessionId}` },
                            { text: '🎁 -20 Dhs', callback_data: `offer_20:${sessionId}` },
                            { text: '🎁 -30 Dhs', callback_data: `offer_30:${sessionId}` }
                        ]
                    ]
                }
            }
            await sendTelegramMessage(
                `🗑️ <b>Panier Supprimé</b>${adminTag}\n\nUn client vient de retirer un produit de son panier :\n📖 <b>Produit:</b> ${cleanTitle}\n🏷️ <b>Type:</b> ${type}\n💰 <b>Prix:</b> ${price.toFixed(2)} درهم${cartTotal !== undefined ? `\n🛒 <b>Total Restant:</b> ${cartTotal.toFixed(2)} درهم` : ''}\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`,
                undefined,
                undefined,
                replyMarkup
            )
        }

        return { success: true }
    } catch (error) {
        console.error('Erreur notifyRemoveFromCart:', error)
        return { success: false }
    }
}

export async function notifyClearCart(totalValue: number, totalItems: number, sessionId?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            let replyMarkup
            if (sessionId) {
                replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '🎁 -10 Dhs', callback_data: `offer_10:${sessionId}` },
                            { text: '🎁 -20 Dhs', callback_data: `offer_20:${sessionId}` },
                            { text: '🎁 -30 Dhs', callback_data: `offer_30:${sessionId}` }
                        ]
                    ]
                }
            }
            await sendTelegramMessage(
                `🗑️ <b>Panier Vidé Complètement</b>${adminTag}\n\nUn client vient de vider entièrement son panier :\n📦 <b>Articles retirés:</b> ${totalItems}\n💰 <b>Valeur perdue:</b> ${totalValue.toFixed(2)} درهم\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`,
                undefined,
                undefined,
                replyMarkup
            )
        }

        return { success: true }
    } catch (error) {
        console.error('Erreur notifyClearCart:', error)
        return { success: false }
    }
}

export async function notifyCheckoutInitiated(totalValue: number, totalItems: number, sessionId?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            await sendTelegramMessage(`🚀 <b>Passage en Caisse Initié</b>${adminTag}\n\nUn client se dirige vers la page de paiement :\n📦 <b>Articles:</b> ${totalItems}\n💰 <b>Valeur:</b> ${totalValue.toFixed(2)} درهم\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`)
        }

        return { success: true }
    } catch (error) {
        console.error('Erreur notifyCheckoutInitiated:', error)
        return { success: false }
    }
}



export async function notifyWhatsAppClick(message: string, assignedAgentName?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        let agentDisplay = assignedAgentName
        if (!agentDisplay) {
            const { resolveActiveWhatsAppAgent } = await import('@/lib/whatsapp-presence')
            const active = await resolveActiveWhatsAppAgent().catch(() => null)
            if (active?.name) {
                agentDisplay = active.name
            }
        }
        const assignedLine = agentDisplay
            ? `\n👤 <b>Admin en charge :</b> ${agentDisplay}`
            : '\n👤 <b>Admin en charge :</b> Standard Tekno Store'

        const cleanMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            await sendTelegramMessage(`💬 <b>Nouveau Contact WhatsApp Initié</b>${adminTag}${assignedLine}\n\n<b>Message :</b>\n<pre>${cleanMessage}</pre>\n\n🌍 <b>IP:</b> ${ip || 'Inconnue'}`)
        }
        return { success: true }
    } catch (error) {
        console.error('Erreur notifyWhatsAppClick:', error)
        return { success: false }
    }
}

export async function notifyWhatsAppOrderClick(title: string, price: number, type: string, message: string, phone?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''

        const cleanTitle = (title || 'Produit').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const cleanMessage = (message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const text = `📱 <b>Commande WhatsApp Initiée</b>${adminTag}\n\n` +
            `📱 <b>Produit :</b> ${cleanTitle}\n` +
            `🏷️ <b>Type :</b> ${type}\n` +
            `💰 <b>Prix :</b> ${price ? price.toFixed(2) : '0.00'} درهم\n` +
            (phone ? `📞 <b>Contact WhatsApp :</b> +${phone}\n` : '') +
            `💬 <b>Message pré-rempli :</b>\n<i>${cleanMessage}</i>\n\n` +
            `🌐 <b>IP :</b> ${ip || 'Inconnue'}`

        await sendTelegramMessage(text).catch(() => null)
        return { success: true }
    } catch (error) {
        console.error('Erreur notifyWhatsAppOrderClick:', error)
        return { success: false }
    }
}
