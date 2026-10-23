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
        return `Salam ${fullName} ! 📦\n\nBonne nouvelle ! Votre colis Riwaya #${shortId} vient d'être expédié${carrierInfo}${trackingInfo}.\n\nLe livreur vous contactera par téléphone pour la livraison à domicile (Paiement à la livraison 💵).\n\nVous pouvez suivre votre livraison en direct : ${trackingLink}\n\nMerci infiniment de votre confiance ! 📚✨\nL'équipe Riwaya.store`
    }

    if (status === 'DELIVERED') {
        return `Salam ${fullName} ! 🎉\n\nVotre commande Riwaya #${shortId} a été livrée avec succès !\n\nToute l'équipe Riwaya vous remercie chaleureusement pour votre confiance. Nous espérons que vos livres vous apporteront beaucoup de plaisir et d'inspiration 📖✨.\n\nN'hésitez pas à nous laisser votre avis sur le site : https://riwaya.store\n\nMerci de votre confiance et à très bientôt pour de nouvelles lectures ! 📚`
    }

    if (status === 'CONFIRMED') {
        return `Salam ${fullName} !\n\nVotre commande Riwaya #${shortId} est confirmée et en cours de préparation dans notre dépôt 📦.\n\nSuivi de commande : ${trackingLink}\nMerci de votre confiance ! 📚✨`
    }

    return `Salam ${fullName} !\n\nLe statut de votre commande Riwaya #${shortId} a été mis à jour : ${status}.\nSuivi : ${trackingLink}\nMerci de votre confiance ! 📚`
}

/**
 * Envoie la notification WhatsApp au client (via WAHA direct, Webhook et Telegram)
 */
export async function sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
    try {
        const { orderId, fullName, phone, status, trackingID } = payload
        if (!phone) return { success: false, error: 'Numéro manquant' }

        const cleanPhone = formatMoroccanPhone(phone)
        const message = getWhatsAppStatusMessage(payload)
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

        // 1. Envoi direct automatique via WAHA (WhatsApp HTTP API connecté)
        let wahaSent = false
        let wahaError: string | null = null
        try {
            const { sendWhatsAppMessageDirect } = await import('@/lib/actions/whatsapp-gateway')
            const directRes = await sendWhatsAppMessageDirect(cleanPhone, message, {
                type: 'NOTIFICATION',
                metadata: {
                    orderId,
                    status,
                    trackingID: trackingID || null,
                    source: 'automated_order_status_update'
                }
            })
            if (directRes && (directRes.success || (directRes as any).id || (directRes as any).key)) {
                wahaSent = true
            } else if (directRes && (directRes as any).error) {
                wahaError = (directRes as any).error
            }
        } catch (wahaErr: any) {
            console.error('[WhatsApp WAHA Direct Error]:', wahaErr)
            wahaError = wahaErr?.message || 'Erreur passerelle WAHA'
        }

        // 2. Appel du Webhook optionnel (n8n ou autre passerelle externe)
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

        // 3. Notification Telegram récapitulative pour l'administrateur
        const statusLabel = status === 'SHIPPED' ? '🚚 Colis Expédié' : status === 'DELIVERED' ? '✅ Commande Livrée' : `Statut: ${status}`
        const deliveryNotice = wahaSent
            ? '✅ *Message WhatsApp envoyé automatiquement au client via WAHA*'
            : webhookSent
            ? '✅ *Message WhatsApp transmis via Webhook*'
            : '⚠️ *Passerelle WAHA indisponible - Cliquer ci-dessous pour envoyer manuellement :*'

        const telegramText = `📱 *Notification WhatsApp Client*\n\n${statusLabel}\n🆔 \`#${orderId.slice(0, 8)}\`\n👤 ${fullName}\n📞 \`+${cleanPhone}\`${trackingID ? `\n🏷️ Suivi : \`${trackingID}\`` : ''}\n\n${deliveryNotice}`

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Ouvrir WhatsApp Client', url: waLink }
                ]
            ]
        }

        await sendTelegramMessage(telegramText, undefined, undefined, keyboard).catch(() => null)

        return { success: true, wahaSent, webhookSent, wahaError, waLink }
    } catch (error: any) {
        console.error('[WhatsApp Notification] Erreur:', error)
        return { success: false, error: error.message }
    }
}
