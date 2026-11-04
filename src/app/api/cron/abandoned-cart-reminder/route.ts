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
 * Prise en charge des utilisateurs connectés identifiés par téléphone ou par email
 */
export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const now = Date.now()
        const oneHourAgo = new Date(now - 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000)

        // Récupérer les paniers PENDING abandonnés depuis > 1h et < 24h identifiés (phone OU email)
        const abandonedCarts = await prisma.abandonedCart.findMany({
            where: {
                status: 'PENDING',
                OR: [
                    { phone: { not: null } },
                    { email: { not: null } }
                ],
                createdAt: {
                    lte: oneHourAgo,
                    gte: twentyFourHoursAgo
                }
            },
            take: 25,
            orderBy: { createdAt: 'asc' }
        })

        if (abandonedCarts.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucun panier abandonné éligible à relancer.', count: 0 })
        }

        // Modèles de messages WhatsApp configurables (Français & Arabe)
        const templateSetting = await prisma.siteSettings.findUnique({
            where: { key: 'whatsapp_template_abandoned_cart' }
        })
        const templateFr = templateSetting?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_abandoned_cart
        const templateAr = "سلام {customerName} !\nلاحظنا أنك تركت كتباً في سلة مشترياتك على موقع رواية :\n{itemsList}\nاستفد من خصم -10% فوري باستخدام كود الخصم *{promoCode}* لإتمام طلبك : {cartUrl}"

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.riwaya.store'

        let remindedCount = 0
        const logs: Array<{ id: string; phone?: string | null; email?: string | null; status: string }> = []

        for (const cart of abandonedCarts) {
            let targetPhone = cart.phone
            let userLocale = 'fr'

            // Résolution automatique du téléphone pour les utilisateurs connectés identifiés par email
            if ((!targetPhone || targetPhone.trim().length < 8) && cart.email) {
                const user = await prisma.user.findFirst({
                    where: { email: cart.email },
                    select: { phone: true, fullName: true, locale: true }
                })

                if (user?.phone) {
                    targetPhone = user.phone
                    if (user.locale) userLocale = user.locale
                    if (!cart.fullName && user.fullName) cart.fullName = user.fullName
                    await prisma.abandonedCart.update({
                        where: { id: cart.id },
                        data: { phone: user.phone, fullName: cart.fullName }
                    }).catch(() => {})
                } else {
                    // Chercher dans l'historique des commandes passées du même email
                    const pastOrder = await prisma.order.findFirst({
                        where: { email: cart.email, phone: { not: '' } },
                        orderBy: { createdAt: 'desc' },
                        select: { phone: true, fullName: true }
                    })
                    if (pastOrder?.phone) {
                        targetPhone = pastOrder.phone
                        if (!cart.fullName && pastOrder.fullName) cart.fullName = pastOrder.fullName
                        await prisma.abandonedCart.update({
                            where: { id: cart.id },
                            data: { phone: pastOrder.phone, fullName: cart.fullName }
                        }).catch(() => {})
                    }
                }
            }

            // Normalisation du numéro pour WhatsApp
            let cleanPhone = ''
            if (targetPhone) {
                cleanPhone = targetPhone.replace(/[^0-9]/g, '')
                if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1)
                else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) cleanPhone = '212' + cleanPhone
            }

            // Vérifier si le client a déjà finalisé sa commande entre-temps
            const recentOrder = await prisma.order.findFirst({
                where: {
                    OR: [
                        ...(cleanPhone ? [{ phone: { contains: cleanPhone.slice(-8) } }] : []),
                        ...(cart.email ? [{ email: cart.email }] : [])
                    ],
                    createdAt: { gte: cart.createdAt }
                },
                select: { id: true }
            })

            if (recentOrder) {
                await prisma.abandonedCart.update({
                    where: { id: cart.id },
                    data: { status: 'CONVERTED' }
                })
                logs.push({ id: cart.id, phone: cleanPhone, email: cart.email, status: 'ALREADY_ORDERED' })
                continue
            }

            // Extraction et mise en forme des articles du panier
            let items: any[] = []
            let itemsList = ''
            try {
                items = JSON.parse(cart.cartData)
                if (Array.isArray(items) && items.length > 0) {
                    itemsList = items
                        .slice(0, 4)
                        .map(it => `• ${it.title || it.name || 'Livre'} (x${it.quantity || 1})`)
                        .join('\n')
                } else {
                    itemsList = userLocale === 'ar' ? 'كتبك المختارة' : 'Vos livres sélectionnés'
                }
            } catch {
                itemsList = userLocale === 'ar' ? 'كتبك المختارة' : 'Vos livres sélectionnés'
            }

            const customerName = cart.fullName ? cart.fullName.trim() : (userLocale === 'ar' ? 'عزيزي القارئ' : 'Cher lecteur')
            const activeTemplate = userLocale === 'ar' ? templateAr : templateFr
            const cartUrl = `${siteUrl}/${userLocale === 'ar' ? 'ar' : 'fr'}/cart`

            const message = activeTemplate
                .replace(/\{customerName\}/g, customerName)
                .replace(/\{itemsList\}/g, itemsList)
                .replace(/\{promoCode\}/g, 'RIWAYA10')
                .replace(/\{cartUrl\}/g, cartUrl)
                .replace(/\{siteUrl\}/g, siteUrl)
                .replace(/\{total\}/g, `${cart.total.toFixed(2)} DH`)

            // Envoi de la relance WhatsApp via WAHA
            if (cleanPhone && cleanPhone.length >= 8) {
                const sendResult = await sendWhatsAppMessageDirect(cleanPhone, message, {
                    type: 'ABANDONED_CART',
                    metadata: { cartId: cart.id, email: cart.email, customerName, itemsCount: items.length }
                })

                if (sendResult.success) {
                    await prisma.abandonedCart.update({
                        where: { id: cart.id },
                        data: { status: 'REMINDED' }
                    })
                    remindedCount++
                    logs.push({ id: cart.id, phone: cleanPhone, email: cart.email, status: 'SENT_WHATSAPP' })
                } else {
                    logs.push({ id: cart.id, phone: cleanPhone, email: cart.email, status: `FAILED_WHATSAPP: ${sendResult.error || 'erreur'}` })
                }
            } else if (cart.email) {
                logs.push({ id: cart.id, email: cart.email, status: 'NO_PHONE_FOUND_EMAIL_ONLY' })
            }
        }

        // Notification de synthèse sur Telegram si des paniers ont été relancés
        if (remindedCount > 0) {
            const telegramMsg = `🛒 <b>Relance Paniers Abandonnés (WhatsApp)</b>\n\n✅ <b>${remindedCount} client(s) identifié(s)</b> relancé(s) automatiquement par WhatsApp.`
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
