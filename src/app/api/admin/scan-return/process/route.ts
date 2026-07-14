import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/actions/auth'

export async function POST(request: Request) {
    try {
        const isAuth = await isAuthenticated()
        if (!isAuth) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await request.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: "orderId manquant" }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        pack: { include: { books: true } }
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
        }

        if (order.status === 'RETURNED') {
            return NextResponse.json({ error: "Commande déjà retournée" }, { status: 400 })
        }

        // Update status and stock in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update Order status
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'RETURNED' }
            })

            // 2. Add history
            await tx.orderStatusHistory.create({
                data: {
                    orderId: orderId,
                    status: 'RETURNED',
                    comment: 'Retour scanné via Scan Retour (QR)'
                }
            })

            // 3. Impact stock
            for (const item of order.items) {
                if (item.type === 'BOOK' && item.bookId) {
                    await tx.book.update({
                        where: { id: item.bookId },
                        data: { stock: { increment: item.quantity } }
                    })
                } else if (item.type === 'PACK' && item.packId && item.pack) {
                    // Update stock for all books in the pack
                    for (const packBook of item.pack.books) {
                        await tx.book.update({
                            where: { id: packBook.bookId },
                            data: { stock: { increment: item.quantity } }
                        })
                    }
                }
            }
        })

        return NextResponse.json({ success: true, message: "Commande retournée et stock mis à jour." })

    } catch (error) {
        console.error("Erreur scan-return process:", error)
        return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
    }
}
