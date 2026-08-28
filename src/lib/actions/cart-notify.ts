'use server'

import { sendTelegramMessage } from '@/lib/telegram'
import { getIpIdentifier } from '@/lib/rate-limit'
import { isAuthenticated } from '@/lib/actions/auth'

export async function notifyAddToCart(productTitle: string, price: number, type: string, sessionId?: string) {
    try {
        const ip = await getIpIdentifier()
        const isAdmin = await isAuthenticated()
        const adminTag = isAdmin ? ' (Action effectuée par Admin 👨‍💻)' : ''
        
        const cleanTitle = productTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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
            // On envoie une notification asynchrone
            await sendTelegramMessage(
                `🛒 <b>Nouveau Panier</b>${adminTag}\n\nUn client vient d'ajouter un produit à son panier :\n📖 <b>Produit:</b> ${cleanTitle}\n🏷️ <b>Type:</b> ${type}\n💰 <b>Prix:</b> ${price.toFixed(2)} درهم\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`,
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
