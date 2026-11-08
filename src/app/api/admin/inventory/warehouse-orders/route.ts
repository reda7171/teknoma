import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

// Retourne les mouvements EXIT d'un entrepôt (sorties liées aux commandes)
export async function GET(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","CONFIRMATOR"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const warehouseId = searchParams.get('warehouseId')

    if (!warehouseId) {
        return NextResponse.json({ error: 'warehouseId requis' }, { status: 400 })
    }

    const movements = await prisma.stockMovement.findMany({
        where: {
            fromWarehouseId: warehouseId,
            type: 'EXIT',
        },
        include: {
            book: { select: { id: true, title: true, author: true } },
            extraProduct: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    })

    return NextResponse.json(movements)
}
