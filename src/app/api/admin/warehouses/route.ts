import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(warehouses)
}

export async function POST(req: Request) {
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
