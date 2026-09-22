import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET(req: Request) {
    try {
        await verifyAdmin()
    } catch {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = Number(searchParams.get('limit')) || 20

    try {
        const [books, accessories] = await Promise.all([
            prisma.book.findMany({
                where: q ? { title: { contains: q } } : undefined,
                take: limit,
                select: { id: true, title: true }
            }),
            prisma.extraProduct.findMany({
                where: q ? { name: { contains: q } } : undefined,
                take: limit,
                select: { id: true, name: true }
            })
        ])

        const products = [
            ...books.map(b => ({ id: b.id, title: b.title, type: 'BOOK' })),
            ...accessories.map(a => ({ id: a.id, title: a.name, type: 'ACCESSORY' }))
        ].sort((a, b) => a.title.localeCompare(b.title)).slice(0, limit)

        return NextResponse.json(products)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
