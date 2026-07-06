import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { answerCallbackQuery, editTelegramMessage, sendTelegramMessage, sendTelegramPhoto, sendTelegramMediaGroup } from '@/lib/telegram'
import { OrderStatus } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    SHIPPED: 'En livraison',
    DELIVERED: 'Livrée',
    RETURNED: 'Retournée',
    CANCELLED: 'Annulée',
    IN_TRANSIT: 'En transit',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    FAILED: 'Échec',
}

export async function POST(req: Request) {
    let currentCallbackId: string | null = null
    let currentToken: string | null = null

    try {
        const { searchParams } = new URL(req.url)
        const queryToken = searchParams.get('token')
        
        const body = await req.json()
        console.log('[TELEGRAM WEBHOOK] Incoming Body:', JSON.stringify(body))
        
        // Récupérer le token depuis la DB
        const tokenSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
        const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || ''
        currentToken = token

        if (!token) {
            console.error('[SECURITY] Bot token not configured')
            return NextResponse.json({ error: 'Not configured' }, { status: 500 })
        }

        if (queryToken && queryToken !== token) {
            console.error('[SECURITY] Unauthorized Telegram Webhook attempt: Token mismatch')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Traitement des callback_query (boutons)
        if (body.callback_query) {
            const { id: callbackId, data, message } = body.callback_query
            currentCallbackId = callbackId
            const { escapeHtml } = await import('@/lib/telegram')
            
            console.log(`[TELEGRAM CALLBACK] Received ID: ${callbackId}, Data: ${data}`)

            // Format attendu: os:{orderId}:{STATUS}
            if (data && data.startsWith('os:')) {
                const parts = data.split(':')
                const orderId = parts[1]
                const newStatus = parts[2]
                
                console.log(`[TELEGRAM STATUS] Updating order ${orderId} to status: ${newStatus}`)

                if (!STATUS_LABELS[newStatus]) {
                    console.warn(`[TELEGRAM] Status label not found for: ${newStatus}`)
                    await answerCallbackQuery(callbackId, '❌ Statut invalide', token)
                    return NextResponse.json({ ok: true })
                }

                try {
                    const order = await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: newStatus as OrderStatus,
                            statusHistory: {
                                create: {
                                    status: newStatus as OrderStatus,
                                    comment: 'Statut mis à jour via Telegram Bot',
                                    createdBy: 'TELEGRAM'
                                }
                            }
                        }
                    })

                    console.log(`[TELEGRAM] Order ${orderId} successfully updated to ${newStatus}`)
                    const label = STATUS_LABELS[newStatus]
                    await answerCallbackQuery(callbackId, `✅ Statut : ${label}`, token)

                    const shortId = orderId.slice(0, 8).toUpperCase()
                    const updatedText = `✅ <b>Commande #${shortId}</b>\n\n` +
                        `👤 ${escapeHtml(order.fullName)}\n` +
                        `📍 ${escapeHtml(order.city)}\n` +
                        `💰 ${order.total.toFixed(2)} MAD\n\n` +
                        `📌 <b>Statut :</b> ${label}`

                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token, message.reply_markup)
                    }
                } catch (error) {
                    console.error('[TELEGRAM] Database error during status update:', error)
                    await answerCallbackQuery(callbackId, '❌ Erreur : Commande introuvable ou erreur DB', token)
                }
            }
            
            // Format: sw:{orderId}
            else if (data && data.startsWith('sw:')) {
                const [, orderId] = data.split(':')
                const { syncOrderToWithYou } = await import('@/lib/actions/admin-orders')

                try {
                    const result = await syncOrderToWithYou(orderId)
                    if (result.success) {
                        await answerCallbackQuery(callbackId, `🚀 Expédié WithYou avec succès !`, token)
                        const order = await prisma.order.findUnique({ where: { id: orderId } })
                        if (order && message?.chat?.id && message?.message_id) {
                            const shortId = orderId.slice(0, 8).toUpperCase()
                            const updatedText = `✅ <b>Commande #${shortId} EXPÉDIÉE</b>\n\n` +
                                `👤 ${escapeHtml(order.fullName)}\n` +
                                `📍 ${escapeHtml(order.city)}\n` +
                                `💰 ${order.total.toFixed(2)} MAD\n\n` +
                                `🚀 <b>WithYou Tracking :</b> <code>${order.trackingID}</code>\n` +
                                `📌 <b>Statut :</b> Confirmée`
                            await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                        }
                    } else {
                        await answerCallbackQuery(callbackId, `❌ Erreur : ${result.error}`, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur système : ${error.message}`, token)
                }
            }
            
            else if (data && data.startsWith('jumia_rts:')) {
                const [, orderId] = data.split(':')
                const { packJumiaOrderFull } = await import('@/app/[locale]/admin/jumia-orders/actions')

                try {
                    await answerCallbackQuery(callbackId, `⏳ Préparation de la commande ${orderId}...`, token)
                    await packJumiaOrderFull(orderId)
                    
                    if (message?.chat?.id && message?.message_id) {
                        const { escapeHtml } = await import('@/lib/telegram')
                        const safeText = escapeHtml(message.text || '')
                        const updatedText = safeText + '\n\n✅ <b>Statut mis à jour sur Jumia :</b> Prête à expédier (Ready-to-Ship)'
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur Jumia : ${error.message}`, token)
                }
            }

            else if (data && data.startsWith('upd_stock:')) {
                const bookId = data.split(':')[1]
                const book = await prisma.book.findUnique({ where: { id: bookId } })
                if (!book) {
                    await answerCallbackQuery(callbackId, 'Livre introuvable.', token)
                } else {
                    await answerCallbackQuery(callbackId, 'Instructions envoyées.', token)
                    await sendTelegramMessage(`🔄 Pour mettre à jour le stock de <b>${book.title}</b> :\n\nCopiez et envoyez la commande suivante avec la nouvelle quantité :\n<code>/setstock ${book.id} [quantité]</code>`, message?.chat?.id.toString(), token)
                }
            }
            // Format: jumia:pending_orders | jumia:monthly_stats | jumia:returns_check
            else if (data && data.startsWith('jumia:')) {
                const action = data.split(':')[1]
                try {
                    if (action === 'pending_orders') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const response = await jumia.getOrders(20, undefined, 'PENDING')
                        const orders = response?.orders || response?.data?.orders || []
                        if (orders.length === 0) {
                            await answerCallbackQuery(callbackId, '✅ Aucune commande en attente', token)
                        } else {
                            const lines = orders.slice(0, 10).map((o: any) => {
                                const id = o.number || o.orderId || 'N/A'
                                const amount = o.totalAmountLocal?.value || '?'
                                const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : ''
                                return `📦 #${id} | ${amount} MAD | ${date}`
                            }).join('\n')
                            const keyboard = orders.slice(0, 5).map((o: any) => {
                                const id = o.number || o.orderId
                                return [{ text: `📦 Préparer #${id}`, callback_data: `jumia_rts:${id}` }]
                            })
                            await answerCallbackQuery(callbackId, `${orders.length} commande(s) en attente`, token)
                            await sendTelegramMessage(`🟠 <b>${orders.length} Commande(s) Jumia En Attente</b>\n\n${lines}`, message?.chat?.id.toString(), token, { inline_keyboard: keyboard })
                        }
                    } else if (action === 'monthly_stats') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
                        
                        let allOrders: any[] = []
                        let hasMore = true
                        let nextToken: string | undefined = undefined
                        while (hasMore) {
                            const response = await jumia.getOrders(100, nextToken, undefined, monthStart, monthEnd)
                            const orders = response?.orders || response?.data?.orders || []
                            allOrders = allOrders.concat(orders)
                            nextToken = response?.nextPageToken || response?.data?.nextPageToken
                            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                        }
                        
                        const revenue = allOrders.reduce((s: number, o: any) => s + parseFloat(o.totalAmountLocal?.value || '0'), 0)
                        const pending = allOrders.filter((o: any) => (o.status || '').toUpperCase() === 'PENDING').length
                        const delivered = allOrders.filter((o: any) => (o.status || '').toUpperCase() === 'DELIVERED').length
                        const text = `📊 <b>Bilan Jumia — ${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</b>\n\n📦 Total: <b>${allOrders.length}</b>\n⏳ En attente: <b>${pending}</b>\n✅ Livrées: <b>${delivered}</b>\n💰 CA: <b>${revenue.toFixed(2)} MAD</b>`
                        await answerCallbackQuery(callbackId, 'Bilan Jumia chargé', token)
                        await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                    } else if (action === 'yearly_stats') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
                        const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                        
                        let allOrders: any[] = []
                        let hasMore = true
                        let nextToken: string | undefined = undefined
                        while (hasMore) {
                            const response = await jumia.getOrders(100, nextToken, undefined, yearStart, yearEnd)
                            const orders = response?.orders || response?.data?.orders || []
                            allOrders = allOrders.concat(orders)
                            nextToken = response?.nextPageToken || response?.data?.nextPageToken
                            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                        }

                        const revenue = allOrders.reduce((s: number, o: any) => s + parseFloat(o.totalAmountLocal?.value || '0'), 0)
                        const pending = allOrders.filter((o: any) => (o.status || '').toUpperCase() === 'PENDING').length
                        const delivered = allOrders.filter((o: any) => (o.status || '').toUpperCase() === 'DELIVERED').length
                        const text = `📅 <b>Bilan Jumia — Année ${now.getFullYear()}</b>\n\n📦 Total: <b>${allOrders.length}</b>\n⏳ En attente: <b>${pending}</b>\n✅ Livrées: <b>${delivered}</b>\n💰 CA: <b>${revenue.toFixed(2)} MAD</b>`
                        await answerCallbackQuery(callbackId, 'Bilan Jumia annuel chargé', token)
                        await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                    } else if (action === 'yearly_chart') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
                        const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                        
                        await answerCallbackQuery(callbackId, 'Génération du graphique...', token)

                        let allOrders: any[] = []
                        let hasMore = true
                        let nextToken: string | undefined = undefined
                        while (hasMore) {
                            const response = await jumia.getOrders(100, nextToken, undefined, yearStart, yearEnd)
                            const orders = response?.orders || response?.data?.orders || []
                            allOrders = allOrders.concat(orders)
                            nextToken = response?.nextPageToken || response?.data?.nextPageToken
                            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                        }

                        const monthlyRevenue = Array(12).fill(0)
                        const monthlyTotalOrders = Array(12).fill(0)
                        const monthlyCanceledOrders = Array(12).fill(0)
                        
                        allOrders.forEach(o => {
                            if (o.createdAt && o.status) {
                                const month = new Date(o.createdAt).getMonth()
                                monthlyTotalOrders[month]++
                                
                                if (o.status.toUpperCase() === 'CANCELED') {
                                    monthlyCanceledOrders[month]++
                                } else if (o.status.toUpperCase() !== 'RETURNED') {
                                    const amount = parseFloat(o.totalAmountLocal?.value || '0')
                                    monthlyRevenue[month] += amount
                                }
                            }
                        })

                        const cancellationRate = monthlyTotalOrders.map((total, i) => total > 0 ? Math.round((monthlyCanceledOrders[i] / total) * 100) : 0)

                        const chartConfig = {
                            type: 'bar',
                            data: {
                                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                                datasets: [
                                    {
                                        type: 'line',
                                        label: 'Taux Annulation (%)',
                                        data: cancellationRate,
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        borderWidth: 2,
                                        fill: false,
                                        yAxisID: 'y1'
                                    },
                                    {
                                        type: 'bar',
                                        label: 'CA Net (MAD)',
                                        data: monthlyRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(255, 153, 0, 0.8)',
                                        borderRadius: 4,
                                        yAxisID: 'y'
                                    }
                                ]
                            },
                            options: {
                                plugins: {
                                    title: { display: true, text: `Évolution CA Jumia & Annulations - ${now.getFullYear()}` }
                                },
                                scales: {
                                    y: { type: 'linear', display: true, position: 'left' },
                                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100 }
                                }
                            }
                        }
                        
                        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`
                        
                        const { sendTelegramPhoto } = await import('@/lib/telegram')
                        await sendTelegramPhoto(chartUrl, `📈 <b>Évolution du CA Jumia et Annulations (${now.getFullYear()})</b>`, message?.chat?.id.toString(), token)
                    } else if (action === 'jumia_vs_store_chart') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
                        const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                        
                        await answerCallbackQuery(callbackId, 'Génération comparatif en cours...', token)

                        let allOrders: any[] = []
                        let hasMore = true
                        let nextToken: string | undefined = undefined
                        while (hasMore) {
                            const response = await jumia.getOrders(100, nextToken, undefined, yearStart, yearEnd)
                            const orders = response?.orders || response?.data?.orders || []
                            allOrders = allOrders.concat(orders)
                            nextToken = response?.nextPageToken || response?.data?.nextPageToken
                            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                        }

                        const monthlyJumiaRevenue = Array(12).fill(0)
                        allOrders.forEach(o => {
                            if (o.createdAt && o.status && (o.status.toUpperCase() !== 'CANCELED' && o.status.toUpperCase() !== 'RETURNED')) {
                                const month = new Date(o.createdAt).getMonth()
                                const amount = parseFloat(o.totalAmountLocal?.value || '0')
                                monthlyJumiaRevenue[month] += amount
                            }
                        })

                        const storeOrders = await prisma.order.findMany({
                            where: {
                                createdAt: {
                                    gte: new Date(yearStart),
                                    lte: new Date(yearEnd + 'T23:59:59Z')
                                }
                            },
                            select: { total: true, createdAt: true, status: true }
                        })

                        const monthlyStoreRevenue = Array(12).fill(0)
                        storeOrders.forEach(o => {
                            if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') {
                                const month = o.createdAt.getMonth()
                                monthlyStoreRevenue[month] += o.total
                            }
                        })

                        const chartConfig = {
                            type: 'bar',
                            data: {
                                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                                datasets: [
                                    {
                                        label: 'Boutique (MAD)',
                                        data: monthlyStoreRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                                        borderRadius: 4
                                    },
                                    {
                                        label: 'Jumia (MAD)',
                                        data: monthlyJumiaRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(255, 153, 0, 0.8)',
                                        borderRadius: 4
                                    }
                                ]
                            },
                            options: {
                                plugins: {
                                    title: { display: true, text: `Comparatif Jumia vs Boutique - ${now.getFullYear()}` }
                                }
                            }
                        }
                        
                        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`
                        
                        const { sendTelegramPhoto } = await import('@/lib/telegram')
                        await sendTelegramPhoto(chartUrl, `📊 <b>Comparatif Jumia vs Boutique (${now.getFullYear()})</b>`, message?.chat?.id.toString(), token)
                    } else if (action === 'returns_check') {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/jumia-returns-alert${process.env.CRON_SECRET ? `?token=${process.env.CRON_SECRET}` : ''}`)
                        await answerCallbackQuery(callbackId, '🔄 Vérification retours...', token)
                    }
                } catch (err: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur: ${err.message}`, token)
                }
            }
            
            // Format: promo_flash:{bookId}
            else if (data && data.startsWith('promo_flash:')) {
                const [, bookId] = data.split(':')
                try {
                    const book = await prisma.book.findUnique({ where: { id: bookId } })
                    if (!book) throw new Error('Livre introuvable')
                    
                    const newPrice = Math.round(book.price * 0.9) // -10%
                    await prisma.book.update({
                        where: { id: bookId },
                        data: { price: newPrice }
                    })

                    await answerCallbackQuery(callbackId, `🏷️ Promo appliquée : ${newPrice} MAD`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `🏷️ <b>PROMO FLASH APPLIQUÉE (-10%)</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `💰 <b>Ancien prix:</b> ${book.price} MAD\n` +
                                            `🔥 <b>Nouveau prix:</b> ${newPrice} MAD\n` +
                                            `📦 <b>Stock:</b> ${book.stock}`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: jumia_rts:{orderNumber}
            else if (data && data.startsWith('jumia_rts:')) {
                const [, orderNumber] = data.split(':')
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (!jumia) throw new Error('Jumia non configuré')
                    
                    const itemsResponse = await jumia.getOrderItems(orderNumber)
                    const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    const orderItemIds = items.map((i: any) => i.orderItemId)

                    if (orderItemIds.length === 0) throw new Error('Aucun article trouvé')

                    await jumia.packOrders({ orderItemIds, deliveryType: 'dropship' })
                    
                    const providersResponse = await jumia.getShipmentProviders(orderItemIds)
                    const providers = providersResponse?.shipmentProviders || providersResponse?.data?.shipmentProviders || []
                    const defaultProvider = providers.length > 0 ? providers[0].name : ''

                    await jumia.readyToShipOrders({
                        orderItemIds,
                        deliveryType: 'dropship',
                        shipmentProvider: defaultProvider,
                        trackingNumber: ''
                    })

                    await answerCallbackQuery(callbackId, `✅ Commande ${orderNumber} passée en Ready to Ship`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `✅ <b>Commande Jumia prête à expédier (RTS)</b>\n\n🆔 Commande: <b>${orderNumber}</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur RTS : ${error.message}`, token)
                }
            }

            // Format: jumia_cancel:{orderNumber}
            else if (data && data.startsWith('jumia_cancel:')) {
                const [, orderNumber] = data.split(':')
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (!jumia) throw new Error('Jumia non configuré')
                    
                    const itemsResponse = await jumia.getOrderItems(orderNumber)
                    const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    const orderItemIds = items.map((i: any) => i.orderItemId)

                    if (orderItemIds.length === 0) throw new Error('Aucun article trouvé')

                    await jumia.cancelOrders(orderItemIds)
                    
                    await answerCallbackQuery(callbackId, `❌ Commande ${orderNumber} annulée`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `❌ <b>Commande Jumia annulée</b>\n\n🆔 Commande: <b>${orderNumber}</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur Annulation : ${error.message}`, token)
                }
            }

            // Format: restock:{bookId}:{amount}
            else if (data && data.startsWith('restock:')) {
                const [, bookId, amount] = data.split(':')
                try {
                    const book = await prisma.book.update({
                        where: { id: bookId },
                        data: { stock: { increment: parseInt(amount) } }
                    })
                    await answerCallbackQuery(callbackId, `📦 Stock mis à jour : ${book.stock}`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `✅ <b>RÉAPPROVISIONNEMENT EFFECTUÉ</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `📦 <b>Nouveau stock:</b> <b>${book.stock}</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: hide_book:{bookId}
            else if (data && data.startsWith('hide_book:')) {
                const [, bookId] = data.split(':')
                try {
                    const book = await prisma.book.update({
                        where: { id: bookId },
                        data: { active: false }
                    })
                    await answerCallbackQuery(callbackId, `🚫 Livre masqué du site`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `🚫 <b>LIVRE MASQUÉ DU SITE</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `📌 Statut: <b>INACTIF</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }
            
            // Format: gen_creative:{orderId}
            else if (data && data.startsWith('gen_creative:')) {
                const [, orderId] = data.split(':')
                try {
                    const order = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { items: { include: { book: true, pack: true } } }
                    })
                    
                    if (!order || order.items.length === 0) throw new Error('Commande ou articles introuvables')
                    
                    const firstItem = order.items[0]
                    const itemId = firstItem.bookId || firstItem.packId
                    const itemType = firstItem.bookId ? 'BOOK' : 'PACK'

                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '📸 Instagram', callback_data: `pub_creative:${itemId}:${itemType}:instagram` },
                                { text: '📘 Facebook', callback_data: `pub_creative:${itemId}:${itemType}:facebook` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_creative:${itemId}:${itemType}:tiktok` },
                                { text: '✈️ Telegram', callback_data: `pub_creative:${itemId}:${itemType}:telegram` }
                            ]
                        ]
                    }

                    await answerCallbackQuery(callbackId, `📱 Choisissez la plateforme`, token)
                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, `📱 <b>Destination du Visuel</b>\n\nSur quelle plateforme souhaitez-vous publier ce visuel ?`, token, replyMarkup)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: pub_c:{id}:{type}:{platform}
            else if (data && data.startsWith('pub_c:')) {
                const [, itemId, shortType, shortPlatform] = data.split(':')
                const itemType = shortType === 'P' ? 'PACK' : 'BOOK'
                const platformMap: any = { ig: 'instagram', fb: 'facebook', tt: 'tiktok', tg: 'telegram' }
                const platform = platformMap[shortPlatform] || 'instagram'

                try {
                    let item: any = null;
                    let imageUrl = '';
                    let title = 'Riwaya';

                    if (itemId && itemId.length === 36 && itemId.includes('-')) {
                        if (itemType === 'BOOK') {
                            item = await prisma.book.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.title; }
                        } else if (itemType === 'PACK') {
                            item = await prisma.pack.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.name; }
                        }
                    } else if (itemId && itemId !== 'manual') {
                        const fs = require('fs').promises
                        const path = require('path')
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                        try {
                            const files = await fs.readdir(uploadDir)
                            const matchedFile = files.find((f: string) => f.startsWith(itemId))
                            if (matchedFile) {
                                imageUrl = `/uploads/books/${matchedFile}`
                                title = matchedFile
                            } else {
                                imageUrl = `/uploads/books/${itemId}`
                                title = itemId
                            }
                        } catch (err) {
                            imageUrl = `/uploads/books/${itemId}`
                            title = itemId
                        }
                    }

                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                    }

                    const isVideo = imageUrl.toLowerCase().endsWith('.mp4') || imageUrl.toLowerCase().endsWith('.mov') || imageUrl.toLowerCase().endsWith('.webm')
                    if (imageUrl && !isVideo && (platform === 'instagram' || platform === 'facebook' || platform === 'all' || platform === 'both')) {
                        imageUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg&q=85`
                    }

                    const customCaptionSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_custom_caption' } })
                    const customCaption = customCaptionSetting?.value
                    
                    const finalCaption = (customCaption && customCaption.length > 0) ? customCaption : (item?.description || title)

                    const payload = {
                        itemId: item?.id || 'marketing',
                        itemType,
                        title: title,
                        author: item?.author || 'Riwaya',
                        price: item?.price || 0,
                        category: item?.category || 'Promotion',
                        image: imageUrl,
                        isVideo,
                        isPack: itemType === 'PACK',
                        bookUrl: itemType === 'BOOK' && item ? `${baseUrl}/fr/books/${item.id}` : '',
                        packUrl: itemType === 'PACK' && item ? `${baseUrl}/fr/packs` : '',
                        itemUrl: item ? (itemType === 'BOOK' ? `${baseUrl}/fr/books/${item.id}` : `${baseUrl}/fr/packs`) : baseUrl,
                        caption: finalCaption,
                        format: 'story',
                        platform,
                        source: 'telegram-bot-action',
                        
                        facebook_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'facebook_access_token' } }))?.value,
                        instagram_account_id: (await prisma.siteSettings.findUnique({ where: { key: 'marketing_instagram_id' } }))?.value,
                        tiktok_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_access_token' } }))?.value,
                        tiktok_creator_id: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_creator_id' } }))?.value,
                        tiktok_app_id: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_app_id' } }))?.value,
                        tiktok_client_secret: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_client_secret' } }))?.value
                    }

                    const n8nWebhookUrl = (await prisma.siteSettings.findUnique({ where: { key: 'n8n_webhook_url' } }))?.value || process.env.N8N_WEBHOOK_URL
                    if (!n8nWebhookUrl) throw new Error('n8n non configuré')

                    await answerCallbackQuery(callbackId, `🚀 Publication ${platform} lancée...`, token)

                    fetch(n8nWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).catch(console.error)

                    if (customCaption) {
                        await prisma.siteSettings.update({ where: { key: 'telegram_custom_caption' }, data: { value: '' } })
                    }

                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, `⏳ <b>Génération en cours...</b>\n\nVotre visuel pour <b>${platform.toUpperCase()}</b> est en cours de création via n8n.`, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: prep_c:{itemId}:{itemType}
            else if (data && data.startsWith('prep_c:')) {
                const [, itemId, shortType] = data.split(':')
                try {
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '👁️ Voir l\'image', callback_data: `view_c:${itemId}:${shortType}` }
                            ],
                            [
                                { text: '📸 Instagram', callback_data: `pub_c:${itemId}:${shortType}:ig` },
                                { text: '📘 Facebook', callback_data: `pub_c:${itemId}:${shortType}:fb` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_c:${itemId}:${shortType}:tt` },
                                { text: '✈️ Telegram', callback_data: `pub_c:${itemId}:${shortType}:tg` }
                            ],
                            [
                                { text: '✏️ Légende Personnalisée', callback_data: `caption_info` }
                            ]
                        ]
                    }
                    if (message?.chat?.id && message?.message_id) {
                        await answerCallbackQuery(callbackId, `📱 Options du visuel`, token)
                        await editTelegramMessage(message.chat.id, message.message_id, `📱 <b>Options du Visuel</b>\n\nQue souhaitez-vous faire ?`, token, replyMarkup)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur: ${error.message}`, token)
                }
            }
            
            // Format: view_c:{itemId}:{shortType}
            else if (data && data.startsWith('view_c:')) {
                const [, itemId, shortType] = data.split(':')
                const itemType = shortType === 'P' ? 'PACK' : 'BOOK'
                try {
                    let item: any = null;
                    let imageUrl = '';
                    let title = 'Riwaya';

                    if (itemId && itemId.length === 36 && itemId.includes('-')) {
                        if (itemType === 'BOOK') {
                            item = await prisma.book.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.title; }
                        } else if (itemType === 'PACK') {
                            item = await prisma.pack.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.name; }
                        }
                    } else if (itemId && itemId !== 'manual') {
                        const fs = require('fs').promises
                        const path = require('path')
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                        try {
                            const files = await fs.readdir(uploadDir)
                            const matchedFile = files.find((f: string) => f.startsWith(itemId))
                            if (matchedFile) {
                                imageUrl = `/uploads/books/${matchedFile}`
                                title = matchedFile
                            } else {
                                imageUrl = `/uploads/books/${itemId}`
                                title = itemId
                            }
                        } catch (err) {
                            imageUrl = `/uploads/books/${itemId}`
                            title = itemId
                        }
                    }

                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                    }

                    await answerCallbackQuery(callbackId, `Envoi de l'image...`, token)
                    
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '📸 Instagram', callback_data: `pub_c:${itemId}:${shortType}:ig` },
                                { text: '📘 Facebook', callback_data: `pub_c:${itemId}:${shortType}:fb` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_c:${itemId}:${shortType}:tt` },
                                { text: '✈️ Telegram', callback_data: `pub_c:${itemId}:${shortType}:tg` }
                            ]
                        ]
                    }

                    const { sendTelegramPhoto } = await import('@/lib/telegram')
                    await sendTelegramPhoto(imageUrl, `👁️ Aperçu : <b>${title}</b>`, message?.chat?.id.toString(), token, replyMarkup)

                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }
            
            // Format: caption_info
            else if (data === 'caption_info') {
                await answerCallbackQuery(callbackId, `Comment ajouter une légende`, token)
                if (message?.chat?.id) {
                    await sendTelegramMessage(`✏️ <b>Pour personnaliser la légende :</b>\n\nEnvoyez simplement un message dans ce chat commençant par <code>#legende</code>.\n\nExemple :\n<code>#legende 🔥 Ne ratez pas notre promotion ! Lien en bio.</code>\n\nUne fois enregistrée, la légende sera utilisée pour votre prochaine publication.`, message.chat.id.toString(), token)
                }
            }
            
            // Format: approve_review:{reviewId}
            else if (data && data.startsWith('approve_review:')) {
                const [, reviewId] = data.split(':')
                const review = await prisma.review.update({
                    where: { id: reviewId },
                    data: { isApproved: true },
                    include: { book: { select: { title: true } } }
                })
                
                await answerCallbackQuery(callbackId, '✅ Avis approuvé !', token)
                const updatedText = `✅ <b>Avis Approuvé</b>\n\n` +
                    `👤 <b>Client:</b> ${review.fullName}\n` +
                    `📖 <b>Livre:</b> ${review.book.title}\n` +
                    `⭐ <b>Note:</b> ${review.rating}/5\n` +
                    `💬 <i>${review.comment}</i>`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: delete_review:{reviewId}
            else if (data && data.startsWith('delete_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.delete({ where: { id: reviewId } })
                
                await answerCallbackQuery(callbackId, '🗑️ Avis supprimé !', token)
                const updatedText = `🗑️ <b>Avis Supprimé</b>\n\nL'avis a été définitivement retiré.`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: auth_approve:{requestId}
            else if (data && data.startsWith('auth_approve:')) {
                const [, requestId] = data.split(':')
                const request = await prisma.adminAuthRequest.update({
                    where: { id: requestId },
                    data: { status: 'APPROVED' }
                })
                
                await answerCallbackQuery(callbackId, '✅ Connexion approuvée !', token)
                const updatedText = `✅ <b>Demande d'accès Approuvée</b>\n\n` +
                    `👤 <b>Utilisateur:</b> ${escapeHtml(request.email)}\n` +
                    `🌐 <b>IP:</b> ${request.ip}\n` +
                    `🕒 <b>Heure:</b> ${new Date().toLocaleString('fr-FR')}`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: auth_reject:{requestId}
            else if (data && data.startsWith('auth_reject:')) {
                const [, requestId] = data.split(':')
                const request = await prisma.adminAuthRequest.update({
                    where: { id: requestId },
                    data: { status: 'REJECTED' }
                })
                
                await answerCallbackQuery(callbackId, '❌ Connexion refusée !', token)
                const updatedText = `❌ <b>Demande d'accès Refusée</b>\n\n` +
                    `👤 <b>Utilisateur:</b> ${escapeHtml(request.email)}\n` +
                    `🌐 <b>IP:</b> ${request.ip}\n` +
                    `🕒 <b>Heure:</b> ${new Date().toLocaleString('fr-FR')}`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }
            
            // Format: approve_review:{reviewId}
            else if (data && data.startsWith('approve_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.update({ where: { id: reviewId }, data: { isApproved: true } })
                await answerCallbackQuery(callbackId, '✅ Avis approuvé !', token)
                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, `✅ <b>Avis approuvé avec succès.</b>`, token)
                }
            }

            // Format: delete_review:{reviewId}
            else if (data && data.startsWith('delete_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.delete({ where: { id: reviewId } })
                await answerCallbackQuery(callbackId, '🗑️ Avis supprimé !', token)
                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, `🗑️ <b>Avis supprimé.</b>`, token)
                }
            }
            
            // Format: stats:{period}
            else if (data && data.startsWith('stats:') && !['stats:recent_orders', 'stats:compare_months', 'stats:all_time'].includes(data)) {
                const [, period] = data.split(':')
                const now = new Date()
                let start = new Date(now.setHours(0, 0, 0, 0))
                let end = new Date(now.setHours(23, 59, 59, 999))
                let label = "Aujourd'hui"

                if (period === 'yesterday') {
                    start = new Date(now.setDate(now.getDate() - 1))
                    start.setHours(0,0,0,0)
                    end = new Date(start)
                    end.setHours(23,59,59,999)
                    label = "Hier"
                } else if (period === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    label = "Ce Mois"
                } else if (period === '30days') {
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    thirtyDaysAgo.setHours(0,0,0,0)
                    start = thirtyDaysAgo
                    label = "30 Derniers Jours"
                } else if (period === '3months') {
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                    threeMonthsAgo.setHours(0,0,0,0)
                    start = threeMonthsAgo
                    label = "3 Derniers Mois"
                } else if (period === '1year') {
                    const oneYearAgo = new Date()
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
                    oneYearAgo.setHours(0,0,0,0)
                    start = oneYearAgo
                    label = "1 An"
                }

                if (period === 'top5' || period === 'top10') {
                    const limit = period === 'top10' ? 10 : 5;
                    const topBooks = await prisma.orderItem.groupBy({
                        by: ['bookId'],
                        where: { bookId: { not: null }, order: { status: { not: 'CANCELLED' } } },
                        _count: { bookId: true },
                        orderBy: { _count: { bookId: 'desc' } },
                        take: limit
                    })

                    const books = await Promise.all(topBooks.map(async (item) => {
                        const book = await prisma.book.findUnique({ where: { id: item.bookId! }, select: { title: true } })
                        return `🏆 <b>${book?.title || 'Livre inconnu'}</b> : ${item._count.bookId} ventes`
                    }))

                    const title = limit === 10 ? "TOP 10 DES VENTES" : "TOP 5 DES VENTES";
                    const text = `🥇 <b>${title}</b>\n\n${books.join('\n')}`
                    await answerCallbackQuery(callbackId, `🏆 Top ${limit} généré`, token)
                    await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                } else {
                    // Récupérer les paramètres pour savoir quoi afficher
                    const showVisitors = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_visitors' } }))?.value === 'true'
                    const showRegistrations = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_registrations' } }))?.value === 'true'
                    const showViews = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_top_views' } }))?.value === 'true'

                    const [count, revenue, visitors, registrations] = await Promise.all([
                        prisma.order.count({ where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } } }),
                        prisma.order.aggregate({
                            where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
                            _sum: { total: true }
                        }),
                        showVisitors ? prisma.pageView.groupBy({
                            by: ['sessionId'],
                            where: { createdAt: { gte: start, lte: end } }
                        }).then(res => res.length) : Promise.resolve(0),
                        showRegistrations ? prisma.user.count({
                            where: { createdAt: { gte: start, lte: end }, role: 'USER' }
                        }) : Promise.resolve(0)
                    ])

                    let jumiaStats = { count: 0, revenue: 0, pending: 0, shipped: 0, delivered: 0, canceled: 0 }
                    try {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (jumia) {
                            // Jumia uses ISO format.
                            const createdAfter = start.toISOString()
                            const createdBefore = end.toISOString()

                            // On demande jusqu'à 500 commandes pour couvrir un mois entier
                            const response = await jumia.getOrders(500, undefined, undefined, createdAfter, createdBefore)
                            const jumiaOrders = response?.orders || response?.data?.orders || []
                            
                            for (const o of jumiaOrders) {
                                const status = (o.status || o.Status || '').toLowerCase()
                                
                                jumiaStats.count++
                                
                                const isCanceled = status === 'canceled' || status === 'failed' || status === 'returned';
                                if (!isCanceled) {
                                    jumiaStats.revenue += Number(o.totalAmountLocal?.value || o.Price || o.GrandTotal || 0)
                                }
                                
                                if (status === 'pending') jumiaStats.pending++
                                else if (status === 'shipped' || status === 'ready-to-ship') jumiaStats.shipped++
                                else if (status === 'delivered') jumiaStats.delivered++
                                else if (isCanceled) jumiaStats.canceled++
                            }
                        }
                    } catch (e) {
                        console.error('Erreur stats Jumia:', e)
                    }

                    let text = `📊 <b>RAPPORT : ${label.toUpperCase()}</b>\n\n` +
                               `📦 Commandes Site : <b>${count}</b>\n` +
                               `💰 CA Site : <b>${(revenue._sum.total || 0).toFixed(2)} MAD</b>`
                    
                    text += `\n\n🟠 <b>JUMIA :</b>\n` +
                            `📦 Commandes Total : <b>${jumiaStats.count}</b>\n` +
                            `💰 CA Total : <b>${jumiaStats.revenue.toFixed(2)} MAD</b>\n` +
                            `⏳ En attente : ${jumiaStats.pending}\n` +
                            `🚚 En expédition : ${jumiaStats.shipped}\n` +
                            `✅ Livrées : ${jumiaStats.delivered}\n` +
                            `❌ Annulées/Retours : ${jumiaStats.canceled}`
                    
                    if (showVisitors) text += `\n👥 Visiteurs Uniques : <b>${visitors}</b>`
                    if (showRegistrations) text += `\n👤 Inscriptions : <b>${registrations}</b>`

                    if (showViews) {
                        const topViews = await prisma.pageView.groupBy({
                            by: ['url'],
                            where: { 
                                createdAt: { gte: start, lte: end },
                                url: { contains: '/books/' }
                            },
                            _count: { url: true },
                            orderBy: { _count: { url: 'desc' } },
                            take: 3
                        })
                        
                        if (topViews.length > 0) {
                            text += `\n\n👀 <b>LIVRES LES PLUS CONSULTÉS :</b>`
                            for (const view of topViews) {
                                // Extraire le titre du livre de l'URL si possible ou juste l'URL
                                const bookId = view.url.split('/').pop()?.split('?')[0]
                                if (bookId && bookId.length > 20) {
                                    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } })
                                    text += `\n• ${escapeHtml(book?.title || 'Livre')} (<b>${view._count.url}</b> vues)`
                                }
                            }
                        }
                    }
                    
                    await answerCallbackQuery(callbackId, `Stats ${label} envoyées`, token)
                    await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                }
            }

            // Format: stats:recent_orders
            else if (data === 'stats:recent_orders') {
                const orders = await prisma.order.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, fullName: true, city: true, total: true, status: true, createdAt: true }
                })

                const statusIcons: Record<string, string> = {
                    PENDING: '⏳', CONFIRMED: '✅', SHIPPED: '🚚',
                    DELIVERED: '📬', CANCELLED: '❌', RETURNED: '🔄'
                }

                const list = orders.map(o => {
                    const icon = statusIcons[o.status] || '📦'
                    const shortId = o.id.slice(0, 6).toUpperCase()
                    const date = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                    return `${icon} <b>#${shortId}</b> — ${escapeHtml(o.fullName)} — <b>${o.total.toFixed(0)} MAD</b> — ${date}`
                }).join('\n')

                const text = `🛒 <b>5 DERNIÈRES COMMANDES</b>\n\n${list}`
                await answerCallbackQuery(callbackId, '🛒 Dernières commandes', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }

            // Format: stats:compare_months
            else if (data === 'stats:compare_months') {
                const now = new Date()
                // Mois actuel
                const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1)
                const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                // Mois précédent
                const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

                const [current, prev] = await Promise.all([
                    prisma.order.aggregate({
                        where: { createdAt: { gte: startCurrent, lte: endCurrent }, status: { not: 'CANCELLED' } },
                        _sum: { total: true },
                        _count: true
                    }),
                    prisma.order.aggregate({
                        where: { createdAt: { gte: startPrev, lte: endPrev }, status: { not: 'CANCELLED' } },
                        _sum: { total: true },
                        _count: true
                    })
                ])

                const caMois = current._sum.total || 0
                const caPrev = prev._sum.total || 0
                const diff = caMois - caPrev
                const pct = caPrev > 0 ? ((diff / caPrev) * 100).toFixed(1) : 'N/A'
                const trend = diff >= 0 ? `📈 +${pct}%` : `📉 ${pct}%`

                const moisActuel = startCurrent.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                const moisPrec = startPrev.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

                const text = `📊 <b>CA MENSUEL COMPARÉ</b>\n\n` +
                    `📅 <b>${moisActuel} :</b>\n` +
                    `   💰 CA : <b>${caMois.toFixed(2)} MAD</b>\n` +
                    `   📦 Commandes : <b>${current._count}</b>\n\n` +
                    `📅 <b>${moisPrec} :</b>\n` +
                    `   💰 CA : <b>${caPrev.toFixed(2)} MAD</b>\n` +
                    `   📦 Commandes : <b>${prev._count}</b>\n\n` +
                    `${trend} vs mois précédent`

                await answerCallbackQuery(callbackId, '📊 Comparaison mensuelle', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }
            
            // Format: stats:all_time
            else if (data === 'stats:all_time') {
                const [total, revenue, firstOrder, byStatus] = await Promise.all([
                    prisma.order.count(),
                    prisma.order.aggregate({
                        where: { status: { not: 'CANCELLED' } },
                        _sum: { total: true }
                    }),
                    prisma.order.findFirst({
                        orderBy: { createdAt: 'asc' },
                        select: { createdAt: true }
                    }),
                    prisma.order.groupBy({
                        by: ['status'],
                        _count: { status: true }
                    })
                ])

                const statusIcons: Record<string, string> = {
                    PENDING: '⏳', CONFIRMED: '✅', SHIPPED: '🚚',
                    DELIVERED: '📬', CANCELLED: '❌', RETURNED: '🔄'
                }

                const statusLines = byStatus
                    .sort((a, b) => b._count.status - a._count.status)
                    .map(s => `${statusIcons[s.status] || '📦'} ${STATUS_LABELS[s.status] || s.status} : <b>${s._count.status}</b>`)
                    .join('\n')

                const since = firstOrder?.createdAt
                    ? new Date(firstOrder.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Inconnue'

                const text = `🗂️ <b>STATISTIQUES GLOBALES</b>\n\n` +
                    `📅 <b>Depuis :</b> ${since}\n` +
                    `📦 <b>Total commandes :</b> ${total}\n` +
                    `💰 <b>CA total :</b> <b>${(revenue._sum.total || 0).toFixed(2)} MAD</b>\n\n` +
                    `📊 <b>Par statut :</b>\n${statusLines}`

                await answerCallbackQuery(callbackId, '🗂️ Stats globales chargées', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }

            // Sécurité : toujours répondre pour arrêter le chargement du bouton
            else {
                await answerCallbackQuery(callbackId, 'Action reçue', token)
            }
        }

        // Traitement des messages textes (Commandes)
        if (body.message && body.message.text) {
            const rawText = body.message.text.trim()
            const text = rawText.toUpperCase()
            const chatId = body.message.chat.id
            console.log(`[TELEGRAM MESSAGE] Received from ${chatId}: ${text}`)

            if (text.startsWith('/CMD') || text === 'CMD' || text.startsWith('/HELP') || text === 'HELP') {
                const helpText = `📘 <b>Riwaya Bot — Commandes disponibles</b>\n\n` +
                    `<b>📊 Statistiques & Rapports</b>\n` +
                    `/bilan — Stats site web (aujourd'hui, mois, etc.)\n` +
                    `/rapport — Rapport quotidien immédiat\n` +
                    `/stockalerte — Vérifier le stock critique\n\n` +
                    `<b>🟠 Jumia</b>\n` +
                    `/jumia — Menu complet Jumia (pending, bilan, retours, comparatifs, graphiques)\n\n` +
                    `<b>📦 Marketing & Réseaux Sociaux</b>\n` +
                    `/generer — Liste des créatives, prévisualisation et publication (IG, FB, TT, TG)\n` +
                    `#legende [votre texte] — Définir une légende personnalisée pour la prochaine publication Facebook/Instagram\n\n` +
                    `<b>🔍 Recherche</b>\n` +
                    `/stock [titre] — Vérifier le stock d'un livre\n` +
                    `/search [nom/téléphone] — Rechercher un client\n\n` +
                    `<b>⭐ Gestion Rapide</b>\n` +
                    `/avis — Modérer les nouveaux avis clients\n` +
                    `/promo [titre] [prix] — Appliquer un nouveau prix\n` +
                    `/expedier [ID] — Marquer une commande en expédiée\n` +
                    `/topclients — Les 5 meilleurs acheteurs\n` +
                    `/maintenance [on/off] — Bloquer/débloquer l'accès au site\n\n` +
                    `<b>📝 Blog</b>\n` +
                    `/blogstats — Voir le Top 5 des articles\n` +
                    `/blogpublier [mot clé] — Publier un article\n` +
                    `/blogmasquer [mot clé] — Masquer un article\n` +
                    `/bloggenerer [sujet] — Générer un article via IA\n` +
                    `/blogpartager [mot clé] — Partager sur les réseaux sociaux\n\n` +
                    `<b>⚙️ Automatisations (Cron)</b>\n` +
                    `Rapport Jumia Annuel (Graphique + PDF) → <code>/api/cron/telegram-yearly-chart</code>\n` +
                    `Notifications commandes Jumia (Photo + Boutons) → <code>/api/cron/jumia-new-orders</code>\n` +
                    `Rapport quotidien → <code>/api/cron/daily-report</code>\n` +
                    `Alerte stock → <code>/api/cron/stock-alert</code>\n` +
                    `Alerte pending → <code>/api/cron/pending-alert</code>\n` +
                    `Rapport Jumia hebdo → <code>/api/cron/weekly-jumia-report</code>\n` +
                    `Alerte retours → <code>/api/cron/jumia-returns-alert</code>\n` +
                    `Sync commandes Jumia → <code>/api/cron/jumia</code>\n\n` +
                    `<b>📥 Export</b>\n` +
                    `CSV commandes Jumia → <code>/api/admin/jumia/export</code>\n\n` +
                    `<i>💡 Toutes les commandes sont insensibles à la casse</i>`
                await sendTelegramMessage(helpText, chatId.toString(), token)
            }
            else if (text.startsWith('/BILAN') || text === 'BILAN' || text.startsWith('/STATS')) {
                const replyText = `📊 <b>Centre de Rapports Riwaya</b>\n\nQue souhaitez-vous consulter ?`
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: "📅 Aujourd'hui", callback_data: 'stats:today' },
                            { text: '🗓️ Hier', callback_data: 'stats:yesterday' }
                        ],
                        [
                            { text: '📅 Ce Mois', callback_data: 'stats:month' },
                            { text: '📅 30 Derniers Jours', callback_data: 'stats:30days' }
                        ],
                        [
                            { text: '📅 3 Mois', callback_data: 'stats:3months' },
                            { text: '📅 1 An', callback_data: 'stats:1year' }
                        ],
                        [
                            { text: '🏆 Top 5 Livres', callback_data: 'stats:top5' },
                            { text: '🏆 Top 10 Livres', callback_data: 'stats:top10' }
                        ],
                        [
                            { text: '🛒 Dernières Commandes', callback_data: 'stats:recent_orders' },
                            { text: '📊 CA Mensuel Comparé', callback_data: 'stats:compare_months' }
                        ],
                        [
                            { text: '🗂️ Depuis le Début', callback_data: 'stats:all_time' }
                        ]
                    ]
                }
                await sendTelegramMessage(replyText, chatId.toString(), token, replyMarkup)
            }
            else if (text && text.toLowerCase().startsWith('#legende')) {
                const customCaption = text.substring(8).trim();
                if (customCaption.length === 0) {
                    await sendTelegramMessage(`⚠️ La légende est vide. Veuillez taper votre texte après #legende.`, chatId.toString(), token)
                } else {
                    await prisma.siteSettings.upsert({
                        where: { key: 'telegram_custom_caption' },
                        update: { value: customCaption },
                        create: { key: 'telegram_custom_caption', value: customCaption }
                    })
                    await sendTelegramMessage(`✅ <b>Légende personnalisée enregistrée :</b>\n\n<i>${customCaption}</i>\n\nVous pouvez maintenant cliquer sur le bouton d'un réseau social (Instagram, Facebook...) pour publier avec cette légende.`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/GENERER') || text === 'GENERER' || text.startsWith('/MARKETING')) {
                console.log(`[TELEGRAM] Command /GENERER received from chat ${chatId}`)
                
                // Envoyer un accusé de réception immédiat
                await sendTelegramMessage(`🔍 Recherche de créatives sur le serveur...`, chatId.toString(), token)

                try {
                    let creatives: any[] = []
                    
                    // 1. Scanner le disque (Priorité car l'utilisateur dit qu'elles sont là)
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                    console.log(`[TELEGRAM] Scanning directory: ${uploadDir}`)
                    
                    try {
                        const files = await fs.readdir(uploadDir)
                        console.log(`[TELEGRAM] Found ${files.length} total files in directory`)
                        
                        const filteredFiles = files.filter(f => 
                            f.toLowerCase().startsWith('creative_') || 
                            f.toLowerCase().startsWith('pack_') || 
                            f.toLowerCase().startsWith('desc_') || 
                            f.toLowerCase().includes('pack')
                        );
                        
                        // Mélanger aléatoirement pour ne pas toujours afficher les mêmes
                        const marketingFiles = filteredFiles.sort(() => 0.5 - Math.random()).slice(0, 10)

                        console.log(`[TELEGRAM] Filtered ${marketingFiles.length} marketing files:`, marketingFiles)

                        if (marketingFiles.length > 0) {
                            creatives = marketingFiles.map(file => ({
                                name: file,
                                type: (file.toLowerCase().includes('pack')) ? 'PACK' : 'BOOK'
                            }))
                        }
                    } catch (fsErr: any) {
                        console.error('[TELEGRAM] Disk scan error:', fsErr)
                    }

                    console.log(`[TELEGRAM] Final creatives list size: ${creatives.length}`)

                    // 2. Tenter la DB si le disque n'a rien donné
                    if (creatives.length === 0) {
                        const dbAssets = await prisma.marketingAsset.findMany({
                            take: 50, // Prendre les 50 derniers et mélanger
                            orderBy: { createdAt: 'desc' }
                        })
                        const randomAssets = dbAssets.sort(() => 0.5 - Math.random()).slice(0, 10);
                        
                        creatives = randomAssets.map(a => ({
                            name: a.name,
                            type: a.type,
                            bookId: a.bookId,
                            packId: a.packId
                        }))
                    }

                    if (creatives.length === 0) {
                        await sendTelegramMessage(`⚠️ Aucune créative trouvée dans <code>/public/uploads/books/</code>.\n\nFichiers attendus : commençant par <code>creative_</code> ou <code>pack_</code>.`, chatId.toString(), token)
                        return NextResponse.json({ ok: true })
                    }

                    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

                    // Envoyer un album des 3 dernières images pour l'aperçu
                    if (creatives.length > 0) {
                        const album = creatives.slice(0, 3).map(c => ({
                            type: 'photo' as const,
                            media: `${siteUrl}/uploads/books/${c.name}`,
                            caption: `📸 Aperçu : ${c.name}`
                        }))
                        await sendTelegramMediaGroup(album, chatId.toString(), token)
                    }

                    const buttons = creatives.map(c => {
                        const label = c.name.length > 30 ? c.name.substring(0, 27) + '...' : c.name
                        const typeLabel = c.type === 'PACK' ? '📦' : '✨'
                        // Use only the first 30 chars of the name or ID to avoid exceeding 64 bytes
                        const rawId = (c as any).bookId || (c as any).packId || c.name
                        const itemId = String(rawId).substring(0, 30)
                        const shortType = c.type === 'PACK' ? 'P' : 'B'
                        return [{ 
                            text: `${typeLabel} ${label}`, 
                            callback_data: `prep_c:${itemId}:${shortType}`
                        }]
                    })

                    const replyMarkup = {
                        inline_keyboard: [
                            ...buttons,
                            [{ text: '🔍 Voir tout le site', url: `${siteUrl}/fr/admin/marketing` }]
                        ]
                    }

                    console.log(`[TELEGRAM] Sending final menu to ${chatId}`)
                    const result = await sendTelegramMessage(`🚀 <b>Marketing Riwaya</b>\n\nChoisissez une créative ci-dessus pour la publier :`, chatId.toString(), token, replyMarkup)
                    console.log(`[TELEGRAM] Final menu send result:`, result ? 'SUCCESS' : 'FAILED')
                } catch (error: any) {
                    console.error('[TELEGRAM ERROR] /GENERER failed:', error)
                    await sendTelegramMessage(`❌ Erreur lors du scan : ${error.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/STOCK')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/stock [nom du livre]</code>`, chatId.toString(), token)
                } else {
                    const books = await prisma.book.findMany({
                        where: { title: { contains: query } },
                        take: 5,
                        select: { title: true, stock: true, price: true }
                    })
                    if (books.length === 0) {
                        await sendTelegramMessage(`❌ Aucun livre trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const list = books.map(b => `📖 <b>${b.title}</b>\n📦 Stock: <b>${b.stock}</b> | 💰 ${b.price} MAD`).join('\n\n')
                        await sendTelegramMessage(`🔍 <b>Résultats Stock</b> :\n\n${list}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/STOCKALERT')) {
                const books = await prisma.book.findMany({
                    where: { stock: { lt: 3 } },
                    orderBy: { stock: 'asc' },
                    select: { id: true, title: true, stock: true }
                })
                if (books.length === 0) {
                    await sendTelegramMessage(`✅ Aucun produit avec un stock < 3.`, chatId.toString(), token)
                } else {
                    const list = books.map(b => `🚨 <b>${b.title}</b> : ${b.stock}`).join('\n')
                    const keyboard = books.slice(0, 5).map((b) => {
                        return [{ text: `🔄 Maj: ${b.title.substring(0, 25)}`, callback_data: `upd_stock:${b.id}` }]
                    })
                    const textMessage = `📊 <b>Alerte Stock Critique (< 3)</b> :\n\n${list}`
                    await sendTelegramMessage(textMessage, chatId.toString(), token, { inline_keyboard: keyboard })
                }
            }
            else if (text.startsWith('/SETSTOCK')) {
                const parts = rawText.split(' ')
                if (parts.length < 3) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/setstock [id_livre] [quantité]</code>`, chatId.toString(), token)
                } else {
                    const bookId = parts[1]
                    const qty = parseInt(parts[2], 10)
                    if (isNaN(qty)) {
                        await sendTelegramMessage(`❌ La quantité doit être un nombre valide.`, chatId.toString(), token)
                    } else {
                        try {
                            const updated = await prisma.book.update({
                                where: { id: bookId },
                                data: { stock: qty }
                            })
                            await sendTelegramMessage(`✅ Stock mis à jour :\n📖 <b>${updated.title}</b>\n📦 Nouveau stock: <b>${updated.stock}</b>`, chatId.toString(), token)
                        } catch (err) {
                            await sendTelegramMessage(`❌ Erreur ou livre introuvable.`, chatId.toString(), token)
                        }
                    }
                }
            }
            else if (text.startsWith('/SEARCH')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/search [nom ou téléphone]</code>`, chatId.toString(), token)
                } else {
                    const customers = await prisma.order.findMany({
                        where: {
                            OR: [
                                { fullName: { contains: query } },
                                { phone: { contains: query } }
                            ]
                        },
                        take: 3,
                        orderBy: { createdAt: 'desc' },
                        select: { fullName: true, phone: true, city: true, address: true }
                    })
                    if (customers.length === 0) {
                        await sendTelegramMessage(`❌ Aucun client trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const list = customers.map(c => `👤 <b>${c.fullName}</b>\n📞 ${c.phone}\n📍 ${c.city}, ${c.address}`).join('\n\n')
                        await sendTelegramMessage(`🔍 <b>Résultats Clients</b> :\n\n${list}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/JUMIA')) {
                // Menu rapide Jumia
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '📦 Commandes Jumia Pending', callback_data: 'jumia:pending_orders' }
                        ],
                        [
                            { text: '📊 Bilan Jumia du mois', callback_data: 'jumia:monthly_stats' }
                        ],
                        [
                            { text: "📅 Bilan Jumia d'année", callback_data: 'jumia:yearly_stats' }
                        ],
                        [
                            { text: '📈 Graphique Annuel (CA)', callback_data: 'jumia:yearly_chart' }
                        ],
                        [
                            { text: '📊 Jumia vs Boutique', callback_data: 'jumia:jumia_vs_store_chart' }
                        ],
                        [
                            { text: '🔄 Alerte Retours/Annulations', callback_data: 'jumia:returns_check' }
                        ]
                    ]
                }
                await sendTelegramMessage(`🟠 <b>Menu Jumia</b>\n\nChoisissez une action :`, chatId.toString(), token, replyMarkup)
            }
            else if (text.startsWith('/RAPPORT') || text === 'RAPPORT') {
                // Déclencher rapport quotidien maintenant
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/daily-report${process.env.CRON_SECRET ? `?token=${process.env.CRON_SECRET}` : ''}`)
                    const data = await res.json()
                    if (data.success) {
                        await sendTelegramMessage(`✅ Rapport envoyé !`, chatId.toString(), token)
                    } else {
                        await sendTelegramMessage(`❌ Erreur rapport: ${data.error}`, chatId.toString(), token)
                    }
                } catch (e: any) {
                    await sendTelegramMessage(`❌ Erreur: ${e.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/STOCKALERTE') || text === 'STOCKALERTE') {
                // Vérifier stock critique maintenant
                const threshold = 5
                const criticalBooks = await prisma.book.findMany({
                    where: { stock: { lte: threshold }, active: true },
                    select: { title: true, stock: true },
                    orderBy: { stock: 'asc' },
                    take: 15
                })
                if (criticalBooks.length === 0) {
                    await sendTelegramMessage(`✅ <b>Aucun stock critique</b> (seuil: ${threshold})`, chatId.toString(), token)
                } else {
                    const lines = criticalBooks.map(b => `📖 ${b.title} → <b>${b.stock}</b>${b.stock === 0 ? ' ⛔' : ''}`).join('\n')
                    await sendTelegramMessage(`⚠️ <b>${criticalBooks.length} livres stock critique</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/AVIS') || text === 'AVIS') {
                const reviews = await prisma.review.findMany({
                    where: { isApproved: false },
                    take: 3,
                    include: { book: { select: { title: true } } },
                    orderBy: { createdAt: 'desc' }
                })
                if (reviews.length === 0) {
                    await sendTelegramMessage(`✅ Aucun nouvel avis à valider.`, chatId.toString(), token)
                } else {
                    for (const r of reviews) {
                        const { escapeHtml } = await import('@/lib/telegram')
                        const msg = `💬 <b>Nouvel Avis en attente</b>\n\n👤 ${escapeHtml(r.fullName)}\n📖 ${escapeHtml(r.book?.title || 'Livre inconnu')}\n⭐ ${r.rating}/5\n📝 <i>${escapeHtml(r.comment)}</i>`
                        const markup = {
                            inline_keyboard: [
                                [
                                    { text: '✅ Approuver', callback_data: `approve_review:${r.id}` },
                                    { text: '🗑️ Supprimer', callback_data: `delete_review:${r.id}` }
                                ]
                            ]
                        }
                        await sendTelegramMessage(msg, chatId.toString(), token, markup)
                    }
                }
            }
            else if (text.startsWith('/PROMO')) {
                const parts = rawText.split(' ').slice(1)
                const price = parseFloat(parts.pop() || '0')
                const query = parts.join(' ')
                
                if (!query || !price) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/promo [titre du livre] [nouveau_prix]</code>`, chatId.toString(), token)
                } else {
                    const books = await prisma.book.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (books.length === 0) {
                        await sendTelegramMessage(`❌ Aucun livre trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const book = books[0]
                        await prisma.book.update({ where: { id: book.id }, data: { price } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`✅ <b>Promo Appliquée !</b>\n\n📖 ${escapeHtml(book.title)}\n💰 Nouveau prix : <b>${price} MAD</b>`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/EXPEDIER')) {
                const query = rawText.split(' ')[1]
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/expedier [id_commande]</code>`, chatId.toString(), token)
                } else {
                    try {
                        const order = await prisma.order.update({
                            where: { id: query },
                            data: { 
                                status: 'SHIPPED',
                                statusHistory: {
                                    create: {
                                        status: 'SHIPPED',
                                        comment: 'Expédiée via Telegram Bot',
                                        createdBy: 'TELEGRAM'
                                    }
                                }
                            }
                        })
                        await sendTelegramMessage(`✅ Commande <b>#${order.id.slice(0,6).toUpperCase()}</b> marquée comme EXPÉDIÉE 🚚`, chatId.toString(), token)
                    } catch (e) {
                        await sendTelegramMessage(`❌ Erreur : Commande introuvable.`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/TOPCLIENTS')) {
                const topUsers = await prisma.order.groupBy({
                    by: ['phone', 'fullName'],
                    where: { status: 'DELIVERED' },
                    _count: { id: true },
                    _sum: { total: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                })
                if (topUsers.length === 0) {
                    await sendTelegramMessage(`❌ Pas assez de données pour afficher le TOP.`, chatId.toString(), token)
                } else {
                    const { escapeHtml } = await import('@/lib/telegram')
                    const lines = topUsers.map((u, i) => `${i+1}. <b>${escapeHtml(u.fullName)}</b> (${u.phone})\n📦 ${u._count.id} cmd | 💰 ${(u._sum.total || 0).toFixed(0)} MAD`).join('\n\n')
                    await sendTelegramMessage(`🏆 <b>TOP 5 CLIENTS (Livrées)</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/MAINTENANCE')) {
                const arg = rawText.split(' ')[1]?.toLowerCase()
                if (arg === 'on' || arg === 'off') {
                    const isActive = arg === 'on' ? 'true' : 'false'
                    await prisma.siteSettings.upsert({
                        where: { key: 'maintenance_mode' },
                        update: { value: isActive },
                        create: { key: 'maintenance_mode', value: isActive }
                    })
                    await sendTelegramMessage(`🛠️ Mode Maintenance : <b>${arg.toUpperCase()}</b>`, chatId.toString(), token)
                } else {
                    await sendTelegramMessage(`💡 Utilisation : <code>/maintenance [on/off]</code>`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/BLOGSTATS') || text === 'BLOGSTATS') {
                const topPosts = await prisma.post.findMany({
                    where: { published: true },
                    orderBy: { viewCount: 'desc' },
                    take: 5,
                    select: { title: true, viewCount: true }
                })
                if (topPosts.length === 0) {
                    await sendTelegramMessage(`❌ Aucun article publié trouvé.`, chatId.toString(), token)
                } else {
                    const { escapeHtml } = await import('@/lib/telegram')
                    const lines = topPosts.map((p, i) => `${i+1}. <b>${escapeHtml(p.title)}</b>\n👁️ ${p.viewCount} vues`).join('\n\n')
                    await sendTelegramMessage(`🏆 <b>TOP 5 ARTICLES (Vues)</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/BLOGPUBLIER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogpublier [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = await prisma.post.update({ where: { id: posts[0].id }, data: { published: true, publishedAt: new Date() } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`✅ <b>Article publié !</b>\n\n📝 ${escapeHtml(post.title)}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGMASQUER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogmasquer [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = await prisma.post.update({ where: { id: posts[0].id }, data: { published: false } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`🚫 <b>Article repassé en brouillon !</b>\n\n📝 ${escapeHtml(post.title)}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGGENERER')) {
                const topic = rawText.split(' ').slice(1).join(' ')
                if (!topic) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/bloggenerer [Sujet de l'article]</code>`, chatId.toString(), token)
                } else {
                    await sendTelegramMessage(`⏳ Génération en cours pour le sujet : "${topic}"... Cela peut prendre une minute.`, chatId.toString(), token)
                    try {
                        const { generateText } = await import('@/lib/gemini')
                        const prompt = `Rédige un article de blog complet, optimisé pour le SEO (en français), d'environ 500 mots sur le sujet suivant : ${topic}. Retourne le titre de l'article sur la première ligne, suivi d'un saut de ligne, puis le contenu formaté en HTML propre.`
                        const generated = await generateText(prompt)
                        if (!generated) throw new Error('Generation failed')
                        
                        const parts = generated.split('\n')
                        let title = parts[0].replace(/<[^>]*>?/gm, '').trim()
                        const content = parts.slice(1).join('\n').trim()
                        
                        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
                        
                        const post = await prisma.post.create({
                            data: {
                                title: title || topic,
                                slug: (title || topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100) + '-' + Date.now().toString().slice(-4),
                                content: content || '<p>Contenu généré vide</p>',
                                excerpt: content.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...',
                                published: false,
                                authorId: adminUser?.id || '',
                                authorName: adminUser?.fullName || 'Admin'
                            }
                        })
                        
                        await sendTelegramMessage(`✅ <b>Article généré avec succès !</b>\n\nTitre : ${title}\nStatut : <b>Brouillon</b>\n\nVous pouvez le lire et l'éditer depuis l'administration.`, chatId.toString(), token)
                    } catch (e: any) {
                        await sendTelegramMessage(`❌ Erreur lors de la génération : ${e.message}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGPARTAGER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogpartager [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = posts[0]
                        const n8nWebhookUrl = (await prisma.siteSettings.findUnique({ where: { key: 'n8n_webhook_url' } }))?.value || process.env.N8N_WEBHOOK_URL
                        if (!n8nWebhookUrl) {
                            await sendTelegramMessage(`❌ n8n webhook non configuré.`, chatId.toString(), token)
                        } else {
                            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                            const postUrl = `${baseUrl}/fr/blog/${post.slug}`
                            const imageUrl = post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${baseUrl}${post.coverImage.startsWith('/') ? '' : '/'}${post.coverImage}`) : `${baseUrl}/images/default-blog.jpg`
                            
                            const payload = {
                                itemId: post.id,
                                itemType: 'BLOG',
                                title: post.title,
                                caption: `Nouveau sur le blog ! 📚\n\n${post.title}\n\n👉 Lisez l'article complet ici : ${postUrl}`,
                                image: imageUrl,
                                isVideo: false,
                                isPack: false,
                                format: 'feed',
                                platform: 'all',
                                source: 'telegram-bot-action',
                                facebook_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'facebook_access_token' } }))?.value,
                                instagram_account_id: (await prisma.siteSettings.findUnique({ where: { key: 'marketing_instagram_id' } }))?.value
                            }
                            fetch(n8nWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(console.error)
                            
                            const { escapeHtml } = await import('@/lib/telegram')
                            await sendTelegramMessage(`🚀 Partage de l'article <b>${escapeHtml(post.title)}</b> lancé vers vos réseaux sociaux !`, chatId.toString(), token)
                        }
                    }
                }
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[TELEGRAM WEBHOOK ERROR]:', error)
        if (currentCallbackId && currentToken) {
            try { await answerCallbackQuery(currentCallbackId, '❌ Erreur interne serveur', currentToken) } catch {}
        }
        return NextResponse.json({ ok: true })
    }
}
