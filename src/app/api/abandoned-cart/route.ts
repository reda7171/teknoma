import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'

export async function POST(req: Request) {
    try {
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`abandoned_cart_post_${ip}`, { limit: 20, windowMs: 60000 })
        if (!limiter.success) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })

        const body = await req.json()
        const { id, phone, email, fullName, items, total, paymentMethod, selectedBank } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true }) // Pas d'abandon si panier vide
        }

        // OWASP: Validation et sanitization
        const safeFullName = fullName ? sanitizeInput(fullName as string) : ''
        const safePhone = phone ? sanitizeInput(phone as string) : null
        const safeEmail = email ? sanitizeInput(email as string) : null

        const cartData = JSON.stringify(items)

        // Si ID fourni, on met à jour
        if (id) {
            const existing = await prisma.abandonedCart.findUnique({ where: { id } })
            if (existing) {
                const updated = await prisma.abandonedCart.update({
                    where: { id },
                    data: { phone: safePhone, email: safeEmail, fullName: safeFullName, cartData, total, status: 'PENDING' }
                })

                // Notification de mise à jour si de nouvelles informations de contact sont ajoutées
                if ((safePhone && !existing.phone) || (safeEmail && !existing.email) || paymentMethod || selectedBank) {
                    try {
                        const { sendTelegramMessage } = await import('@/lib/telegram')
                        let paymentInfo = paymentMethod === 'STRIPE' ? '💳 Carte Bancaire' : paymentMethod === 'TRANSFER' ? '🏦 Virement Bancaire' : '💵 Paiement à la livraison';
                        if (paymentMethod === 'TRANSFER' && selectedBank) {
                            paymentInfo += ` (${selectedBank})`;
                        }

                        const message = `🛒 *Mise à jour Checkout (À Chaud)*\n\n` +
                            `👤 *Client:* ${safeFullName || 'Non renseigné'}\n` +
                            `📞 *Tél:* ${safePhone || 'Non renseigné'}\n` +
                            `📧 *Email:* ${safeEmail || 'Non renseigné'}\n` +
                            `💳 *Paiement:* ${paymentInfo}\n` +
                            `💰 *Total:* ${total} DH\n` +
                            `\n_Contact ou mode de paiement mis à jour en temps réel._`;
                        
                        await sendTelegramMessage(message)
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
                status: 'PENDING'
            }
        })

        // Envoi de la notification Telegram à chaud
        try {
            const { sendTelegramMessage } = await import('@/lib/telegram')
            let paymentInfo = paymentMethod === 'STRIPE' ? '💳 Carte Bancaire' : paymentMethod === 'TRANSFER' ? '🏦 Virement Bancaire' : '💵 Paiement à la livraison';
            if (paymentMethod === 'TRANSFER' && selectedBank) {
                paymentInfo += ` (${selectedBank})`;
            }

            const message = `🛒 *Début de Checkout (À Chaud)*\n\n` +
                `👤 *Client:* ${safeFullName || 'Non renseigné'}\n` +
                `📞 *Tél:* ${safePhone || 'Non renseigné'}\n` +
                `💳 *Paiement:* ${paymentInfo}\n` +
                `💰 *Total:* ${total} DH\n` +
                `📦 *Articles:* ${items.length}\n` +
                `\n_Saisi en temps réel, commande non finalisée._`;
            
            await sendTelegramMessage(message)
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

