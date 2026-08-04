"use server"

import { JumiaAPI } from '@/lib/jumia-api'
import { prisma } from '@/lib/prisma'

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
        
        // 2. Fetch all Riwaya Books and Packs
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
            return { error: "Aucun produit Jumia n'a pu être associé à un livre Riwaya (vérifiez que le nom du produit Jumia correspond exactement au titre du livre sur Riwaya)." }
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

export async function getJumiaOrders(size = 100, token?: string, status?: string, createdAfter?: string, createdBefore?: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")
    
    try {
        const response = await jumia.getOrders(size, token, status, createdAfter, createdBefore)
        return {
            orders: response?.orders || response?.data?.orders || [],
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
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)
        const createdAfter = threeMonthsAgo.toISOString().split('T')[0]
        
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const createdBefore = tomorrow.toISOString().split('T')[0]
        
        // Fetch up to 300 recent orders for stats
        const response = await jumia.getOrders(300, undefined, undefined, createdAfter, createdBefore)
        const orders = response?.orders || response?.data?.orders || []
        
        let pending = 0
        let shipped = 0
        let delivered = 0
        let revenue = 0
        
        const evolutionMap: Record<string, { date: string, count: number, revenue: number }> = {}
        
        orders.forEach((o: any) => {
            const st = (o.status || o.Status || o.Statuses?.[0] || '').toUpperCase()
            if (st === 'PENDING') pending++
            else if (st === 'READY_TO_SHIP' || st === 'READY-TO-SHIP' || st === 'SHIPPED') shipped++
            else if (st === 'DELIVERED') delivered++
            
            const price = parseFloat(o.totalAmountLocal?.value || o.Price || o.GrandTotal || '0')
            if (!isNaN(price) && st !== 'CANCELED' && st !== 'FAILED' && st !== 'RETURNED') {
                revenue += price
            }

            // Timeline evolution based on createdAt
            const createdAt = o.createdAt || o.CreatedAt || o.created_at
            if (createdAt) {
                const dateStr = createdAt.split('T')[0] // YYYY-MM-DD
                if (!evolutionMap[dateStr]) {
                    evolutionMap[dateStr] = { date: dateStr, count: 0, revenue: 0 }
                }
                evolutionMap[dateStr].count++
                if (!isNaN(price)) {
                    evolutionMap[dateStr].revenue += price
                }
            }
        })
        
        const evolutionData = Object.values(evolutionMap).sort((a, b) => a.date.localeCompare(b.date))
        
        return {
            total: orders.length,
            pending,
            shipped,
            delivered,
            revenue,
            evolutionData
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
        return cancelResponse
    } catch (e: any) {
        console.error("Error canceling Jumia order:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'CANCEL', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}



export async function packJumiaOrderFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")
    
    try {
        // 1. Fetch Order Items
        const responseItems = await jumia.getOrderItems(orderId)
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
        const providers = responseProviders?.providers || responseProviders?.data?.providers || responseProviders || []

        if (!providers || !providers.length) {
            throw new Error(`Aucun fournisseur d'expédition trouvé pour ces articles.`)
        }

        // 3. Take the first available provider
        const shipmentProviderId = providers[0].id || providers[0].uuid || providers[0].ShipmentProviderId

        if (!shipmentProviderId) {
            throw new Error("Impossible de trouver l'ID du fournisseur d'expédition.")
        }
        
        // 4. Construct V2 Payload
        const payload = {
            packages: [
                {
                    shipmentProviderId: shipmentProviderId,
                    orderItemIds: orderItemIds
                }
            ]
        }
        
        const packResponse = await jumia.packOrders(payload)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PACK', status: 'SUCCESS' } }).catch(() => {})
        return packResponse
    } catch (e: any) {
        console.error("Error packing Jumia order:", e)
        await prisma.jumiaActionLog.create({ data: { orderId, action: 'PACK', status: 'ERROR', detail: e.message } }).catch(() => {})
        throw new Error(e.message)
    }
}

export async function printJumiaOrderLabelsFull(orderId: string) {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) throw new Error("Jumia n'est pas configuré")
    
    try {
        const responseItems = await jumia.getOrderItems(orderId)
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
            orderItemIds: orderItemIds,
            orderIds: [orderId],
            orderId: orderId,
            order_id: orderId // Certaines versions de l'API Jumia utilisent underscore
        }
        
        console.log('[PRINT LABELS] Order ID:', orderId)
        console.log('[PRINT LABELS] Items found:', items.length, JSON.stringify(items.slice(0, 2)))
        console.log('[PRINT LABELS] Payload:', JSON.stringify(payload))
        
        const response = await jumia.printLabels(payload)
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
        const responseItems = await jumia.getOrderItems(orderId)
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
        const responseItems = await jumia.getOrderItems(orderId)
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
            
            // Merge stock into products
            allProducts = allProducts.map((p: any) => {
                const sellerSku = p.sellerSku || (p.variations && p.variations[0]?.sellerSku)
                const stockItem = allStock.find(s => s.sellerSku === sellerSku)
                if (stockItem) {
                    p.stockActuel = stockItem.globalStock
                }
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
