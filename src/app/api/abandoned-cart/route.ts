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
        return `  ${idx + 1}. [${typeBadge}] <b>${title}</b> x${qty}${price ? ` - <b>${price}</b>` : ''}`
    }).join('\n')
}

function escapeText(text?: string | null): string {
    if (!text) return ''
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: Request) {
    try {
        const salesChannel = resolveStorefrontChannel(req.headers)
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`abandoned_cart_post_${ip}`, { limit: 20, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })

        const body = await req.json()
        const { id, phone, email, fullName, items, total, paymentMethod, selectedBank, sessionId } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true }) // Pas d'abandon si panier vide
        }

        // OWASP: Validation et sanitization
        const safeFullName = fullName ? sanitizeInput(fullName as string) : ''
        const safePhone = phone ? sanitizeInput(phone as string) : null
        const safeEmail = email ? sanitizeInput(email as string) : null
        const safeSessionId = sessionId ? sanitizeInput(sessionId as string) : null

        const cartData = JSON.stringify(items)
        const itemsDetail = formatCartItemsDetail(items)

        // Si ID fourni, on met à jour
        if (id) {
            const existing = await prisma.abandonedCart.findUnique({ where: { id } })
            if (existing) {
                const updated = await prisma.abandonedCart.update({
                    where: { id },
                    data: { phone: safePhone, email: safeEmail, fullName: safeFullName, cartData, total, status: 'PENDING', salesChannel }
                })

                // Notification de mise à jour si de nouvelles informations de contact sont ajoutées
                if ((safePhone && !existing.phone) || (safeEmail && !existing.email) || paymentMethod || selectedBank) {
                    try {
                        const { sendTelegramMessage } = await import('@/lib/telegram')
                        let paymentInfo = paymentMethod === 'STRIPE' ? '💳 Carte Bancaire' : paymentMethod === 'TRANSFER' ? '🏦 Virement Bancaire' : '💵 Paiement à la livraison';
                        if (paymentMethod === 'TRANSFER' && selectedBank) {
                            paymentInfo += ` (${escapeText(selectedBank)})`;
                        }

                        const message = `🛒 <b>Mise à jour Passage en Caisse (À Chaud)</b>\n\n` +
                            `👤 <b>Client:</b> ${safeFullName ? escapeText(safeFullName) : 'Non renseigné'}\n` +
                            `📞 <b>Tél:</b> ${safePhone ? escapeText(safePhone) : 'Non renseigné'}\n` +
                            `📧 <b>Email:</b> ${safeEmail ? escapeText(safeEmail) : 'Non renseigné'}\n` +
                            `${safeSessionId ? `🔑 <b>Session ID:</b> <code>${escapeText(safeSessionId)}</code>\n` : ''}` +
                            `💳 <b>Paiement:</b> ${paymentInfo}\n` +
                            `💰 <b>Total estimé:</b> <b>${total} DH</b>\n\n` +
                            `📦 <b>Détails du Panier (${items.length}):</b>\n${itemsDetail}\n\n` +
                            `<i>⚡ Coordonnées ou mode de paiement mis à jour en temps réel.</i>`;
                        let replyMarkup = undefined;
                        if (safePhone) {
                            let cleanPhone = safePhone.replace(/[^0-9]/g, '');
                            if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1);
                            else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) cleanPhone = '212' + cleanPhone;
                            const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
                            replyMarkup = {
                                inline_keyboard: [[{ text: '💬 Contacter sur WhatsApp', url: whatsappUrl }]]
                            };
                        }
                        
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
            let paymentInfo = paymentMethod === 'STRIPE' ? '💳 Carte Bancaire' : paymentMethod === 'TRANSFER' ? '🏦 Virement Bancaire' : '💵 Paiement à la livraison';
            if (paymentMethod === 'TRANSFER' && selectedBank) {
                paymentInfo += ` (${escapeText(selectedBank)})`;
            }

            const message = `🛒 <b>Début de Passage en Caisse (À Chaud)</b>\n\n` +
                `👤 <b>Client:</b> ${safeFullName ? escapeText(safeFullName) : 'Non renseigné'}\n` +
                `📞 <b>Tél:</b> ${safePhone ? escapeText(safePhone) : 'Non renseigné'}\n` +
                `${safeEmail ? `📧 <b>Email:</b> ${escapeText(safeEmail)}\n` : ''}` +
                `${safeSessionId ? `🔑 <b>Session ID:</b> <code>${escapeText(safeSessionId)}</code>\n` : ''}` +
                `💳 <b>Paiement:</b> ${paymentInfo}\n` +
                `💰 <b>Total estimé:</b> <b>${total} DH</b>\n\n` +
                `📦 <b>Détails du Panier (${items.length}):</b>\n${itemsDetail}\n\n` +
                `<i>⚡ Saisi en direct sur le checkout, commande non encore validée.</i>`;
            let replyMarkup = undefined;
            if (safePhone) {
                let cleanPhone = safePhone.replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1);
                else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) cleanPhone = '212' + cleanPhone;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
                replyMarkup = {
                    inline_keyboard: [[{ text: '💬 Contacter sur WhatsApp', url: whatsappUrl }]]
                };
            }
            
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

