import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { resolveStorefrontChannel } from '@/lib/sales-channel'

function formatCartItemsDetail(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return '  <i>Aucun article</i>'
    return items.map((item, idx) => {
        const rawTitle = item.title || item.name || 'Article'
        const title = String(rawTitle).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const qty = item.quantity || 1
        const price = item.price !== undefined ? `${item.price} DH` : ''
        const typeBadge = item.type === 'PACK' ? '📦 Pack' : item.type === 'DIGITAL' ? '💻 Numérique' : item.type === 'ACCESSORY' ? '🎁 Accessoire' : '📖 Livre'
        const duplicateBadge = qty > 1 ? ' ⚠️ <b>(2 exemplaires)</b>' : ''
        return `  ${idx + 1}. [${typeBadge}] <b>${title}</b> x${qty}${price ? ` - <b>${price}</b>` : ''}${duplicateBadge}`
    }).join('\n')
}

function escapeText(text?: string | null): string {
    if (!text) return ''
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatShippingInfo(shippingMethod?: string, destinationCountry?: any, shippingFee?: number): {
    badge: string
    details: string
    isWorldwide: boolean
} {
    const isWorldwide = shippingMethod === 'AMANA_WORLDWIDE' || (destinationCountry && destinationCountry.code !== 'MA')
    const countryName = destinationCountry?.name || (isWorldwide ? 'International' : 'Maroc')
    const countryCode = destinationCountry?.code || (isWorldwide ? 'WW' : 'MA')
    const countryFlag = destinationCountry?.flag || (isWorldwide ? '🌍' : '🇲🇦')

    const badge = isWorldwide
        ? `✈️ <b>[EXPÉDITION INTERNATIONALE - WORLDWIDE AMANA]</b>`
        : `🇲🇦 <b>[LIVRAISON NATIONALE - MAROC]</b>`

    const details = isWorldwide
        ? `🌍 <b>Destination:</b> ${countryFlag} ${escapeText(countryName)} (${countryCode})\n` +
          `🚀 <b>Mode:</b> Amana Express International Suivi\n` +
          `📦 <b>Frais de port:</b> <b>${shippingFee !== undefined ? `${shippingFee} DH` : '200 DH'}</b>`
        : `🚚 <b>Mode:</b> 🇲🇦 Maroc Express (Standard 24h - 48h)\n` +
          `📦 <b>Frais de livraison:</b> <b>${shippingFee !== undefined && Number(shippingFee) === 0 ? 'Gratuite (0 DH)' : `${shippingFee || 30} DH`}</b>`

    return { badge, details, isWorldwide }
}

function formatLocationInfo(city?: string | null, address?: string | null): string {
    const safeCity = city ? escapeText(city.trim()) : null
    const safeAddress = address ? escapeText(address.trim()) : null

    if (safeCity && safeAddress) {
        return `📍 <b>Ville:</b> ${safeCity}\n🏠 <b>Adresse:</b> ${safeAddress}`
    } else if (safeCity) {
        return `📍 <b>Ville:</b> ${safeCity}`
    } else if (safeAddress) {
        return `🏠 <b>Adresse:</b> ${safeAddress}`
    }
    return `📍 <b>Ville:</b> <i>Non renseignée</i>`
}

function formatPaymentMethod(paymentMethod?: string | null, selectedBank?: string | null): string {
    let paymentInfo = paymentMethod === 'STRIPE'
        ? '💳 Carte Bancaire (Stripe)'
        : paymentMethod === 'PAYPAL'
        ? '🅿️ PayPal Express'
        : paymentMethod === 'CMI'
        ? '🇲🇦 Carte Bancaire CMI'
        : paymentMethod === 'TRANSFER' || paymentMethod === 'BANK_TRANSFER'
        ? '🏦 Virement Bancaire'
        : '💵 Cash on Delivery (Paiement à la livraison)'

    if ((paymentMethod === 'TRANSFER' || paymentMethod === 'BANK_TRANSFER') && selectedBank) {
        paymentInfo += ` (${escapeText(selectedBank)})`
    }
    return paymentInfo
}

function buildWhatsAppReplyMarkup(safePhone?: string | null, isWorldwide = false, destinationCountry?: any) {
    if (!safePhone) return undefined
    let cleanPhone = safePhone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.substring(2)
    }

    if (isWorldwide && destinationCountry?.dialCode) {
        const rawDial = destinationCountry.dialCode.replace(/[^0-9]/g, '')
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
            cleanPhone = rawDial + cleanPhone.substring(1)
        } else if (!cleanPhone.startsWith(rawDial)) {
            cleanPhone = rawDial + cleanPhone
        }
    } else {
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.substring(1)
        } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) {
            cleanPhone = '212' + cleanPhone
        }
    }

    if (cleanPhone.length < 8) return undefined

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}`
    return {
        inline_keyboard: [[{ text: '💬 Contacter sur WhatsApp', url: whatsappUrl }]]
    }
}

export async function POST(req: Request) {
    try {
        const salesChannel = resolveStorefrontChannel(req.headers)
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`abandoned_cart_post_${ip}`, { limit: 20, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })

        let body: any
        try {
            body = await req.json()
        } catch {
            const raw = await req.text()
            body = raw ? JSON.parse(raw) : {}
        }
        const {
            id,
            phone,
            email,
            fullName,
            city,
            address,
            comment,
            shippingMethod,
            destinationCountry,
            shippingFee,
            items,
            total,
            paymentMethod,
            selectedBank,
            sessionId
        } = body || {}

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true }) // Pas d'abandon si panier vide
        }

        // OWASP: Validation et sanitization
        const safeFullName = fullName ? sanitizeInput(fullName as string) : ''
        const safePhone = phone ? sanitizeInput(phone as string) : null
        const safeEmail = email ? sanitizeInput(email as string) : null
        const safeCity = city ? sanitizeInput(city as string) : null
        const safeAddress = address ? sanitizeInput(address as string) : null
        const safeComment = comment ? sanitizeInput(comment as string) : null
        const safeSessionId = sessionId ? sanitizeInput(sessionId as string) : null

        const cartData = JSON.stringify(items)
        const itemsDetail = formatCartItemsDetail(items)
        const shipping = formatShippingInfo(shippingMethod, destinationCountry, shippingFee)
        const locationText = formatLocationInfo(safeCity, safeAddress)
        const paymentInfo = formatPaymentMethod(paymentMethod, selectedBank)

        // Si ID fourni, on met à jour
        if (id) {
            const existing = await prisma.abandonedCart.findUnique({ where: { id } })
            if (existing) {
                const updated = await prisma.abandonedCart.update({
                    where: { id },
                    data: {
                        phone: safePhone,
                        email: safeEmail,
                        fullName: safeFullName,
                        cartData,
                        total,
                        status: 'PENDING',
                        salesChannel
                    }
                })

                // Notification de mise à jour si de nouvelles informations de contact, adresse ou livraison sont ajoutées
                if (
                    (safePhone && !existing.phone) ||
                    (safeEmail && !existing.email) ||
                    safeCity ||
                    safeAddress ||
                    shippingMethod ||
                    paymentMethod ||
                    selectedBank
                ) {
                    try {
                        const { sendTelegramMessage } = await import('@/lib/telegram')

                        const message = `🛒 <b>Mise à jour Passage en Caisse (À Chaud)</b>\n` +
                            `${shipping.badge}\n\n` +
                            `👤 <b>Client:</b> ${safeFullName ? escapeText(safeFullName) : 'Non renseigné'}\n` +
                            `📞 <b>Tél:</b> ${safePhone ? escapeText(safePhone) : 'Non renseigné'}\n` +
                            `${safeEmail ? `📧 <b>Email:</b> ${escapeText(safeEmail)}\n` : ''}` +
                            `${locationText}\n` +
                            `${shipping.details}\n` +
                            `${safeSessionId ? `🔑 <b>Session ID:</b> <code>${escapeText(safeSessionId)}</code>\n` : ''}` +
                            `💳 <b>Paiement:</b> ${paymentInfo}\n` +
                            `💰 <b>Total estimé:</b> <b>${total} DH</b>\n` +
                            `${safeComment ? `📝 <b>Note:</b> ${escapeText(safeComment)}\n` : ''}\n` +
                            `📦 <b>Détails du Panier (${items.length}):</b>\n${itemsDetail}\n\n` +
                            `<i>⚡ Coordonnées ou mode de livraison mis à jour en temps réel.</i>`

                        const replyMarkup = buildWhatsAppReplyMarkup(safePhone, shipping.isWorldwide, destinationCountry)
                        await sendTelegramMessage(message, undefined, undefined, replyMarkup)
                    } catch (telegramError) {
                        console.error('Erreur lors de l\'envoi de la notification Telegram:', telegramError)
                    }
                }

                return NextResponse.json({ success: true, id: updated.id })
            }
        }

        // Sinon on crée un nouveau "panier abandonné" en attente
        const newCart = await prisma.abandonedCart.create({
            data: {
                phone: safePhone,
                email: safeEmail,
                fullName: safeFullName,
                cartData,
                total,
                status: 'PENDING',
                salesChannel
            }
        })

        // Envoi de la notification Telegram à chaud
        try {
            const { sendTelegramMessage } = await import('@/lib/telegram')

            const message = `🛒 <b>Début de Passage en Caisse (À Chaud)</b>\n` +
                `${shipping.badge}\n\n` +
                `👤 <b>Client:</b> ${safeFullName ? escapeText(safeFullName) : 'Non renseigné'}\n` +
                `📞 <b>Tél:</b> ${safePhone ? escapeText(safePhone) : 'Non renseigné'}\n` +
                `${safeEmail ? `📧 <b>Email:</b> ${escapeText(safeEmail)}\n` : ''}` +
                `${locationText}\n` +
                `${shipping.details}\n` +
                `${safeSessionId ? `🔑 <b>Session ID:</b> <code>${escapeText(safeSessionId)}</code>\n` : ''}` +
                `💳 <b>Paiement:</b> ${paymentInfo}\n` +
                `💰 <b>Total estimé:</b> <b>${total} DH</b>\n` +
                `${safeComment ? `📝 <b>Note:</b> ${escapeText(safeComment)}\n` : ''}\n` +
                `📦 <b>Détails du Panier (${items.length}):</b>\n${itemsDetail}\n\n` +
                `<i>⚡ Saisi en direct sur le checkout, commande non encore validée.</i>`

            const replyMarkup = buildWhatsAppReplyMarkup(safePhone, shipping.isWorldwide, destinationCountry)
            await sendTelegramMessage(message, undefined, undefined, replyMarkup)
        } catch (telegramError) {
            console.error('Erreur lors de l\'envoi de la notification Telegram:', telegramError)
        }

        return NextResponse.json({ success: true, id: newCart.id })

    } catch (e: any) {
        console.error('Erreur cart abandon:', e)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`abandoned_cart_delete_${ip}`, { limit: 20, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })

        const body = await req.json()
        const { id } = body

        if (id) {
            await prisma.abandonedCart.delete({ where: { id } })
        }
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ success: false })
    }
}
