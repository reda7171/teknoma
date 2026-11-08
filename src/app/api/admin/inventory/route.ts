import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookId = searchParams.get('bookId') || undefined
    const extraProductId = searchParams.get('extraProductId') || undefined
    const warehouseId = searchParams.get('warehouseId') || undefined

    const inventory = await prisma.inventory.findMany({
        where: {
            ...(bookId ? { bookId } : {}),
            ...(extraProductId ? { extraProductId } : {}),
            ...(warehouseId ? { warehouseId } : {}),
        },
        include: {
            book: { select: { id: true, title: true, author: true, image: true, stock: true } },
            extraProduct: { select: { id: true, name: true, image: true, stock: true, category: true } },
            warehouse: { select: { id: true, name: true, location: true } },
        } as any,
        orderBy: [{ warehouse: { name: 'asc' } }, { quantity: 'desc' }],
    })

    // If a specific warehouse is selected, we want to ensure ALL products are displayed,
    // even those with 0 stock that don't have an inventory record yet.
    if (warehouseId && !bookId && !extraProductId) {
        const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
        if (warehouse) {
            const [allBooks, allExtra] = await Promise.all([
                prisma.book.findMany({ select: { id: true, title: true, author: true, image: true, stock: true } }),
                prisma.extraProduct.findMany({ select: { id: true, name: true, image: true, stock: true, category: true } })
            ])

            const existingBookIds = new Set(inventory.filter((i: any) => i.bookId).map((i: any) => i.bookId))
            const existingExtraIds = new Set(inventory.filter((i: any) => i.extraProductId).map((i: any) => i.extraProductId))

            const virtualInventory: any[] = []

            for (const b of allBooks) {
                if (!existingBookIds.has(b.id)) {
                    virtualInventory.push({
                        id: `virtual-book-${b.id}`,
                        bookId: b.id,
                        extraProductId: null,
                        warehouseId: warehouse.id,
                        quantity: 0,
                        book: b,
                        extraProduct: null,
                        warehouse: { id: warehouse.id, name: warehouse.name, location: warehouse.location }
                    })
                }
            }

            for (const e of allExtra) {
                if (!existingExtraIds.has(e.id)) {
                    virtualInventory.push({
                        id: `virtual-extra-${e.id}`,
                        bookId: null,
                        extraProductId: e.id,
                        warehouseId: warehouse.id,
                        quantity: 0,
                        book: null,
                        extraProduct: e,
                        warehouse: { id: warehouse.id, name: warehouse.name, location: warehouse.location }
                    })
                }
            }

            return NextResponse.json([...inventory, ...virtualInventory].sort((a, b) => b.quantity - a.quantity))
        }
    }

    return NextResponse.json(inventory)
}

// POST /api/admin/inventory — Ajouter ou ajuster du stock
export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { bookId, extraProductId, warehouseId, quantity, note, type = 'ENTRANCE' } = await req.json()

    if ((!bookId && !extraProductId) || !warehouseId || quantity === undefined) {
        return NextResponse.json({ error: 'bookId ou extraProductId, warehouseId, quantity requis' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
        const whereClause: any = bookId ? { bookId_warehouseId: { bookId, warehouseId } } : { extraProductId_warehouseId: { extraProductId: extraProductId!, warehouseId } }
        const createData: any = bookId ? { bookId, warehouseId, quantity: Number(quantity) } : { extraProductId: extraProductId!, warehouseId, quantity: Number(quantity) }

        await tx.inventory.upsert({
            where: whereClause,
            update: { quantity: { increment: Number(quantity) } },
            create: createData,
        })
        await tx.stockMovement.create({
            data: { bookId, extraProductId, toWarehouseId: warehouseId, quantity: Number(quantity), type, note } as any,
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

    return NextResponse.json({ success: true })
}
