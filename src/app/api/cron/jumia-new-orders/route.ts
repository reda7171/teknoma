import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { sendTelegramMessage } from '@/lib/telegram'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        if (url.searchParams.get('token') !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return NextResponse.json({ error: 'Jumia non configuré' }, { status: 400 })

        // Get last check date from DB
        const lastCheckSetting = await prisma.siteSettings.findUnique({ where: { key: 'jumia_last_order_check' } })
        let lastCheckDate = new Date(Date.now() - 30 * 60000) // Default: 30 minutes ago
        if (lastCheckSetting?.value) {
            lastCheckDate = new Date(lastCheckSetting.value)
        }

        const now = new Date()
        // Format pour l'API Jumia ISO 8601
        const createdAfter = lastCheckDate.toISOString()
        const createdBefore = now.toISOString()

        const response = await jumia.getOrders(100, undefined, undefined, createdAfter, createdBefore)
        const orders = response?.orders || response?.data?.orders || []

        // Filtrer les commandes strictement plus récentes que la dernière vérification
        const newOrders = orders.filter((o: any) => new Date(o.createdAt).getTime() > lastCheckDate.getTime())

        for (const order of newOrders) {
            const amount = order.totalAmountLocal?.value || '0'
            let imageUrl: string | undefined = undefined
            
            try {
                // Récupérer les items pour trouver l'image
                const itemsResponse = await jumia.getOrderItems(order.orderNumber)
                const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                if (items.length > 0) {
                    imageUrl = items[0].productMainImage || items[0].productImage || undefined
                }
            } catch (err) {}

            const text = `🟠 <b>Nouvelle Commande Jumia !</b>\n\n🆔 Commande: <b>${order.orderNumber}</b>\n💰 Total: <b>${parseFloat(amount).toFixed(2)} MAD</b>\n📝 Statut: <b>${order.status}</b>\n📅 Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}`
            
            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '✅ Ready to Ship', callback_data: `jumia_rts:${order.orderNumber}` },
                        { text: '❌ Annuler', callback_data: `jumia_cancel:${order.orderNumber}` }
                    ]
                ]
            }

            if (imageUrl) {
                const { sendTelegramPhoto } = await import('@/lib/telegram')
                await sendTelegramPhoto(imageUrl, text, undefined, undefined, replyMarkup)
            } else {
                await sendTelegramMessage(text, undefined, undefined, replyMarkup)
            }
        }

        // Update last check date to avoid duplicates
        await prisma.siteSettings.upsert({
            where: { key: 'jumia_last_order_check' },
            update: { value: now.toISOString() },
            create: { key: 'jumia_last_order_check', value: now.toISOString() }
        })

        return NextResponse.json({ success: true, count: newOrders.length, message: `${newOrders.length} nouvelles commandes notifiées.` })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
