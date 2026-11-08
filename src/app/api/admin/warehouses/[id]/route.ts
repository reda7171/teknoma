import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const data = await req.json()

    const warehouse = await prisma.warehouse.update({ where: { id }, data })
    return NextResponse.json(warehouse)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Suppression complète (Hard delete) avec suppression en cascade manuelle
    await prisma.$transaction([
        prisma.inventory.deleteMany({ where: { warehouseId: id } }),
        prisma.stockMovement.deleteMany({ where: { toWarehouseId: id } }),
        prisma.stockMovement.deleteMany({ where: { fromWarehouseId: id } }),
        prisma.warehouse.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
}
