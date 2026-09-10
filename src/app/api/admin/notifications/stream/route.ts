import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder()

    let lastOrderId: string | null = null
    let lastCartId: string | null = null
    let lastReviewId: string | null = null
    let lastReturnDate: Date = new Date()

    try {
        const latestOrder = await prisma.order.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        })
        lastOrderId = latestOrder?.id ?? null

        const latestCart = await prisma.abandonedCart.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        })
        lastCartId = latestCart?.id ?? null

        const latestReview = await prisma.review.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        })
        lastReviewId = latestReview?.id ?? null
    } catch {}

    const stream = new ReadableStream({
        start(controller) {
            // Envoyer un ping initial
            controller.enqueue(encoder.encode(`data: {"type":"connected"}\n\n`))

            const interval = setInterval(async () => {
                try {
                    let hasNewData = false

                    // Chercher les nouvelles commandes depuis la dernière connue
                    const whereOrder = lastOrderId
                        ? { createdAt: { gt: (await prisma.order.findUnique({ where: { id: lastOrderId }, select: { createdAt: true } }))?.createdAt } }
                        : {}

                    const newOrders = await prisma.order.findMany({
                        where: whereOrder,
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: { id: true, fullName: true, total: true, city: true, createdAt: true, status: true }
                    })

                    if (newOrders.length > 0) {
                        lastOrderId = newOrders[0].id
                        const payload = JSON.stringify({ type: 'new_orders', orders: newOrders })
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
                        hasNewData = true
                    }

                    // Chercher les nouveaux paniers abandonnés
                    const whereCart = lastCartId
                        ? { createdAt: { gt: (await prisma.abandonedCart.findUnique({ where: { id: lastCartId }, select: { createdAt: true } }))?.createdAt } }
                        : {}

                    const newCarts = await prisma.abandonedCart.findMany({
                        where: whereCart,
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: { id: true, fullName: true, phone: true, total: true, createdAt: true, status: true }
                    })

                    if (newCarts.length > 0) {
                        lastCartId = newCarts[0].id
                        const payload = JSON.stringify({ type: 'new_carts', carts: newCarts })
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
                        hasNewData = true
                    }

                    // Chercher les nouveaux avis
                    const whereReview = lastReviewId
                        ? { createdAt: { gt: (await prisma.review.findUnique({ where: { id: lastReviewId }, select: { createdAt: true } }))?.createdAt } }
                        : {}
                    
                    const newReviews = await prisma.review.findMany({
                        where: whereReview,
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: { id: true, fullName: true, rating: true, createdAt: true }
                    })

                    if (newReviews.length > 0) {
                        lastReviewId = newReviews[0].id
                        const payload = JSON.stringify({ type: 'new_reviews', reviews: newReviews })
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
                        hasNewData = true
                    }

                    // Chercher les retours de commandes récents
                    const newReturns = await prisma.order.findMany({
                        where: { 
                            status: 'RETURNED', 
                            updatedAt: { gt: lastReturnDate }
                        },
                        orderBy: { updatedAt: 'desc' },
                        take: 5,
                        select: { id: true, fullName: true, total: true, city: true, updatedAt: true }
                    })

                    if (newReturns.length > 0) {
                        lastReturnDate = newReturns[0].updatedAt
                        const payload = JSON.stringify({ type: 'returned_orders', orders: newReturns })
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
                        hasNewData = true
                    }

                    if (!hasNewData) {
                        // Ping de maintien
                        controller.enqueue(encoder.encode(`:ping\n\n`))
                    }
                } catch (e) {
                    // Ignorer les erreurs DB temporaires
                }
            }, 15000) // toutes les 15s

            // Nettoyage si le client se déconnecte
            req.signal.addEventListener('abort', () => {
                clearInterval(interval)
                try { controller.close() } catch {}
            })
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    })
}
