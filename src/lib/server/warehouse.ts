import 'server-only'

import { prisma } from '@/lib/prisma'

// --- Entrepôts ---

export async function getWarehouses() {
    return prisma.warehouse.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
    })
}

export async function getAllWarehouses() {
    return prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
}

export async function createWarehouse(data: { name: string; location?: string }) {
    return prisma.warehouse.create({ data })
}

export async function updateWarehouse(id: string, data: { name?: string; location?: string; active?: boolean }) {
    return prisma.warehouse.update({ where: { id }, data })
}

// --- Inventaire ---

export async function getInventory(bookId?: string) {
    return prisma.inventory.findMany({
        where: bookId ? { bookId } : undefined,
        include: {
            book: { select: { id: true, title: true, author: true, stock: true, image: true } },
            warehouse: { select: { id: true, name: true, location: true } },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { book: { title: 'asc' } }],
    })
}

export async function getInventoryByWarehouse(warehouseId: string) {
    return prisma.inventory.findMany({
        where: { warehouseId, quantity: { gt: 0 } },
        include: { book: { select: { id: true, title: true, author: true, image: true, price: true } } },
        orderBy: { book: { title: 'asc' } },
    })
}

export async function getTotalStock(bookId: string): Promise<number> {
    const result = await prisma.inventory.aggregate({
        where: { bookId },
        _sum: { quantity: true },
    })
    return result._sum.quantity ?? 0
}

// Ajout / ajustement de stock (ENTRANCE ou ADJUSTMENT)
export async function upsertStock(data: {
    bookId?: string
    extraProductId?: string
    warehouseId: string
    quantity: number
    type: 'ENTRANCE' | 'RETURN' | 'ADJUSTMENT' | 'INITIAL'
    note?: string
}) {
    const { bookId, extraProductId, warehouseId, quantity, type, note } = data

    if (!bookId && !extraProductId) throw new Error('Un produit (bookId ou extraProductId) est requis')
    if (bookId && extraProductId) throw new Error('Spécifiez soit bookId soit extraProductId, pas les deux')

    return prisma.$transaction(async (tx) => {
        // Validation : le produit existe
        if (bookId) {
            const book = await tx.book.findUnique({ where: { id: bookId } })
            if (!book) throw new Error('Livre introuvable')
        } else if (extraProductId) {
            const extra = await tx.extraProduct.findUnique({ where: { id: extraProductId } })
            if (!extra) throw new Error('Accessoire introuvable')
        }

        const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } })
        if (!warehouse) throw new Error('Entrepôt introuvable')

        // Créer ou mettre à jour l'inventaire
        const whereClause = bookId ? { bookId_warehouseId: { bookId, warehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId } }
        const createData = bookId ? { bookId, warehouseId, quantity } : { extraProductId: extraProductId!, warehouseId, quantity }

        await tx.inventory.upsert({
            where: whereClause,
            update: { quantity: { increment: quantity } },
            create: createData,
        })

        // Enregistrer le mouvement
        await tx.stockMovement.create({
            data: {
                bookId,
                extraProductId,
                toWarehouseId: warehouseId,
                quantity,
                type,
                note
            },
        })

        if (bookId) {
            const aggregate = await tx.inventory.aggregate({
                where: { bookId },
                _sum: { quantity: true },
            })
            await tx.book.update({
                where: { id: bookId },
                data: { stock: aggregate._sum.quantity ?? 0 },
            })
        } else if (extraProductId) {
            const aggregate = await tx.inventory.aggregate({
                where: { extraProductId },
                _sum: { quantity: true },
            })
            await tx.extraProduct.update({
                where: { id: extraProductId },
                data: { stock: aggregate._sum.quantity ?? 0 },
            })
        }
    })
}

