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

    const { bookId, extraProductId, fromWarehouseId, toWarehouseId, quantity, note } = await req.json()

    if ((!bookId && !extraProductId) || !fromWarehouseId || !toWarehouseId || !quantity) {
        return NextResponse.json({ error: 'Tous les champs sont requis (bookId ou extraProductId inclus)' }, { status: 400 })
    }

    if (fromWarehouseId === toWarehouseId) {
        return NextResponse.json({ error: 'Les entrepôts source et destination doivent être différents' }, { status: 400 })
    }

    try {
        await prisma.$transaction(async (tx) => {
            const sourceWhere: any = bookId ? { bookId_warehouseId: { bookId, warehouseId: fromWarehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId: fromWarehouseId } }
            
            const source = await tx.inventory.findUnique({
                where: sourceWhere,
            })

            if (!source || source.quantity < Number(quantity)) {
                throw new Error("Stock insuffisant dans l'entrepôt source")
            }

            await tx.inventory.update({
                where: sourceWhere,
                data: { quantity: { decrement: Number(quantity) } },
            })

            const destWhere: any = bookId ? { bookId_warehouseId: { bookId, warehouseId: toWarehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId: toWarehouseId } }
            const destCreateData: any = bookId ? { bookId, warehouseId: toWarehouseId, quantity: Number(quantity) } : { extraProductId: extraProductId!, warehouseId: toWarehouseId, quantity: Number(quantity) }

            await tx.inventory.upsert({
                where: destWhere,
                update: { quantity: { increment: Number(quantity) } },
                create: destCreateData,
            })

            await tx.stockMovement.create({
                data: { bookId, extraProductId, fromWarehouseId, toWarehouseId, quantity: Number(quantity), type: 'TRANSFER', note } as any,
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
    }
}
