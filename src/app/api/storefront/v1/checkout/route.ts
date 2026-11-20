import { NextResponse } from 'next/server'
import { SalesChannel } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createOrder } from '@/lib/actions/orders'

const CheckoutSchema = z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(8).max(20),
    address: z.string().min(5).max(500),
    city: z.string().min(2).max(100),
    comment: z.string().max(1000).optional(),
    items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
})

export async function POST(request: Request) {
    try {
        const input = CheckoutSchema.parse(await request.json())
        const ids = [...new Set(input.items.map((item) => item.productId))]
        const books = await prisma.book.findMany({
            where: { id: { in: ids }, active: true, status: 'APPROVED' },
            select: { id: true, price: true, stock: true },
        })
        if (books.length !== ids.length) return NextResponse.json({ success: false, error: 'Un livre est indisponible.' }, { status: 409 })
        const byId = new Map(books.map((book) => [book.id, book]))
        const items = input.items.map((item) => {
            const book = byId.get(item.productId)!
            if (book.stock < item.quantity) throw new Error('stock_insufficient')
            return { ...item, type: 'BOOK' as const, price: book.price }
        })
        const result = await createOrder({ ...input, items, paymentMethod: 'COD', discount: 0 }, SalesChannel.TEKNO_MA)
        return NextResponse.json(result, { status: result.success ? 201 : 400, headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
        if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: 'Informations de commande invalides.' }, { status: 400 })
        if (error instanceof Error && error.message === 'stock_insufficient') return NextResponse.json({ success: false, error: 'Stock insuffisant pour un des livres.' }, { status: 409 })
        console.error('tekno.ma checkout error:', error)
        return NextResponse.json({ success: false, error: 'Commande indisponible pour le moment.' }, { status: 503 })
    }
}