// Transfert entre entrepôts
export async function transferStock(data: {
    bookId?: string
    extraProductId?: string
    fromWarehouseId: string
    toWarehouseId: string
    quantity: number
    note?: string
}) {
    const { bookId, extraProductId, fromWarehouseId, toWarehouseId, quantity, note } = data

    if (!bookId && !extraProductId) throw new Error('Un produit (bookId ou extraProductId) est requis')
    if (fromWarehouseId === toWarehouseId) throw new Error('Les entrepôts doivent être différents')
    if (quantity <= 0) throw new Error('La quantité doit être positive')

    return prisma.$transaction(async (tx) => {
        const sourceWhere = bookId ? { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId: fromWarehouseId } }

        const sourceInventory = await tx.inventory.findUnique({
            where: sourceWhere
        })

        if (!sourceInventory || sourceInventory.quantity < quantity) {
            throw new Error('Stock insuffisant dans l\'entrepôt source')
        }

        // Décrémenter source
        await tx.inventory.update({
            where: sourceWhere,
            data: { quantity: { decrement: quantity } },
        })

        // Incrémenter destination
        const destWhere = bookId ? { bookId_warehouseId: { bookId, warehouseId: toWarehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId: toWarehouseId } }
        const destCreateData = bookId ? { bookId, warehouseId: toWarehouseId, quantity } : { extraProductId: extraProductId!, warehouseId: toWarehouseId, quantity }

        await tx.inventory.upsert({
            where: destWhere,
            update: { quantity: { increment: quantity } },
            create: destCreateData,
        })

        await tx.stockMovement.create({
            data: { bookId, extraProductId, fromWarehouseId, toWarehouseId, quantity, type: 'TRANSFER', note },
        })
    })
}

// Historique des mouvements
export async function getStockMovements(filters?: { bookId?: string; extraProductId?: string; warehouseId?: string; limit?: number }) {
    const { bookId, extraProductId, warehouseId, limit = 100 } = filters || {}
    return prisma.stockMovement.findMany({
        where: {
            ...(bookId ? { bookId } : {}),
            ...(extraProductId ? { extraProductId } : {}),
            ...(warehouseId ? {
                OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
            } : {}),
        },
        include: {
            book: { select: { id: true, title: true } },
            extraProduct: { select: { id: true, name: true } },
            fromWarehouse: { select: { id: true, name: true } },
            toWarehouse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    })
}


/**
 * Alloue et impacte le stock d'un article de commande.
 * R�gle m�tier :
 * 1. Impacte en priorit� l'entrep�t "Principal".
 * 2. Si le stock est insuffisant dans "Principal", impacte un autre entrep�t ayant du stock.
 * 3. Enregistre la d�duction d'inventaire et le mouvement de stock EXIT li� � la commande.
 */
export async function allocateOrderItemStock(
    tx: any,
    params: {
        bookId?: string | null
        extraProductId?: string | null
        quantity: number
        orderId: string
        forcedWarehouseId?: string | null
    }
): Promise<{ warehouseId: string; warehouseName: string }> {
    const { bookId, extraProductId, quantity, orderId, forcedWarehouseId } = params

    if (!bookId && !extraProductId) {
        throw new Error('Un bookId ou un extraProductId est requis pour allouer le stock')
    }

    // R�cup�rer tous les entrep�ts actifs
    const warehouses = await tx.warehouse.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
    })

    if (!warehouses || warehouses.length === 0) {
        throw new Error('Aucun entrep�t actif configur�')
    }

    // Si un entrep�t pr�cis a �t� s�lectionn� manuellement par l'administrateur
    if (forcedWarehouseId) {
        const forced = warehouses.find((w: any) => w.id === forcedWarehouseId)
        if (forced) {
            await applyWarehouseStockDeduction(tx, {
                bookId,
                extraProductId,
                warehouseId: forced.id,
                quantity,
                orderId
            })
            return { warehouseId: forced.id, warehouseName: forced.name }
        }
    }

    // D�tecter l'entrep�t "Principal" (insensible � la casse / aux accents)
    const normalize = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const principalWarehouse = warehouses.find((w: any) => normalize(w.name).includes('principal')) || warehouses[0]
    const otherWarehouses = warehouses.filter((w: any) => w.id !== principalWarehouse.id)

    // R�cup�rer le stock existant par entrep�t
    const inventories = await tx.inventory.findMany({
        where: bookId ? { bookId } : { extraProductId }
    })
    const stockMap = new Map<string, number>(inventories.map((inv: any) => [inv.warehouseId, inv.quantity]))

    // 1. Tester en premier l'entrep�t "Principal"
    const principalStock = stockMap.get(principalWarehouse.id) ?? 0
    let chosenWarehouse = principalWarehouse

    if (principalStock >= quantity) {
        // "Principal" a suffisamment de stock
        chosenWarehouse = principalWarehouse
    } else {
        // 2. Chercher dans les autres entrep�ts ayant le stock requis
        const altWithFullStock = otherWarehouses.find((w: any) => (stockMap.get(w.id) ?? 0) >= quantity)
        if (altWithFullStock) {
            chosenWarehouse = altWithFullStock
        } else {
            // 3. Chercher l'entrep�t avec le stock le plus �lev� (> 0)
            const sortedByStock = [...warehouses].sort((a: any, b: any) => (stockMap.get(b.id) ?? 0) - (stockMap.get(a.id) ?? 0))
            const bestWarehouse = sortedByStock[0]
            if ((stockMap.get(bestWarehouse.id) ?? 0) > 0) {
                chosenWarehouse = bestWarehouse
            } else {
                // Par d�faut, imputer sur l'entrep�t Principal
                chosenWarehouse = principalWarehouse
            }
        }
    }

    // D�duire le stock dans l'entrep�t choisi et enregistrer le mouvement EXIT
    await applyWarehouseStockDeduction(tx, {
        bookId,
        extraProductId,
        warehouseId: chosenWarehouse.id,
        quantity,
        orderId
    })

    return { warehouseId: chosenWarehouse.id, warehouseName: chosenWarehouse.name }
}

