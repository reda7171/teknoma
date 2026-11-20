"use server"

import { JumiaAPI } from '@/lib/jumia-api'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export async function getPendingJumiaOrdersCount() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return 0
        // Fetch only pending orders (Jumia API status parameter is typically 'PENDING')
        const response = await jumia.getOrders(100, undefined, 'PENDING')
        const orders = response?.orders || response?.data?.orders || []

        // Count strictly pending
        return orders.filter((o: any) => {
            const status = (o.status || o.Status || '').toLowerCase()
            return status === 'pending'
        }).length
    } catch (e) {
        console.error('getPendingJumiaOrdersCount error:', e)
        return 0
    }
}

export async function syncAllJumiaStock() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }

        // 1. Fetch ALL Jumia products
        let allJumiaProducts: any[] = []
        let token = undefined
        for (let i = 0; i < 50; i++) { // Max 50 pages just in case
            const res = await jumia.getProducts({ size: 100, token })
            const products = res?.products || res?.data?.products || []
            allJumiaProducts = allJumiaProducts.concat(products)

            token = res?.nextToken || res?.data?.nextToken
            if (!token) break
        }

        if (allJumiaProducts.length === 0) {
            return { error: "Aucun produit trouvé sur Jumia" }
        }

        // 2. Fetch all Tekno Store Books and Packs
        const books = await prisma.book.findMany({ select: { id: true, title: true, stock: true } })

        // On récupère aussi les packs si jamais il y a des packs sur Jumia, bien qu'ils n'aient pas de stock propre direct (ils pourraient avoir isFreeDelivery ou autre)
        // Mais pour l'instant concentrons-nous sur les livres, ou si vous gérez le stock des packs :
        const packs = await prisma.pack.findMany({ select: { id: true, name: true } })

        // 3. Match and prepare payload
        const updates: any[] = []

        for (const p of allJumiaProducts) {
            const sku = p.sellerSku || (p.variations && p.variations[0]?.sellerSku)
            if (!sku || !p.name) continue

            const jumiaName = p.name.toLowerCase().trim()

            // Cherche un livre qui a le même nom
            let matchedBook = books.find(b => b.title.toLowerCase().trim() === jumiaName)

            if (matchedBook) {
                updates.push({
                    sellerSku: sku, // L'API Jumia a toujours besoin du sku pour la mise à jour
                    id: p.id,
                    stock: matchedBook.stock
                })
            }
        }

        if (updates.length === 0) {
            return { error: "Aucun produit Jumia n'a pu être associé à un livre Tekno Store (vérifiez que le nom du produit Jumia correspond exactement au titre du livre sur Tekno Store)." }
        }

        // 4. Send updates to Jumia (chunk by 50)
        const chunkSize = 50
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize)
            await jumia.updateProductsStock(chunk)
        }

        return { success: true, count: updates.length }
    } catch (e: any) {
        console.error("Error syncing Jumia stock:", e)
        return { error: e.message }
    }
}

const jumiaItemsCache = new Map<string, any[]>()

async function enrichJumiaOrdersWithItems(jumia: any, rawOrders: any[]) {
    return Promise.all(
        rawOrders.map(async (order: any) => {
            const internalId = String(order.id || order.number || order.OrderId || order.OrderNumber || '')
            if (!internalId) return { ...order, items: [] }
            if (jumiaItemsCache.has(internalId)) {
                return { ...order, items: jumiaItemsCache.get(internalId) }
            }
            try {
                const itemsRes = await jumia.getOrderItems(internalId)
                const data = Array.isArray(itemsRes) ? itemsRes[0] : itemsRes
                const rawList = data?.orderItems || data?.items || data?.data?.orderItems || data?.data?.items || (Array.isArray(itemsRes) ? itemsRes : [])
                const flat = Array.isArray(rawList) ? rawList : []
                const items = flat.map((item: any) => {
                    const itemName = item.product?.name || item.name || item.Name || item.productName || ''
                    // URL directe du produit si disponible, sinon recherche Jumia par nom
                    const directUrl = item.product?.url || item.product?.Url || item.Url || item.url || item.ProductUrl || null
                    const productUrl = directUrl || (itemName ? `https://www.jumia.ma/catalog/?q=${encodeURIComponent(itemName)}` : null)
                    return {
                        id: item.id || item.orderItemId || item.uuid,
                        name: itemName || 'Article inconnu',
                        sellerSku: item.product?.sellerSku || item.sellerSku || item.Sku || item.sku || '',
                        quantity: item.quantity || 1,
                        price: item.itemPriceLocal?.value ?? item.itemPriceLocal ?? item.price ?? 0,
                        status: item.status || item.Status || order.status || 'N/A',
                        imageUrl: item.product?.imageUrl || item.imageUrl || null,
                        productUrl
                    }
                })
                jumiaItemsCache.set(internalId, items)
                return { ...order, items }
            } catch {
                return { ...order, items: [] }
            }
        })
    )

}

