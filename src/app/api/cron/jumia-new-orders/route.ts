import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'

function extractOrderItems(response: any): any[] {
    if (!response) return []

    const containers = Array.isArray(response)
        ? response
        : response.data && Array.isArray(response.data)
            ? response.data
            : [response.data || response]

    return containers.flatMap((container: any) => {
        if (Array.isArray(container)) return container
        if (Array.isArray(container?.orderItems)) return container.orderItems
        if (Array.isArray(container?.items)) return container.items
        if (Array.isArray(container?.data?.orderItems)) return container.data.orderItems
        if (Array.isArray(container?.data?.items)) return container.data.items
        return []
    })
}

function formatAmount(value: unknown): string {
    const amount = typeof value === 'object' && value !== null && 'value' in value
        ? (value as { value: unknown }).value
        : value
    const parsed = Number.parseFloat(String(amount ?? 0))
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

export async function GET(req: Request) {
    try {
        if (!isAuthorizedCronRequest(req)) {


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
        const lastCheckDate = new Date(now.getTime() - 72 * 60 * 60 * 1000) // Look back 3 days to catch delayed orders

        // Format pour l'API Jumia Vendor (attendu : YYYY-MM-DD HH:MM:SS ou ISO 8601)
        // L'utilisation d'une date sans fuseau horaire explicite provoque un décalage de 1h avec Jumia (GMT+1).
        // On convertit en heure locale Maroc ou on passe directement l'ISO sans Z.
        const formatJumiaDate = (d: Date) => d.toISOString().split('T')[0];
        const createdAfter = formatJumiaDate(lastCheckDate)

        // On supprime createdBefore pour toujours inclure les commandes jusqu'à la seconde présente
        // On utilise createdAt DESC pour avoir les plus récentes en premier et on pagine
        let allOrders: any[] = []
        let currentToken: string | undefined = undefined
        do {
            const response = await jumia.getOrders(100, currentToken, undefined, createdAfter, undefined, 'createdAt', 'DESC')
            const ordersPage = response?.orders || response?.data?.orders || []
            allOrders = allOrders.concat(ordersPage)
            currentToken = response?.nextToken || response?.data?.nextToken

            // Si on ne récupère plus de commandes, on arrête
            if (ordersPage.length === 0) break
        } while (currentToken)

        // Filtrer les commandes qui n'ont pas encore été notifiées
        const newOrders = allOrders.filter((o: any) => !notifiedOrders.has((o.number || o.orderNumber)?.toString()))

        for (const order of newOrders) {
            const amount = order.totalAmountLocal?.value || '0'
            let imageUrl: string | undefined = undefined

            const orderId = order.number || order.orderNumber;
            const orderInternalId = String(order.id || orderId)
            const syncTargets: Array<{ sellerSku: string; stock: number }> = []

            let itemsText = ""
            try {
                // L'API Jumia nécessite l'ID interne (UUID) pour récupérer les items, pas le numéro public
                const itemsResponse = await jumia.getOrderItems(orderInternalId)

                // Jumia renvoie selon le cas des packages `orderItems` ou un
                // conteneur `items`, comme celui consommé par la page admin.
                const allItems = extractOrderItems(itemsResponse)

                if (allItems.length > 0) {
                    const firstItem = allItems[0]
                    imageUrl = firstItem.product?.imageUrl || firstItem.product?.productMainImage || firstItem.imageUrl || firstItem.productMainImage || firstItem.productImage || undefined

                    itemsText = `\n\n📦 <b>Articles de la commande (${allItems.length})</b>\n\n`
                    for (const item of allItems) {
                        const rawProductName = item.product?.name || item.Name || item.name || item.productName || 'Article inconnu'
                        const productName = escapeHtml(String(rawProductName))
                        const quantity = item.quantity || 1
                        const price = formatAmount(item.itemPriceLocal ?? item.Price ?? item.price ?? item.unitPrice)
                        const rawSellerSku = item.product?.sellerSku || item.Sku || item.sellerSku || item.SellerSku || item.sku || item.shopSku || 'N/A'
                        const itemSellerSku = escapeHtml(String(rawSellerSku))
                        const status = escapeHtml(String(item.status || item.Status || order.status || 'N/A'))
                        const rawTracking = item.trackingNumber || item.TrackingCode || item.trackingCode
                        const tracking = rawTracking ? escapeHtml(String(rawTracking)) : 'Non expédié'
                        const productUrl = item.ProductUrl || `https://www.jumia.ma/catalog/?q=${encodeURIComponent(String(rawSellerSku))}`
                        const trackingUrl = item.trackingUrl || (rawTracking
                            ? `https://packagetracker-services.jumia.com/#/MA/en/package/tracking/${encodeURIComponent(String(rawTracking))}`
                            : undefined)

                        itemsText += `🔸 <b>Produit:</b> ${quantity}x <a href="${escapeHtml(productUrl)}">${productName}</a>\n`
                        itemsText += `🏷 <b>SKU Vendeur:</b> ${itemSellerSku}\n`
                        itemsText += `📝 <b>Statut:</b> ${status}\n`
                        itemsText += `💰 <b>Prix:</b> ${price} درهم\n`
                        itemsText += `🚚 <b>Tracking:</b> ${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}">${tracking}</a>` : tracking}\n\n`

                        const sellerSku = item.product?.sellerSku || item.Sku || item.sellerSku || item.SellerSku || item.sku || item.shopSku
                        if (sellerSku) {
                            try {
                                await prisma.book.updateMany({
                                    where: { sellerSku: sellerSku },
                                    data: { stock: { decrement: quantity } }
                                })
                                const pack = await prisma.pack.findUnique({
                                    where: { sellerSku: sellerSku },
                                    include: { books: true }
                                })
                                if (pack) {
                                    for (const packBook of pack.books) {
                                        await prisma.book.updateMany({
                                            where: { id: packBook.bookId },
                                            data: { stock: { decrement: quantity } }
                                        })
                                    }
                                }
                                await prisma.extraProduct.updateMany({
                                    where: { sellerSku: sellerSku },
                                    data: { stock: { decrement: quantity } }
                                })
                                await prisma.jumiaActionLog.create({
                                    data: {
                                        orderId: orderId.toString(),
                                        action: "AUTO_DECREMENT_STOCK",
                                        status: "SUCCESS",
                                        detail: `Décrémentation de ${quantity} unité(s) pour le SKU ${sellerSku}`
                                    }
                                })
                            } catch (e) {
                                console.error("Failed to decrement local stock for Jumia order", e)
                            }

                            try {
                                const [jumiaStockResponse, book, extraProduct, pack] = await Promise.all([
                                    jumia.getCatalogStock({ sellerSku: String(sellerSku), size: 10 }),
                                    prisma.book.findUnique({
                                        where: { sellerSku: String(sellerSku) },
                                        select: { stock: true }
                                    }),
                                    prisma.extraProduct.findUnique({
                                        where: { sellerSku: String(sellerSku) },
                                        select: { stock: true }
                                    }),
                                    prisma.pack.findUnique({
                                        where: { sellerSku: String(sellerSku) },
                                        include: { books: { include: { book: { select: { stock: true } } } } }
                                    })
                                ])

                                const jumiaStockItems = jumiaStockResponse?.products || jumiaStockResponse?.data?.products || []
                                const jumiaStockItem = jumiaStockItems.find((stockItem: any) => stockItem.sellerSku === sellerSku)
                                    || jumiaStockItems[0]
                                const jumiaStock = jumiaStockItem?.globalStock ?? jumiaStockItem?.stock ?? 'Indisponible'
                                const packStock = pack?.books.length
                                    ? Math.min(...pack.books.map(packBook => packBook.book.stock))
                                    : undefined
                                const teknoStock = book?.stock ?? extraProduct?.stock ?? packStock ?? 'Produit non lié'

                                if (typeof teknoStock === 'number') {
                                    syncTargets.push({ sellerSku: String(sellerSku), stock: teknoStock })
                                }

                                itemsText += `📊 <b>Stock Jumia:</b> ${escapeHtml(String(jumiaStock))}\n`
                                if (typeof teknoStock === 'number') {
                                    itemsText += `🏪 <b>Stock Tekno Store avant:</b> ${teknoStock + Number(quantity)}\n`
                                    itemsText += `🏪 <b>Stock Tekno Store après:</b> ${teknoStock}\n\n`
                                } else {
                                    itemsText += `🏪 <b>Stock Tekno Store:</b> ${escapeHtml(String(teknoStock))}\n\n`
                                }
                            } catch (stockError) {
                                console.error("Erreur récupération stocks Jumia/Tekno Store", stockError)
                                itemsText += `📊 <b>Stocks:</b> information indisponible\n\n`
                            }
                        } else {
                            itemsText += `📊 <b>Stocks:</b> SKU absent, comparaison impossible\n\n`
                        }
                    }
                }
            } catch (err) {
                console.error("Erreur récupération image/items Jumia", err)
            }

            const customerName = `${order.shippingAddress?.firstName || order.CustomerFirstName || ''} ${order.shippingAddress?.lastName || order.CustomerLastName || ''}`.trim() || 'Client Jumia'
            const text = `🟠 <b>Nouvelle Commande Jumia !</b>\n\n🆔 Commande: <b>${escapeHtml(orderId.toString())}</b>\n📅 Date: ${new Date(order.createdAt || order.CreatedAt).toLocaleString('fr-FR')}\n👤 Client: <b>${escapeHtml(customerName)}</b>\n📝 Statut: <b>${escapeHtml(order.status || order.Status || 'N/A')}</b>\n💰 Total: <b>${formatAmount(amount)} درهم</b>${itemsText}\n🔄 <b>Voulez-vous synchroniser le stock Tekno Store vers Jumia ?</b>`
            const syncButtonLabel = syncTargets.length === 1
                ? `✅ Oui, mettre à ${syncTargets[0].stock}`
                : '✅ Oui, synchroniser ces articles'

            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '🏷️ Imprimer étiquette', callback_data: `jumia_label:${orderInternalId}` },
                        { text: '✅ Ready to Ship', callback_data: `jumia_rts:${orderInternalId}` },
                        { text: '❌ Annuler', callback_data: `jumia_cancel:${orderInternalId}` }
                    ],
                    [
                        { text: syncButtonLabel, callback_data: `jumia:sync_order_stock:${orderInternalId}` },
                        { text: '❌ Non', callback_data: 'jumia:skip_sync' }
                    ]
                ]
            }

            try {
                if (imageUrl) {
                    const { sendTelegramPhoto } = await import('@/lib/telegram')
                    const photoRes = await sendTelegramPhoto(imageUrl, text, undefined, undefined, replyMarkup)
                    if (!photoRes?.ok) {
                        await sendTelegramMessage(text, undefined, undefined, replyMarkup)
                    }
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
