'use server'

import { sendTelegramMessage } from '@/lib/telegram'
import { getIpIdentifier } from '@/lib/rate-limit'

export async function notifyAddToCart(productTitle: string, price: number, type: string, sessionId?: string) {
    try {
        const ip = await getIpIdentifier()
        
        const cleanTitle = productTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            // On envoie une notification asynchrone
            await sendTelegramMessage(`🛒 <b>Nouveau Panier</b>\n\nUn client vient d'ajouter un produit à son panier :\n📖 <b>Produit:</b> ${cleanTitle}\n🏷️ <b>Type:</b> ${type}\n💰 <b>Prix:</b> ${price.toFixed(2)} MAD\n🌐 <b>IP:</b> ${ip || 'Inconnue'}${sessionId ? `\n🔑 <b>Session:</b> <code>${sessionId}</code>` : ''}`)
        }
        
        return { success: true }
    } catch (error) {
        console.error('Erreur notifyAddToCart:', error)
        return { success: false }
    }
}

export async function notifyRemoveFromCart(productTitle: string, price: number, type: string) {
    try {
        const ip = await getIpIdentifier()
        
        const cleanTitle = productTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            await sendTelegramMessage(`🗑️ <b>Panier Supprimé</b>\n\nUn client vient de retirer un produit de son panier :\n📖 <b>Produit:</b> ${cleanTitle}\n🏷️ <b>Type:</b> ${type}\n💰 <b>Prix:</b> ${price.toFixed(2)} MAD\n🌐 <b>IP:</b> ${ip || 'Inconnue'}`)
        }
        
        return { success: true }
    } catch (error) {
        console.error('Erreur notifyRemoveFromCart:', error)
        return { success: false }
    }
}

export async function notifyClearCart(totalValue: number, totalItems: number) {
    try {
        const ip = await getIpIdentifier()

        const { getSetting } = await import('@/lib/actions/site-settings')
        const shouldNotify = await getSetting('telegram_notify_cart') === 'true'

        if (shouldNotify) {
            await sendTelegramMessage(`🗑️ <b>Panier Vidé Complètement</b>\n\nUn client vient de vider entièrement son panier :\n📦 <b>Articles retirés:</b> ${totalItems}\n💰 <b>Valeur perdue:</b> ${totalValue.toFixed(2)} MAD\n🌐 <b>IP:</b> ${ip || 'Inconnue'}`)
        }
        
        return { success: true }
    } catch (error) {
        console.error('Erreur notifyClearCart:', error)
        return { success: false }
    }
}
