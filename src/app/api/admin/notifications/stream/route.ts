import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, hasAdminRole, ORDER_OPERATION_ROLES } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

function errorResponse(error: string, status: 401 | 403 | 500) {
    return NextResponse.json({ error }, { status, headers: PRIVATE_RESPONSE_HEADERS })
}

/**
 * Réponse JSON courte utilisée par le centre de notifications.
 * L'ancien flux SSE gardait plusieurs ReadableStream ouverts (desktop,
 * drawer mobile et topbar), ce qui provoquait des erreurs `failed to pipe`
 * lors des déconnexions et finissait par épuiser la mémoire WASM.
 */
export async function GET(request: NextRequest) {
    try {
        // Authorize before parsing the requested window or reading any customer data.
        // The role is loaded from the database: the admin-role cookie is only a UI hint
        // and must never be trusted for access control.
        const adminUser = await getAuthenticatedAdmin()
        if (!adminUser) {
            return errorResponse('Authentification requise', 401)
        }

        if (!hasAdminRole(adminUser, ORDER_OPERATION_ROLES)) {
            return errorResponse('Acc\u00e8s interdit', 403)
        }

        const requestedSince = request.nextUrl.searchParams.get('since')
        const parsedSince = requestedSince ? new Date(requestedSince) : new Date()
        const since = Number.isNaN(parsedSince.getTime()) ? new Date() : parsedSince
        const now = new Date()

        const [orders, carts, reviews, returnedOrders, reservations] = await Promise.all([
            prisma.order.findMany({
                where: { createdAt: { gt: since, lte: now } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, fullName: true, total: true, city: true, createdAt: true, status: true }
            }),
            prisma.abandonedCart.findMany({
                where: { createdAt: { gt: since, lte: now } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, fullName: true, phone: true, total: true, createdAt: true, status: true }
            }),
            prisma.review.findMany({
                where: { createdAt: { gt: since, lte: now } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, fullName: true, rating: true, createdAt: true }
            }),
            prisma.order.findMany({
                where: { status: 'RETURNED', updatedAt: { gt: since, lte: now } },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, fullName: true, total: true, city: true, updatedAt: true }
            }),
            prisma.bookReservation.findMany({
                where: { createdAt: { gt: since, lte: now } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    whatsapp: true,
                    status: true,
                    createdAt: true,
                    book: { select: { title: true } }
                }
            })
        ])

        const events = [
            ...(orders.length ? [{ type: 'new_orders', orders }] : []),
            ...(carts.length ? [{ type: 'new_carts', carts }] : []),
            ...(reviews.length ? [{ type: 'new_reviews', reviews }] : []),
            ...(returnedOrders.length ? [{ type: 'returned_orders', orders: returnedOrders }] : []),
            ...(reservations.length ? [{ type: 'new_reservations', reservations }] : [])
        ]

        return NextResponse.json(
            { now: now.toISOString(), events },
            { headers: PRIVATE_RESPONSE_HEADERS }
        )
    } catch (error) {
        console.error('[ADMIN NOTIFICATIONS] Polling error:', error)
        return errorResponse('Notifications indisponibles', 500)
    }
}
