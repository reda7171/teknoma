import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/inventory?bookId=xxx ou ?warehouseId=yyy
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const bookId = searchParams.get('bookId') || undefined
    const warehouseId = searchParams.get('warehouseId') || undefined

    const inventory = await prisma.inventory.findMany({
        where: {
            ...(bookId ? { bookId } : {}),
            ...(warehouseId ? { warehouseId } : {}),
        },
        include: {
            book: { select: { id: true, title: true, author: true, image: true, stock: true } },
            warehouse: { select: { id: true, name: true, location: true } },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { quantity: 'desc' }],
    })

    return NextResponse.json(inventory)
}

// POST /api/admin/inventory — Ajouter ou ajuster du stock
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { bookId, warehouseId, quantity, note, type = 'ENTRANCE' } = await req.json()

    if (!bookId || !warehouseId || !quantity) {
        return NextResponse.json({ error: 'bookId, warehouseId, quantity requis' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
        await tx.inventory.upsert({
            where: { bookId_warehouseId: { bookId, warehouseId } },
            update: { quantity: { increment: Number(quantity) } },
            create: { bookId, warehouseId, quantity: Number(quantity) },
        })
        await tx.stockMovement.create({
            data: { bookId, toWarehouseId: warehouseId, quantity: Number(quantity), type, note },
        })
    })

    return NextResponse.json({ success: true })
}
