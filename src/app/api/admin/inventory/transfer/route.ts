import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/inventory/transfer
export async function POST(req: Request) {
    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { bookId, fromWarehouseId, toWarehouseId, quantity, note } = await req.json()

    if (!bookId || !fromWarehouseId || !toWarehouseId || !quantity) {
        return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    if (fromWarehouseId === toWarehouseId) {
        return NextResponse.json({ error: 'Les entrepôts source et destination doivent être différents' }, { status: 400 })
    }

    try {
        await prisma.$transaction(async (tx) => {
            const source = await tx.inventory.findUnique({
                where: { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } },
            })

            if (!source || source.quantity < Number(quantity)) {
                throw new Error("Stock insuffisant dans l'entrepôt source")
            }

            await tx.inventory.update({
                where: { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } },
                data: { quantity: { decrement: Number(quantity) } },
            })

            await tx.inventory.upsert({
                where: { bookId_warehouseId: { bookId, warehouseId: toWarehouseId } },
                update: { quantity: { increment: Number(quantity) } },
                create: { bookId, warehouseId: toWarehouseId, quantity: Number(quantity) },
            })

            await tx.stockMovement.create({
                data: { bookId, fromWarehouseId, toWarehouseId, quantity: Number(quantity), type: 'TRANSFER', note },
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
    }
}
