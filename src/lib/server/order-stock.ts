import 'server-only'

import { restoreOrderItemStock, deductOrderItemStock } from '@/lib/server/warehouse'

const STOCK_RESTORED_MAP_KEY = 'order_stock_restored_map'
export const RECOVERY_STATUSES_KEY = 'return_recovery_statuses'

export interface StockOrderItem {
    id: string
    type: string
    bookId: string | null
    extraProductId: string | null
    packId: string | null
    warehouseId?: string | null
    quantity: number
    pack?: {
        books: Array<{ bookId: string }>
    } | null
}

function parseJsonMap(raw?: string | null): Record<string, boolean> {
    if (!raw) return {}
    try {
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
        return {}
    }
}

export async function getJsonBooleanMap(tx: any, key: string): Promise<Record<string, boolean>> {
    const setting = await tx.siteSettings.findUnique({ where: { key } })
    return parseJsonMap(setting?.value)
}

export async function setJsonBooleanEntry(
    tx: any,
    key: string,
    orderId: string,
    value: boolean,
    description: string
) {
    const map = await getJsonBooleanMap(tx, key)
    if (value) {
        map[orderId] = true
    } else if (key === STOCK_RESTORED_MAP_KEY) {
        delete map[orderId]
    } else {
        map[orderId] = false
    }

    // Limiter la taille stockée dans SiteSettings pour préserver les performances
    const keys = Object.keys(map)
    if (keys.length > 5000) {
        for (const oldKey of keys.slice(0, keys.length - 5000)) {
            delete map[oldKey]
        }
    }

    await tx.siteSettings.upsert({
        where: { key },
        update: { value: JSON.stringify(map) },
        create: {
            key,
            value: JSON.stringify(map),
            category: 'orders',
            description,
        },
    })
}

export async function isOrderStockRestored(tx: any, orderId: string): Promise<boolean> {
    const map = await getJsonBooleanMap(tx, STOCK_RESTORED_MAP_KEY)
    return map[orderId] === true
}

export async function setOrderStockRestored(tx: any, orderId: string, restored: boolean) {
    await setJsonBooleanEntry(
        tx,
        STOCK_RESTORED_MAP_KEY,
        orderId,
        restored,
        'Identifiants des commandes dont le stock a déjà été réintégré'
    )
}

export async function setReturnRecoveredFlag(tx: any, orderId: string, isRecovered: boolean) {
    await setJsonBooleanEntry(
        tx,
        RECOVERY_STATUSES_KEY,
        orderId,
        isRecovered,
        'Statut physique de récupération des colis en retour'
    )
}

/**
 * Applique un mouvement de stock unifié sur tous les articles d'une commande (livres, accessoires, packs et entrepôt)
 */
export async function applyOrderStockDelta(
    tx: any,
    orderId: string,
    items: StockOrderItem[],
    direction: 'RESTORE' | 'DEDUCT',
    note?: string
) {
    const delta = (qty: number) => (direction === 'RESTORE' ? { increment: qty } : { decrement: qty })

    for (const item of items) {
        if (item.warehouseId) {
            if (direction === 'RESTORE') {
                await restoreOrderItemStock(tx, {
                    bookId: item.bookId,
                    extraProductId: item.extraProductId,
                    warehouseId: item.warehouseId,
                    quantity: item.quantity,
                    orderId,
                })
            } else {
                await deductOrderItemStock(tx, {
                    bookId: item.bookId,
                    extraProductId: item.extraProductId,
                    warehouseId: item.warehouseId,
                    quantity: item.quantity,
                    orderId,
                    note,
                })
            }
        }

        if (item.type === 'BOOK' && item.bookId) {
            await tx.book.updateMany({
                where: { id: item.bookId },
                data: { stock: delta(item.quantity) },
            })
        } else if (item.type === 'ACCESSORY' && item.extraProductId) {
            await tx.extraProduct.updateMany({
                where: { id: item.extraProductId },
                data: { stock: delta(item.quantity) },
            })
        } else if (item.type === 'PACK' && item.pack) {
            for (const packBook of item.pack.books) {
                await tx.book.updateMany({
                    where: { id: packBook.bookId },
                    data: { stock: delta(item.quantity) },
                })
            }
        }
    }
}