export async function getJumiaOrders(size = 100, token?: string, status?: string, createdAfter?: string, createdBefore?: string, sortBy = 'createdAt', sortDirection = 'DESC') {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const response = await jumia.getOrders(size, token, status, createdAfter, createdBefore, sortBy, sortDirection)
        const rawOrders = response?.orders || response?.data?.orders || []

        // Tri systématique en ordre décroissant (plus récentes en premier)
        rawOrders.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.CreatedAt || a.created_at || 0).getTime()
            const dateB = new Date(b.createdAt || b.CreatedAt || b.created_at || 0).getTime()
            if (dateA && dateB && dateA !== dateB) return dateB - dateA
            const numA = Number(String(a.number || a.OrderId || a.OrderNumber || a.id || '').replace(/\D/g, '')) || 0
            const numB = Number(String(b.number || b.OrderId || b.OrderNumber || b.id || '').replace(/\D/g, '')) || 0
            return numB - numA
        })

        return {
            orders: await enrichJumiaOrdersWithItems(jumia, rawOrders),
            nextToken: response?.nextToken || response?.data?.nextToken || null
        }
    } catch (e: any) {
        console.error("Error fetching Jumia orders:", e)
        throw new Error(e.message)
    }
}

export async function getJumiaStats() {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) return null

    try {
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const statsPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const createdAfter = statsPeriodStart.toISOString().split('T')[0]

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const createdBefore = tomorrow.toISOString().split('T')[0]

        // Fetch up to 300 recent orders for stats
        const response = await jumia.getOrders(300, undefined, undefined, createdAfter, createdBefore)
        const orders = response?.orders || response?.data?.orders || []

        let total = 0
        let pending = 0
        let shipped = 0
        let delivered = 0
        let canceled = 0
        let failed = 0
        let revenue = 0
        let currentMonthOrders = 0
        let previousMonthOrders = 0
        let currentMonthRevenue = 0
        let previousMonthRevenue = 0
        let todayOrders = 0
        let currentMonthCanceled = 0
        let currentMonthReturned = 0

        const evolutionMap: Record<string, { date: string, count: number, revenue: number }> = {}

        orders.forEach((o: any) => {
            const st = (o.status || o.Status || o.Statuses?.[0] || '').toUpperCase()

            const createdAtValue = o.createdAt || o.CreatedAt || o.created_at
            const createdAt = createdAtValue ? new Date(createdAtValue) : null
            const isCurrentMonth = Boolean(createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= currentMonthStart)
            const isPreviousMonth = Boolean(createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= previousMonthStart && createdAt < currentMonthStart)
            const isToday = Boolean(createdAt && !Number.isNaN(createdAt.getTime()) && createdAt >= todayStart)

            if (st === 'FAILED') {
                failed++
                return
            }
            if (st === 'CANCELED' || st === 'CANCELLED') {
                canceled++
                if (isCurrentMonth) currentMonthCanceled++
                return
            }

            total++
            if (st === 'PENDING') pending++
            else if (st === 'READY_TO_SHIP' || st === 'READY-TO-SHIP' || st === 'SHIPPED') shipped++
            else if (st === 'DELIVERED') delivered++
            if (isCurrentMonth) currentMonthOrders++
            if (isPreviousMonth) previousMonthOrders++
            if (isToday) todayOrders++
            if (isCurrentMonth && st === 'RETURNED') currentMonthReturned++

            const price = parseFloat(o.totalAmountLocal?.value || o.Price || o.GrandTotal || '0')

            // On ne compte pas le revenu pour les commandes RETURNED, mais on les garde dans le total
            const isValidRevenue = !isNaN(price) && st !== 'RETURNED'

            if (isValidRevenue) {
                revenue += price
                if (isCurrentMonth) currentMonthRevenue += price
                if (isPreviousMonth) previousMonthRevenue += price
            }

            // Timeline evolution based on createdAt
            if (createdAtValue) {
                const dateStr = createdAtValue.split('T')[0] // YYYY-MM-DD
                if (!evolutionMap[dateStr]) {
                    evolutionMap[dateStr] = { date: dateStr, count: 0, revenue: 0 }
                }
                evolutionMap[dateStr].count++
                if (isValidRevenue) {
                    evolutionMap[dateStr].revenue += price
                }
            }
        })

        const evolutionData = Object.values(evolutionMap).sort((a, b) => a.date.localeCompare(b.date))

        const recentOrders = orders.slice(0, 3)
        const currentMonthAverageOrder = currentMonthOrders > 0 ? currentMonthRevenue / currentMonthOrders : 0
        const currentMonthCancellationRate = currentMonthOrders + currentMonthCanceled > 0
            ? (currentMonthCanceled / (currentMonthOrders + currentMonthCanceled)) * 100
            : 0

        const percentageChange = (current: number, previous: number) => {
            if (previous === 0) return current === 0 ? 0 : null
            return ((current - previous) / previous) * 100
        }

        return {
            total,
            pending,
            shipped,
            delivered,
            canceled,
            failed,
            revenue,
            currentMonthOrders,
            previousMonthOrders,
            currentMonthRevenue,
            previousMonthRevenue,
            currentMonthAverageOrder,
            currentMonthCanceled,
            currentMonthReturned,
            currentMonthCancellationRate,
            todayOrders,
            ordersMonthlyChange: percentageChange(currentMonthOrders, previousMonthOrders),
            revenueMonthlyChange: percentageChange(currentMonthRevenue, previousMonthRevenue),
            evolutionData,
            recentOrders
        }
    } catch (e) {
        return null
    }
}

