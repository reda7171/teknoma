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
export async function upsertStock({
    bookId, warehouseId, quantity, note,
    type = 'ENTRANCE',
}: {
    bookId: string
    warehouseId: string
    quantity: number
    note?: string
    type?: 'ENTRANCE' | 'ADJUSTMENT'
}) {
    return prisma.$transaction(async (tx) => {
        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId } },
            update: { quantity: { increment: quantity } },
            create: { bookId, warehouseId, quantity },
        })
        await tx.stockMovement.create({
            data: { bookId, toWarehouseId: warehouseId, quantity, type, note },
        })
    })
}

// Transfert entre entrepôts
export async function transferStock({
    bookId, fromWarehouseId, toWarehouseId, quantity, note,
}: {
    bookId: string
    fromWarehouseId: string
    toWarehouseId: string
    quantity: number
    note?: string
}) {
    return prisma.$transaction(async (tx) => {
        const source = await tx.inventory.findUnique({
            where: { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } },
        })
        if (!source || source.quantity < quantity) {
            throw new Error("Stock insuffisant dans l'entrepôt source")
        }

        await tx.inventory.update({
            where: { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } },
            data: { quantity: { decrement: quantity } },
        })

        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId: toWarehouseId } },
            update: { quantity: { increment: quantity } },
            create: { bookId, warehouseId: toWarehouseId, quantity },
        })

        await tx.stockMovement.create({
            data: { bookId, fromWarehouseId, toWarehouseId, quantity, type: 'TRANSFER', note },
        })
    })
}

// Historique des mouvements
export async function getStockMovements(filters?: { bookId?: string; warehouseId?: string; limit?: number }) {
    const { bookId, warehouseId, limit = 100 } = filters || {}
    return prisma.stockMovement.findMany({
        where: {
            ...(bookId ? { bookId } : {}),
            ...(warehouseId ? {
                OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
            } : {}),
        },
        include: {
            book: { select: { id: true, title: true } },
            fromWarehouse: { select: { id: true, name: true } },
            toWarehouse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    })
}
