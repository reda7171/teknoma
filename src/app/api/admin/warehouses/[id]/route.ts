import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    // Désactivation douce
    await prisma.warehouse.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ success: true })
}