async function applyWarehouseStockDeduction(
    tx: any,
    params: {
        bookId?: string | null
        extraProductId?: string | null
        warehouseId: string
        quantity: number
        orderId: string
    }
) {
    const { bookId, extraProductId, warehouseId, quantity, orderId } = params

    if (bookId) {
        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId } },
            update: { quantity: { decrement: quantity } },
            create: { bookId, warehouseId, quantity: -quantity }
        })

        await tx.stockMovement.create({
            data: {
                bookId,
                fromWarehouseId: warehouseId,
                quantity,
                type: 'EXIT',
                note: `Commande #${orderId}`
            }
        })
    } else if (extraProductId) {
        await tx.inventory.upsert({
            where: { extraProductId_warehouseId: { extraProductId, warehouseId } },
            update: { quantity: { decrement: quantity } },
            create: { extraProductId, warehouseId, quantity: -quantity }
        })

        await tx.stockMovement.create({
            data: {
                extraProductId,
                fromWarehouseId: warehouseId,
                quantity,
                type: 'EXIT',
                note: `Commande #${orderId}`
            }
        })
    }
}

/**
 * R�int�gre le stock dans un entrep�t lors d'une annulation ou d'un retour.
 */
export async function restoreOrderItemStock(
    tx: any,
    params: {
        bookId?: string | null
        extraProductId?: string | null
        warehouseId?: string | null
        quantity: number
        orderId: string
    }
) {
    const { bookId, extraProductId, warehouseId, quantity, orderId } = params
    if (!warehouseId) return

    if (bookId) {
        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId } },
            update: { quantity: { increment: quantity } },
            create: { bookId, warehouseId, quantity }
        })
        await tx.stockMovement.create({
            data: {
                bookId,
                toWarehouseId: warehouseId,
                quantity,
                type: 'ENTRANCE',
                note: `Annulation/Retour Commande #${orderId}`
            }
        })
    } else if (extraProductId) {
        await tx.inventory.upsert({
            where: { extraProductId_warehouseId: { extraProductId, warehouseId } },
            update: { quantity: { increment: quantity } },
            create: { extraProductId, warehouseId, quantity }
        })
        await tx.stockMovement.create({
            data: {
                extraProductId,
                toWarehouseId: warehouseId,
                quantity,
                type: 'ENTRANCE',
                note: `Annulation/Retour Commande #${orderId}`
            }
        })
    }
}

/**
 * Déduit le stock dans un entrepôt (ex: si un retour récupéré est annulé).
 */
export async function deductOrderItemStock(
    tx: any,
    params: {
        bookId?: string | null
        extraProductId?: string | null
        warehouseId?: string | null
        quantity: number
        orderId: string
        note?: string
    }
) {
    const { bookId, extraProductId, warehouseId, quantity, orderId, note } = params
    if (!warehouseId) return

    if (bookId) {
        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId } },
            update: { quantity: { decrement: quantity } },
            create: { bookId, warehouseId, quantity: -quantity }
        })
        await tx.stockMovement.create({
            data: {
                bookId,
                fromWarehouseId: warehouseId,
                quantity,
                type: 'EXIT',
                note: note || `Annulation récupération retour #${orderId}`
            }
        })
    } else if (extraProductId) {
        await tx.inventory.upsert({
            where: { extraProductId_warehouseId: { extraProductId, warehouseId } },
            update: { quantity: { decrement: quantity } },
            create: { extraProductId, warehouseId, quantity: -quantity }
        })
        await tx.stockMovement.create({
            data: {
                extraProductId,
                fromWarehouseId: warehouseId,
                quantity,
                type: 'EXIT',
                note: note || `Annulation récupération retour #${orderId}`
            }
        })
    }
}
