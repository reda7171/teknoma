'use server'

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
