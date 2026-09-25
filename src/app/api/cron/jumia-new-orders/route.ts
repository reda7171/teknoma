import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'
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
            
            let itemsText = ""
            try {
                // L'API Jumia nécessite l'ID interne (UUID) pour récupérer les items, pas le numéro public
                const internalId = order.id || orderId
                const itemsResponse = await jumia.getOrderItems(internalId)
                
                let allItems: any[] = []
                
                // itemsResponse est un tableau de packages, chaque package contient orderItems
                if (Array.isArray(itemsResponse) && itemsResponse.length > 0) {
                    for (const pkg of itemsResponse) {
                        const items = pkg.orderItems || []
                        allItems = allItems.concat(items)
                    }
                } else {
                    // Fallback si la structure est différente
                    allItems = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                }
                
                if (allItems.length > 0) {
                    const firstItem = allItems[0]
                    imageUrl = firstItem.product?.imageUrl || firstItem.product?.productMainImage || firstItem.imageUrl || firstItem.productMainImage || firstItem.productImage || undefined
                    
                    itemsText = `\n\n📦 <b>Articles de la commande (${allItems.length})</b>\n\n`
                    for (const item of allItems) {
                        const productName = escapeHtml(item.product?.name || item.name || item.productName || 'Article inconnu')
                        const quantity = item.quantity || 1
                        const price = item.price?.value || item.price || item.unitPrice || '0'
                        const itemSellerSku = escapeHtml(item.product?.sellerSku || item.sellerSku || item.sku || item.shopSku || 'N/A')
                        const status = escapeHtml(item.status || order.status || 'N/A')
                        const tracking = escapeHtml(item.trackingCode || item.trackingNumber || 'En attente')
                        
                        itemsText += `🔸 <b>Produit:</b> ${quantity}x ${productName}\n`
                        itemsText += `🏷 <b>SKU Vendeur:</b> ${itemSellerSku}\n`
                        itemsText += `📝 <b>Statut:</b> ${status}\n`
                        itemsText += `💰 <b>Prix:</b> ${price} درهم\n`
                        itemsText += `🚚 <b>Tracking:</b> ${tracking}\n\n`

                        const sellerSku = item.product?.sellerSku || item.sellerSku || item.sku || item.shopSku
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
                                        await prisma.book.update({
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
                        }
                    }
                }
            } catch (err) {
                console.error("Erreur récupération image/items Jumia", err)
            }

            const text = `🟠 <b>Nouvelle Commande Jumia !</b>\n\n🆔 Commande: <b>${escapeHtml(orderId.toString())}</b>\n💰 Total: <b>${parseFloat(amount).toFixed(2)} درهم</b>\n📝 Statut: <b>${escapeHtml(order.status || 'N/A')}</b>\n📅 Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}${itemsText}`
            
            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '✅ Ready to Ship', callback_data: `jumia_rts:${orderId}` },
                        { text: '❌ Annuler', callback_data: `jumia_cancel:${orderId}` }
                    ],
                    [
                        { text: '🔄 synch stock RIWAYA', callback_data: 'jumia:sync_stock' }
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
