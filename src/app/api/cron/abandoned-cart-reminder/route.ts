import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"
import { sendWhatsAppMessageDirect } from "@/lib/actions/whatsapp-gateway"
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/constants/whatsapp-templates"
import { sendTelegramMessage } from "@/lib/telegram"

export const dynamic = 'force-dynamic'

/**
 * Cron de relance automatique des paniers abandonnés via WAHA (WhatsApp)
 * Déclenchement recommandé : toutes les 15 à 30 minutes
 * Relance les paniers abandonnés depuis plus d'une heure (entre 1h et 24h)
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const now = Date.now()
        const oneHourAgo = new Date(now - 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000)

        // Récupérer les paniers PENDING abandonnés depuis > 1h et < 24h avec un numéro valide
        const abandonedCarts = await prisma.abandonedCart.findMany({
            where: {
                status: 'PENDING',
                phone: { not: null },
                createdAt: {
                    lte: oneHourAgo,
                    gte: twentyFourHoursAgo
                }
            },
            take: 15,
            orderBy: { createdAt: 'asc' }
        })

        if (abandonedCarts.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucun panier abandonné éligible à relancer.', count: 0 })
        }

        // Récupérer le modèle de message WhatsApp configuré
        const templateSetting = await prisma.siteSettings.findUnique({
            where: { key: 'whatsapp_template_abandoned_cart' }
        })
        const template = templateSetting?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_abandoned_cart
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tekno.ma'

        let remindedCount = 0
        const logs: Array<{ id: string; phone: string; status: string }> = []

        for (const cart of abandonedCarts) {
            if (!cart.phone) continue

            const cleanPhone = cart.phone.replace(/[^0-9]/g, '')
            if (cleanPhone.length < 8) continue

            // Vérifier si le client a déjà passé commande entre-temps avec le même numéro
            const recentOrder = await prisma.order.findFirst({
                where: {
                    phone: { contains: cleanPhone.slice(-8) },
                    createdAt: { gte: cart.createdAt }
                },
                select: { id: true }
            })

            if (recentOrder) {
                // Marquer comme converti pour éviter tout démarchage superflu
                await prisma.abandonedCart.update({
                    where: { id: cart.id },
                    data: { status: 'CONVERTED' }
                })
                logs.push({ id: cart.id, phone: cleanPhone, status: 'ALREADY_ORDERED' })
                continue
            }

            // Extraction propre des articles
            let itemsList = ''
            try {
                const items = JSON.parse(cart.cartData)
                if (Array.isArray(items)) {
                    itemsList = items
                        .slice(0, 4)
                        .map(it => `• ${it.title || it.name || 'Livre'} (x${it.quantity || 1})`)
                        .join('\n')
                }
            } catch {
                itemsList = 'Vos livres sélectionnés'
            }

            const customerName = cart.fullName ? cart.fullName.trim() : 'Cher lecteur'
            const message = template
                .replace(/\{customerName\}/g, customerName)
                .replace(/\{itemsList\}/g, itemsList)
                .replace(/\{promoCode\}/g, 'TEKNO10')
                .replace(/\{cartUrl\}/g, `${siteUrl}/fr/cart`)
                .replace(/\{siteUrl\}/g, siteUrl)
                .replace(/\{total\}/g, `${cart.total.toFixed(2)} DH`)

            // Envoi via WAHA
            const sendResult = await sendWhatsAppMessageDirect(cleanPhone, message, {
                type: 'ABANDONED_CART',
                metadata: { cartId: cart.id, itemsCount: cart.items.length }
            })

            if (sendResult.success) {
                await prisma.abandonedCart.update({
                    where: { id: cart.id },
                    data: { status: 'REMINDED' }
                })
                remindedCount++
                logs.push({ id: cart.id, phone: cleanPhone, status: 'SENT' })
            } else {
                logs.push({ id: cart.id, phone: cleanPhone, status: `FAILED: ${sendResult.error || 'erreur passerelle'}` })
            }
        }

        // Notification de synthèse sur Telegram si des paniers ont été relancés
        if (remindedCount > 0) {
            const telegramMsg = `🛒 <b>Relance Paniers Abandonnés (WAHA)</b>\n\n✅ <b>${remindedCount} client(s)</b> relancé(s) automatiquement par WhatsApp (1h après abandon).`
            await sendTelegramMessage(telegramMsg).catch(() => null)
        }

        return NextResponse.json({
            success: true,
            remindedCount,
            totalEvaluated: abandonedCarts.length,
            details: logs
        })
    } catch (e: any) {
        console.error('[CRON_ABANDONED_CART_REMINDER_ERROR]', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
