import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export interface WhatsAppNotificationPayload {
    orderId: string
    fullName: string
    phone: string
    status: 'SHIPPED' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'
    trackingID?: string | null
    shippingCompanyName?: string | null
    locale?: string
}

/**
 * Nettoie et formate le numéro au format international (212...)
 */
export function formatMoroccanPhone(phone: string): string {
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) {
        clean = '212' + clean.slice(1)
    } else if (!clean.startsWith('212') && clean.length === 9) {
        clean = '212' + clean
    }
    return clean
}

/**
 * Génère le message WhatsApp adapté au statut
 */
export function getWhatsAppStatusMessage(payload: WhatsAppNotificationPayload): string {
    const { orderId, fullName, status, trackingID, shippingCompanyName, locale = 'fr' } = payload
    const shortId = orderId.slice(0, 8)
    const trackingLink = `https://riwaya.store/${locale}/track/${orderId}`

    if (status === 'SHIPPED') {
        const carrierInfo = shippingCompanyName ? ` via ${shippingCompanyName}` : ''
        const trackingInfo = trackingID ? ` (N° suivi: ${trackingID})` : ''
        return `Bonjour ${fullName}, bonne nouvelle ! Votre commande Riwaya #${shortId} a été expédiée${carrierInfo}${trackingInfo} 📦.\n\nVous pouvez suivre votre livraison ici : ${trackingLink}\nLe livreur vous contactera par téléphone pour la remise du colis. Merci de votre confiance ! 📚✨`
    }

    if (status === 'DELIVERED') {
        return `Bonjour ${fullName}, votre commande Riwaya #${shortId} a été livrée avec succès ! 🎉\n\nNous espérons que vos livres vous plairont. N'hésitez pas à nous laisser un avis sur le site : https://riwaya.store\nBonne lecture et à très bientôt ! 📚`
    }

    if (status === 'CONFIRMED') {
        return `Bonjour ${fullName}, votre commande Riwaya #${shortId} est confirmée et en cours de préparation dans notre dépôt.\nSuivi : ${trackingLink}`
    }

    return `Bonjour ${fullName}, statut de votre commande Riwaya #${shortId} mis à jour : ${status}.\nSuivi : ${trackingLink}`
}

/**
 * Envoie la notification WhatsApp au client (via Webhook n8n/Gateway et lien Telegram admin)
 */
export async function sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
    try {
        const { orderId, fullName, phone, status, trackingID } = payload
        if (!phone) return { success: false, error: 'Numéro manquant' }

        const cleanPhone = formatMoroccanPhone(phone)
        const message = getWhatsAppStatusMessage(payload)
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

        // 1. Récupérer l'URL webhook configurée (n8n ou passerelle WhatsApp)
        const webhookSetting = await prisma.siteSettings.findUnique({
            where: { key: 'whatsapp_webhook_url' }
        }).catch(() => null)

        const webhookUrl = webhookSetting?.value || process.env.WHATSAPP_WEBHOOK_URL

        let webhookSent = false
        if (webhookUrl) {
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: cleanPhone,
                        rawPhone: phone,
                        fullName,
                        orderId,
                        status,
                        trackingID,
                        message,
                        timestamp: new Date().toISOString()
                    })
                })
                webhookSent = res.ok
            } catch (err) {
                console.error('[WhatsApp Webhook] Erreur lors de l\'appel:', err)
            }
        }

        // 2. Notification Telegram avec bouton 1-clic pour l'admin
        const statusLabel = status === 'SHIPPED' ? '🚚 Commande Expédiée' : status === 'DELIVERED' ? '✅ Commande Livrée' : `Statut: ${status}`
        const telegramText = `📱 *Notification WhatsApp Client*\n\n${statusLabel}\n🆔 \`#${orderId.slice(0, 8)}\`\n👤 ${fullName}\n📞 \`+${cleanPhone}\`${trackingID ? `\n🏷️ Suivi : \`${trackingID}\`` : ''}\n\n${webhookSent ? '✅ *Message envoyé automatiquement via passerelle*' : 'ℹ️ *Cliquer ci-dessous pour ouvrir WhatsApp* :'}`

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Ouvrir WhatsApp Client', url: waLink }
                ]
            ]
        }

        await sendTelegramMessage(telegramText, undefined, undefined, keyboard).catch(() => null)

        return { success: true, webhookSent, waLink }
    } catch (error: any) {
        console.error('[WhatsApp Notification] Erreur:', error)
        return { success: false, error: error.message }
    }
}
