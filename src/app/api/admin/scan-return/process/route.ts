import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, hasAdminRole, ORDER_OPERATION_ROLES } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'
import { invalidateCatalogCache } from '@/lib/db/books'
import { createAuditLog } from '@/lib/server/audit'
import {
    applyOrderStockDelta,
    getJsonBooleanMap,
    isOrderStockRestored,
    RECOVERY_STATUSES_KEY,
    setOrderStockRestored,
    setReturnRecoveredFlag,
} from '@/lib/server/order-stock'

export async function POST(request: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","CONFIRMATOR"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ORDER_OPERATION_ROLES)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

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

        const recoveryMap = await getJsonBooleanMap(prisma, RECOVERY_STATUSES_KEY)
        if (order.status === 'RETURNED' && recoveryMap[order.id] === true) {
            return NextResponse.json({ error: "Ce colis retour a déjà été scanné et récupéré." }, { status: 400 })
        }

        let stockRestoredNow = false

        // Scan physique QR au dépôt = retour + colis récupéré + réintégration stock idempotente
        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'RETURNED' }
            })

            await setReturnRecoveredFlag(tx, orderId, true)

            const alreadyRestored = await isOrderStockRestored(tx, orderId)
            if (!alreadyRestored) {
                await applyOrderStockDelta(tx, orderId, order.items, 'RESTORE')
                await setOrderStockRestored(tx, orderId, true)
                stockRestoredNow = true
            }

            await tx.orderStatusHistory.create({
                data: {
                    orderId: orderId,
                    status: 'RETURNED',
                    comment: stockRestoredNow
                        ? 'Colis retour scanné et récupéré au dépôt (QR) — stock réintégré'
                        : 'Colis retour scanné et déclaré récupéré au dépôt (QR)',
                    createdBy: admin.email || 'ADMIN'
                }
            })
        })

        await createAuditLog({
            action: 'SCAN_RETURN_RECOVERED',
            entity: 'ORDER',
            entityId: orderId,
            details: `Scan QR colis récupéré (stock réintégré: ${stockRestoredNow})`
        })

        if (stockRestoredNow) {
            for (const item of order.items) {
                if (item.bookId) await invalidateCatalogCache(item.bookId)
            }
            revalidatePath('/[locale]/books', 'page')
            revalidatePath('/admin/books')
        }
        revalidatePath('/[locale]/admin/orders', 'page')
        revalidatePath(`/fr/admin/orders/${orderId}`)

        return NextResponse.json({
            success: true,
            message: stockRestoredNow
                ? "Colis déclaré récupéré et stock réintégré."
                : "Colis déclaré récupéré (le stock était déjà réintégré)."
        })

    } catch (error) {
        console.error("Erreur scan-return process:", error)
        return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
    }
}
