import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        try {
            await verifyAdmin()
        } catch {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        const { id } = await params

        // Mettre à zéro l'inventaire
        await prisma.inventory.updateMany({
            where: { warehouseId: id },
            data: { quantity: 0 }
        });

        // Recalculer le stock pour tous les livres
        const books = await prisma.book.findMany({
            select: { id: true, stock: true, inventories: { select: { quantity: true, warehouse: { select: { active: true } } } } }
        });

        for (const book of books) {
            const total = book.inventories.filter(i => i.warehouse.active).reduce((sum, i) => sum + i.quantity, 0);
            if (book.stock !== total) {
                await prisma.book.update({ where: { id: book.id }, data: { stock: total } });
            }
        }

        return NextResponse.json({ success: true, message: 'Stock réinitialisé' })
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du stock:', error)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
