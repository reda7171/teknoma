import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { sendTelegramMessage } from '@/lib/telegram'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const expectedToken = process.env.CRON_SECRET?.replace(/^["']|["']$/g, '')
        if (url.searchParams.get('token') !== expectedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return NextResponse.json({ error: 'Jumia non configuré' }, { status: 400 })

        // Get recently notified orders from DB
        const notifiedSetting = await prisma.siteSettings.findUnique({ where: { key: 'jumia_notified_orders' } })
        let notifiedOrders = new Set<string>()
        if (notifiedSetting?.value) {
            try {
                notifiedOrders = new Set(JSON.parse(notifiedSetting.value))
            } catch (e) {}
        }

        const now = new Date()
        const lastCheckDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Look back 24 hours to catch delayed orders
        
        // Format pour l'API Jumia Vendor (attendu : YYYY-MM-DD HH:MM:SS)
        const formatJumiaDate = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0]
        const createdAfter = formatJumiaDate(lastCheckDate)
        const createdBefore = formatJumiaDate(now)

        const response = await jumia.getOrders(100, undefined, undefined, createdAfter, createdBefore)
        const orders = response?.orders || response?.data?.orders || []

        // Filtrer les commandes qui n'ont pas encore été notifiées
        const newOrders = orders.filter((o: any) => !notifiedOrders.has((o.number || o.orderNumber)?.toString()))

        for (const order of newOrders) {
            const amount = order.totalAmountLocal?.value || '0'
            let imageUrl: string | undefined = undefined
            
            const orderId = order.number || order.orderNumber;
            
            try {
                // L'API Jumia nécessite l'ID interne (UUID) pour récupérer les items, pas le numéro public
                const internalId = order.id || orderId
                const itemsResponse = await jumia.getOrderItems(internalId)
                
                // itemsResponse est un tableau de packages, chaque package contient orderItems
                if (Array.isArray(itemsResponse) && itemsResponse.length > 0) {
                    const firstPackage = itemsResponse[0]
                    const items = firstPackage.orderItems || []
                    if (items.length > 0 && items[0].product) {
                        imageUrl = items[0].product.imageUrl || items[0].product.productMainImage || undefined
                    }
                } else {
                    // Fallback si la structure est différente
                    const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    if (items.length > 0) {
                        imageUrl = items[0].product?.imageUrl || items[0].productMainImage || items[0].productImage || undefined
                    }
                }
            } catch (err) {
                console.error("Erreur récupération image Jumia", err)
            }

            const text = `🟠 <b>Nouvelle Commande Jumia !</b>\n\n🆔 Commande: <b>${orderId}</b>\n💰 Total: <b>${parseFloat(amount).toFixed(2)} MAD</b>\n📝 Statut: <b>${order.status}</b>\n📅 Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}`
            
            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '✅ Ready to Ship', callback_data: `jumia_rts:${orderId}` },
                        { text: '❌ Annuler', callback_data: `jumia_cancel:${orderId}` }
                    ]
                ]
            }

            try {
                if (imageUrl) {
                    const { sendTelegramPhoto } = await import('@/lib/telegram')
                    await sendTelegramPhoto(imageUrl, text, undefined, undefined, replyMarkup)
                } else {
                    await sendTelegramMessage(text, undefined, undefined, replyMarkup)
                }
            } catch (telegramErr) {
                console.error("Erreur lors de l'envoi du message Telegram", telegramErr)
                // Si l'envoi de la photo échoue (ex: URL invalide), essayer avec un simple message texte
                if (imageUrl) {
                    try {
                        await sendTelegramMessage(text, undefined, undefined, replyMarkup)
                    } catch (fallbackErr) {
                        console.error("Erreur fallback Telegram", fallbackErr)
                    }
                }
            }

            // Mettre à jour immédiatement la base de données pour éviter de renvoyer la notif si le script time out après
            if (orderId) {
                notifiedOrders.add(orderId.toString())
                const toSave = Array.from(notifiedOrders).slice(-1000)
                await prisma.siteSettings.upsert({
                    where: { key: 'jumia_notified_orders' },
                    update: { value: JSON.stringify(toSave) },
                    create: { key: 'jumia_notified_orders', value: JSON.stringify(toSave) }
                })
            }
        }

        return NextResponse.json({ success: true, count: newOrders.length, message: `${newOrders.length} nouvelles commandes notifiées.` })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