export async function getJumiaOrderItems(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const response = await jumia.getOrderItems(orderId)
        const data = Array.isArray(response) ? response[0] : response
        return data?.items || data?.data?.items || data || []
    } catch (e: any) {
        console.error("Error fetching Jumia order items:", e)
        throw new Error(e.message)
    }
}

export async function cancelJumiaOrderFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const responseItems = await jumia.getOrderItems(orderId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data || []

        if (!items || !items.length) {
            throw new Error("Aucun article trouvé pour cette commande. Impossible d'annuler.")
        }

        // Extraction des IDs (suivant les différentes structures de l'API)
        const orderItemIds = items.map((item: any) => item.id || item.orderItemId || item.OrderItemId || item.uuid).filter(Boolean)

        if (!orderItemIds.length) {
            throw new Error("Impossible de trouver l'UUID des articles à annuler.")
        }

        // Appel final pour annuler
        const cancelResponse = await jumia.cancelOrders(orderItemIds)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'CANCEL', status: 'SUCCESS' } }).catch(() => {})

        // Réintégrer le stock + sync Jumia en background
        reintegrateJumiaOrderStock(items, orderId, 'CANCEL').catch(console.error)

        return cancelResponse
    } catch (e: any) {
        console.error("Error canceling Jumia order:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'CANCEL', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

// Réintégre le stock local + Jumia pour les articles d'une commande Jumia annulée/échouée
async function reintegrateJumiaOrderStock(items: any[], orderId: string, reason: 'CANCEL' | 'FAILED' | 'RETURNED') {
    try {
        // Pour chaque article Jumia, trouver le livre local via sellerSku
        const skuQuantities: Record<string, number> = {}
        for (const item of items) {
            const sku = item.sellerSku || item.Sku || item.sku || item.SellerSku
            const qty = parseInt(item.quantity || item.Quantity || '1', 10) || 1
            if (sku) skuQuantities[sku] = (skuQuantities[sku] || 0) + qty
        }

        const skus = Object.keys(skuQuantities)
        if (skus.length === 0) return

        // Trouver les livres correspondants
        const books = await prisma.book.findMany({
            where: { sellerSku: { in: skus } },
            select: { id: true, title: true, sellerSku: true, stock: true, isSyncedWithJumia: true }
        })

        if (books.length === 0) return

        const restoredItems: string[] = []

        // Réintégrer dans la base locale
        for (const book of books) {
            const qty = skuQuantities[book.sellerSku!]
            if (!qty) continue
            await prisma.book.updateMany({
                where: { id: book.id },
                data: { stock: { increment: qty } }
            })
            restoredItems.push(`• ${book.title} +${qty}`)
        }

        // Syncer le nouveau stock vers Jumia
        const { syncJumiaStockForBooksBackground } = await import('@/lib/actions/jumia')
        await syncJumiaStockForBooksBackground(books.map(b => b.id))

        // Notifier Telegram
        const reasonLabel = reason === 'CANCEL' ? 'Annulation' : reason === 'FAILED' ? 'Échec' : 'Retour'
        const msg = `📦 <b>Stock Réintégré [Jumia - ${reasonLabel}]</b>\n\n🆔 Commande: <code>${orderId}</code>\n\n${restoredItems.join('\n')}\n\n✅ Stock local mis à jour + Jumia synchronisé`
        sendTelegramMessage(msg).catch(console.error)
    } catch (err) {
        console.error('reintegrateJumiaOrderStock error:', err)
    }
}

// Action publique : réintégrer le stock d'une commande Jumia FAILED/CANCELED/RETURNED
export async function restoreJumiaOrderStock(orderId: string, reason: 'FAILED' | 'CANCELED' | 'RETURNED' = 'CANCELED') {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) return { success: false, error: "Jumia n'est pas configuré" }

    try {
        const responseItems = await jumia.getOrderItems(orderId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data || []

        if (!items || !items.length) {
            return { success: false, error: "Aucun article trouvé pour cette commande." }
        }

        const reasonKey = reason === 'FAILED' ? 'FAILED' : reason === 'RETURNED' ? 'RETURNED' : 'CANCEL'
        await reintegrateJumiaOrderStock(items, orderId, reasonKey as any)
        await prisma.jumiaActionLog.create({ data: { orderId, action: `RESTORE_STOCK_${reason}`, status: 'SUCCESS' } }).catch(() => {})
        return { success: true }
    } catch (e: any) {
        console.error("restoreJumiaOrderStock error:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: `RESTORE_STOCK_${reason}`, status: 'ERROR', detail: e.message } }).catch(() => {})
        return { success: false, error: e.message }
    }
}

async function resolveJumiaOrderInternalId(jumia: any, orderId: string): Promise<string> {
    if (!orderId) return orderId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    if (isUuid) return orderId

    try {
        const updatedAfterDate = new Date()
        updatedAfterDate.setUTCDate(updatedAfterDate.getUTCDate() - 89)
        const formatDateTime = (date: Date) => date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
        let token: string | undefined

        for (let page = 0; page < 100; page++) {
            const searchRes = await jumia.getOrdersUpdated({
                size: 300,
                token,
                updatedAfter: formatDateTime(updatedAfterDate),
                updatedBefore: formatDateTime(new Date())
            })
            const orderList = searchRes?.orders || searchRes?.data?.orders || []
            const match = orderList.find((order: any) => String(order.number || order.orderNumber) === String(orderId))
            if (match?.id) return String(match.id)

            token = searchRes?.nextToken || searchRes?.data?.nextToken
            if (!token) break
        }
    } catch (e) {
        console.warn(`[JUMIA] Impossible de mapper orderId ${orderId} en UUID:`, e)
    }
    return orderId
}

export async function packJumiaOrderFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        // 1. Fetch Order Items
        const internalId = await resolveJumiaOrderInternalId(jumia, orderId)
        const responseItems = await jumia.getOrderItems(internalId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data || []

        if (!items || !items.length) {
            throw new Error("Aucun article trouvé pour cette commande.")
        }

        const orderItemIds = items.map((item: any) => item.id || item.orderItemId || item.OrderItemId || item.uuid).filter(Boolean)

        if (!orderItemIds.length) {
            throw new Error("Impossible de trouver l'UUID des articles.")
        }

        // 2. Fetch Shipment Providers using all order item IDs
        const responseProviders = await jumia.getShipmentProviders(orderItemIds)
        const directProviders = responseProviders?.providers || responseProviders?.data?.providers
        const providerGroups = responseProviders?.orderItems || responseProviders?.data?.orderItems || []
        const providerLists = Array.isArray(providerGroups)
            ? providerGroups.map((group: any) => group?.shipmentProviders || []).filter((list: any[]) => list.length > 0)
            : []
        const providers = Array.isArray(directProviders)
            ? directProviders
            : providerLists.length > 0
                ? providerLists[0].filter((provider: any) =>
                    providerLists.every((list: any[]) => list.some((candidate: any) => candidate.id === provider.id))
                )
                : []

        if (!providers || !providers.length) {
            throw new Error(`Aucun fournisseur d'expédition trouvé pour ces articles.`)
        }

        // 3. Tekno Store dépose ses colis au hub Rabat Océan. Ne jamais prendre le
        // premier fournisseur de la liste : Jumia peut renvoyer Inezgane avant
        // Rabat, ce qui prépare alors la commande pour le mauvais point dépôt.
        const normalizeProviderName = (value: unknown) => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
        const rabatOceanProvider = providers.find((provider: any) => {
            const name = normalizeProviderName(provider?.name || provider?.label)
            return name.includes('rbt ocean') || name.includes('rabat ocean')
        })

        if (!rabatOceanProvider) {
            const availableNames = providers
                .map((provider: any) => provider?.name || provider?.label)
                .filter(Boolean)
                .join(', ')
            throw new Error(`Le hub Rabat Océan n'est pas disponible. Hubs proposés : ${(availableNames || 'aucun').slice(0, 100)}.`)
        }

        const shipmentProviderId = rabatOceanProvider.id || rabatOceanProvider.uuid || rabatOceanProvider.ShipmentProviderId

        if (!shipmentProviderId) {
            throw new Error("Impossible de trouver l'ID du fournisseur d'expédition.")
        }

        // Rabat Océan does not require a caller-provided tracking code, so use
        // the V1 packing endpoint. Jumia's V2 endpoint rejects a missing
        // trackingCode even when the provider reports trackingCodeRequired=false.
        const payload = {
            orderItems: orderItemIds.map((id: string) => ({
                id,
                shipmentProviderId
            }))
        }

        const packResponse = await jumia.packOrdersV1(payload)
        const packErrors = packResponse?.error?.packages || packResponse?.error?.orderItems || []
        if (Array.isArray(packErrors) && packErrors.length > 0) {
            const packError = packErrors[0]?.error
                || packErrors[0]?.response?.message
                || 'Jumia n\'a pas pu emballer la commande.'
            throw new Error(packError)
        }

        const readyResponse = await jumia.readyToShipOrders({ orderItemIds })
        const readyErrors = readyResponse?.error?.packages || readyResponse?.error?.orderItems || []
        if (Array.isArray(readyErrors) && readyErrors.length > 0) {
            const readyError = readyErrors[0]?.error
                || readyErrors[0]?.response?.message
                || 'Jumia n\'a pas pu passer la commande en Ready to Ship.'
            throw new Error(readyError)
        }
        await prisma.jumiaActionLog.create({
            data: {
                orderId,
                action: 'READY_TO_SHIP',
                status: 'SUCCESS',
                detail: `Hub sélectionné : ${rabatOceanProvider.name || 'Rabat Océan'} (${shipmentProviderId})`
            }
        }).catch(() => {})
        return packResponse
    } catch (e: any) {
        console.error("Error packing Jumia order:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'READY_TO_SHIP', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

export async function printJumiaOrderLabelsFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const internalId = await resolveJumiaOrderInternalId(jumia, orderId)
        const responseItems = await jumia.getOrderItems(internalId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data?.orderItems || data?.data?.orderItems || (Array.isArray(data) ? data : [])

        if (!items || !items.length) {
            throw new Error("Aucun article trouvé pour cette commande.")
        }

        const orderItemIds = items.map((item: any) => item.id || item.orderItemId || item.OrderItemId || item.uuid).filter(Boolean)

        if (!orderItemIds.length) {
            throw new Error("Impossible de trouver l'UUID des articles.")
        }

        const payload = {
            orderItemIds: orderItemIds,



        }

        void('[PRINT LABELS] Order ID:', orderId)
        void('[PRINT LABELS] Items found:', items.length, JSON.stringify(items.slice(0, 2)))
        void('[PRINT LABELS] Payload:', JSON.stringify(payload))

        let response: any
        try {
            response = await jumia.printLabels(payload)
        } catch (printErr: any) {
            const msg = (printErr.message || '').toLowerCase()
            if (msg.includes('not packed') || msg.includes('pending')) {
                await packJumiaOrderFull(orderId)
                response = await jumia.printLabels(payload)
            } else {
                throw printErr
            }
        }
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PRINT_LABEL', status: 'SUCCESS' } }).catch(() => {})
        return response
    } catch (e: any) {
        console.error("Error printing Jumia order labels:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PRINT_LABELS', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

export async function printJumiaOrderInvoiceFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const internalId = await resolveJumiaOrderInternalId(jumia, orderId)
        const responseItems = await jumia.getOrderItems(internalId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data || []

        if (!items || !items.length) {
            throw new Error("Aucun article trouvé pour cette commande.")
        }

        const orderItemIds = items.map((item: any) => item.id || item.orderItemId || item.OrderItemId || item.uuid).filter(Boolean)

        if (!orderItemIds.length) {
            throw new Error("Impossible de trouver l'UUID des articles.")
        }

        // On the Jumia API side, some use orderId directly or orderItemIds in payload
        const printResponse = await jumia.printInvoice({ orderId, orderItemIds })
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PRINT_INVOICE', status: 'SUCCESS' } }).catch(() => {})
        return printResponse
    } catch (e: any) {
        console.error("Error printing Jumia order invoice:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PRINT_INVOICE', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

export async function readyToShipJumiaOrderFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")

    try {
        const internalId = await resolveJumiaOrderInternalId(jumia, orderId)
        const responseItems = await jumia.getOrderItems(internalId)
        const data = Array.isArray(responseItems) ? responseItems[0] : responseItems
        const items = data?.items || data?.data?.items || data || []

        if (!items || !items.length) {
            throw new Error("Aucun article trouvé pour cette commande.")
        }

        const orderItemIds = items.map((item: any) => item.id || item.orderItemId || item.OrderItemId || item.uuid).filter(Boolean)

        if (!orderItemIds.length) {
            throw new Error("Impossible de trouver l'UUID des articles.")
        }

        const payload = {
            orderItemIds: orderItemIds
        }

        const response = await jumia.readyToShipOrders(payload)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'READY_TO_SHIP', status: 'SUCCESS' } }).catch(() => {})
        return response
    } catch (e: any) {
        console.error("Error setting Jumia order to ready to ship:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'READY_TO_SHIP', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

export async function getJumiaPayoutStatements(params?: any) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return null
        const response = await jumia.getPayoutStatements(params)
        return response
    } catch (e: any) {
        console.error("Error fetching Jumia payout statements:", e)
        return null
    }
}

export async function createJumiaConsignmentOrder(payload: any) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        const response = await jumia.createConsignmentOrder(payload)
        return response
    } catch (e: any) {
        console.error("Error creating Jumia consignment order:", e)
        return { error: e.message }
    }
}

export async function updateJumiaConsignmentOrder(purchaseOrderNumber: string, payload: any) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        const response = await jumia.updateConsignmentOrder(purchaseOrderNumber, payload)
        return response
    } catch (e: any) {
        console.error("Error updating Jumia consignment order:", e)
        return { error: e.message }
    }
}

export async function getJumiaConsignmentStock(businessClientCode: string, sku: string) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        const response = await jumia.getConsignmentStock(businessClientCode, sku)
        return response
    } catch (e: any) {
        console.error("Error fetching Jumia consignment stock:", e)
        return { error: e.message }
    }
}



