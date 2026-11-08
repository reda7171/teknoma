import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { stocks: true } },
            movementsFrom: {
                where: { type: 'EXIT' },
                select: { id: true }
            }
        }
    })
    return NextResponse.json(warehouses)
}

export async function POST(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { name, location } = await req.json()
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const warehouse = await prisma.warehouse.create({ data: { name, location } })
    return NextResponse.json(warehouse, { status: 201 })
}