export async function getJumiaShops() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        const response = await jumia.getShops()
        return response
    } catch (e: any) {
        console.error("Error fetching Jumia shops:", e)
        return { error: e.message }
    }
}

export async function getJumiaShopsOfMasterShop() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        const response = await jumia.getShopsOfMasterShop()
        return response
    } catch (e: any) {
        console.error("Error fetching Jumia shops of master shop:", e)
        return { error: e.message }
    }
}

// --- Feeds (Products) Actions ---

export async function getJumiaFeed(id: string) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getFeed(id)
    } catch (e: any) {
        console.error("Error fetching Jumia feed:", e)
        return { error: e.message }
    }
}

export async function updateJumiaProductsStock(products: any[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.updateProductsStock(products)
    } catch (e: any) {
        console.error("Error updating Jumia products stock:", e)
        return { error: e.message }
    }
}

export async function updateJumiaProductsPrice(products: any[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.updateProductsPrice(products)
    } catch (e: any) {
        console.error("Error updating Jumia products price:", e)
        return { error: e.message }
    }
}

export async function updateJumiaProductsStatus(products: any[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.updateProductsStatus(products)
    } catch (e: any) {
        console.error("Error updating Jumia products status:", e)
        return { error: e.message }
    }
}

export async function createJumiaProducts(shopId: string, products: any[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.createProducts(shopId, products)
    } catch (e: any) {
        console.error("Error creating Jumia products:", e)
        return { error: e.message }
    }
}

export async function updateJumiaProducts(products: any[], shopId?: string) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.updateProducts(products, shopId)
    } catch (e: any) {
        console.error("Error updating Jumia products:", e)
        return { error: e.message }
    }
}

// --- Catalog Actions ---

export async function getJumiaBrands(page = 1) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getBrands(page)
    } catch (e: any) {
        console.error("Error fetching Jumia brands:", e)
        return { error: e.message }
    }
}

export async function getJumiaCategories(page = 1, attributeSetName?: string) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getCategories(page, attributeSetName)
    } catch (e: any) {
        console.error("Error fetching Jumia categories:", e)
        return { error: e.message }
    }
}

export async function getJumiaProducts(params: any = {}) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getProducts(params)
    } catch (e: any) {
        console.error("Error fetching Jumia products:", e)
        return { error: e.message }
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getAllJumiaProducts() {
    let allProducts: any[] = []
    let nextToken: string | undefined = undefined

    try {
        do {
            if (nextToken) await delay(1000); // Eviter Rate Limit Jumia (429)
            const res = await getJumiaProducts({ token: nextToken, size: 50 })
            if (res.error) break;
            if (res.products && res.products.length > 0) {
                allProducts = allProducts.concat(res.products)
            }
            nextToken = res.nextToken
        } while (nextToken)

        // Fetch all stock and merge
        const jumia = await JumiaAPI.getInstance()
        if (jumia && allProducts.length > 0) {
            let allStock: any[] = []
            let stockNextToken: string | undefined = undefined
            do {
                try {
                    if (stockNextToken) await delay(1000); // Eviter Rate Limit Jumia (429)
                    const stockRes = await jumia.getCatalogStock({ token: stockNextToken, size: 100 })
                    if (stockRes.products && stockRes.products.length > 0) {
                        allStock = allStock.concat(stockRes.products)
                    }
                    stockNextToken = stockRes.nextToken
                } catch (err) {
                    break;
                }
            } while (stockNextToken)

            // Check linkage with local products
            const sellerSkus: string[] = []
            allProducts.forEach((p: any) => {
                if (p.sellerSku) sellerSkus.push(p.sellerSku)
                if (p.variations) {
                    p.variations.forEach((v: any) => {
                        if (v.sellerSku) sellerSkus.push(v.sellerSku)
                    })
                }
            })

            let linkedSkus = new Set<string>()

            if (sellerSkus.length > 0) {
                const linkedBooks = await prisma.book.findMany({
                    where: { sellerSku: { in: sellerSkus } },
                    select: { sellerSku: true }
                })

                linkedBooks.forEach(b => { if (b.sellerSku) linkedSkus.add(b.sellerSku) })
            }

            // Merge stock into products and check if linked
            allProducts = allProducts.map((p: any) => {
                // Stock
                let pSellerSku = p.sellerSku
                if (!pSellerSku && p.variations && p.variations.length > 0) {
                    pSellerSku = p.variations[0].sellerSku
                }
                if (pSellerSku) {
                    const stockItem = allStock.find(s => s.sellerSku === pSellerSku)
                    if (stockItem) {
                        p.stockActuel = stockItem.globalStock
                        p.stockId = stockItem.id
                    }
                }

                // Linkage check
                let isLinked = false
                if (p.sellerSku && linkedSkus.has(p.sellerSku)) isLinked = true
                if (p.variations) {
                    p.variations.forEach((v: any) => {
                        if (v.sellerSku && linkedSkus.has(v.sellerSku)) isLinked = true
                    })
                }
                p.isLinked = isLinked

                return p
            })
        }

        return { products: allProducts }
    } catch (e: any) {
        return { error: e.message, products: allProducts }
    }
}

export async function getJumiaAttributeSets(id: string) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getAttributeSets(id)
    } catch (e: any) {
        console.error("Error fetching Jumia attribute sets:", e)
        return { error: e.message }
    }
}

export async function getJumiaCatalogStock(params: any = {}) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getCatalogStock(params)
    } catch (e: any) {
        console.error("Error fetching Jumia catalog stock:", e)
        return { error: e.message }
    }
}

export async function getJumiaPayoutStatementsAction(params: any = {}) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { error: "Jumia n'est pas configuré" }
        return await jumia.getPayoutStatements(params)
    } catch (e: any) {
        console.error("Error fetching Jumia payout statements:", e)
        return { error: e.message }
    }
}
