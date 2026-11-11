'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { createAuditLog } from '@/lib/server/audit'
import { invalidateCatalogCache } from '@/lib/db/books'
import {
    applyOrderStockDelta,
    isOrderStockRestored,
    setOrderStockRestored,
    setReturnRecoveredFlag,
} from '@/lib/server/order-stock'

export interface ReturnReminder {
    id: string
    trackingID: string | null
    createdAt: Date
    daysSinceOrder: number
    fullName: string
    city: string
    phone: string
    total: number
    shippingCompanyId: string | null
    shippingCompanyName: string
    shippingCompanyPhone: string | null
    whatsappLink: string
    whatsappMessage: string
    isRecovered: boolean | null
}

/**
 * Récupère les commandes marquées en retour créées depuis plus d'une semaine (7 jours)
 */
export async function getPendingReturnReminders(): Promise<ReturnReminder[]> {
    try {
        await verifyAdmin()
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const [orders, companies, recoverySetting] = await Promise.all([
            prisma.order.findMany({
                where: {
                    status: 'RETURNED',
                    createdAt: { lte: oneWeekAgo }
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    trackingID: true,
                    createdAt: true,
                    fullName: true,
                    city: true,
                    phone: true,
                    total: true,
                    shippingCompany: true
                }
            }),
            prisma.shippingCompany.findMany(),
            prisma.siteSettings.findUnique({ where: { key: 'return_recovery_statuses' } })
        ])

        let recoveryStatuses: Record<string, boolean> = {}
        try {
            recoveryStatuses = recoverySetting?.value ? JSON.parse(recoverySetting.value) : {}
        } catch {
            recoveryStatuses = {}
        }

        const companyMap = new Map(companies.map(c => [c.id, c]))

        return orders.map(order => {
            const company = order.shippingCompany ? companyMap.get(order.shippingCompany) : null
            const companyName = company?.name || (order.shippingCompany ? 'Société de livraison' : 'Transporteur')
            const companyPhone = company?.supportPhone?.trim() || null

            const daysSinceOrder = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            const formattedDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })

            const trackingText = order.trackingID ? `N° Suivi : ${order.trackingID}` : `Commande #${order.id.slice(0, 8)}`

            const message = `Bonjour ${companyName},\n\nJe vous contacte concernant le colis en retour de notre commande Riwaya :\n- ${trackingText}\n- Client : ${order.fullName} (${order.city})\n- Date commande : ${formattedDate} (il y a ${daysSinceOrder} jours)\n- Montant : ${order.total} DH\n\nCe colis est marqué en retour depuis plus d'une semaine. Pourriez-vous s'il vous plaît nous confirmer où se trouve le colis et quand il nous sera retourné à notre dépôt ?\n\nMerci d'avance pour votre aide,\nL'équipe Riwaya.`

            let waLink = ''
            if (companyPhone) {
                let clean = companyPhone.replace(/\D/g, '')
                if (clean.startsWith('0')) clean = '212' + clean.slice(1)
                else if (!clean.startsWith('212')) clean = '212' + clean
                waLink = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
            } else {
                waLink = `https://wa.me/?text=${encodeURIComponent(message)}`
            }

            return {
                id: order.id,
                trackingID: order.trackingID,
                createdAt: order.createdAt,
                daysSinceOrder,
                fullName: order.fullName,
                city: order.city,
                phone: order.phone,
                total: order.total,
                shippingCompanyId: company?.id || null,
                shippingCompanyName: companyName,
                shippingCompanyPhone: companyPhone,
                whatsappLink: waLink,
                whatsappMessage: message,
                isRecovered: typeof recoveryStatuses[order.id] === 'boolean' ? recoveryStatuses[order.id] : null
            }
        })
    } catch (error: unknown) {
        if (!(error instanceof Error) || !error.message.includes('Non autorisé')) {
            console.error('Error fetching return reminders:', error)
        }
        return []
    }
}

/**
 * Enregistre si le colis retourné a été physiquement récupéré auprès du transporteur
 * et réintègre (ou annule la réintégration) du stock en conséquence.
 */
export async function updateReturnRecoveryStatus(orderId: string, isRecovered: boolean) {
    try {
        await verifyAdmin(["ADMIN", "MANAGER", "CONFIRMATOR"])

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        pack: { include: { books: true } },
                    },
                },
            },
        })

        if (!order) {
            return { success: false, error: 'Commande introuvable' }
        }

        let stockAction: 'RESTORED' | 'DEDUCTED' | 'NONE' = 'NONE'

        await prisma.$transaction(async (tx) => {
            await setReturnRecoveredFlag(tx, orderId, isRecovered)
            const alreadyRestored = await isOrderStockRestored(tx, orderId)

            if (isRecovered && !alreadyRestored) {
                await applyOrderStockDelta(tx, orderId, order.items, 'RESTORE')
                await setOrderStockRestored(tx, orderId, true)
                await tx.orderStatusHistory.create({
                    data: {
                        orderId,
                        status: order.status,
                        comment: 'Colis retour déclaré récupéré — stock réintégré',
                        createdBy: 'ADMIN',
                    },
                })
                stockAction = 'RESTORED'
            } else if (!isRecovered && alreadyRestored) {
                await applyOrderStockDelta(
                    tx,
                    orderId,
                    order.items,
                    'DEDUCT',
                    `Annulation récupération colis retour #${orderId}`
                )
                await setOrderStockRestored(tx, orderId, false)
                await tx.orderStatusHistory.create({
                    data: {
                        orderId,
                        status: order.status,
                        comment: 'Colis retour déclaré non récupéré — réintégration stock annulée',
                        createdBy: 'ADMIN',
                    },
                })
                stockAction = 'DEDUCTED'
            }
        })

        await createAuditLog({
            action: isRecovered ? 'RETURN_RECOVERED_STOCK' : 'RETURN_UNRECOVERED',
            entity: 'ORDER',
            entityId: orderId,
            details: `Déclaration colis récupéré=${isRecovered} (mouvement stock: ${stockAction})`,
        })

        if (stockAction !== 'NONE') {
            for (const item of order.items) {
                if (item.bookId) await invalidateCatalogCache(item.bookId)
            }
            revalidatePath('/[locale]/books', 'page')
            revalidatePath('/admin/books')
        }
        revalidatePath('/[locale]/admin/orders', 'page')
        revalidatePath('/fr/admin/orders')
        revalidatePath('/ar/admin/orders')
        revalidatePath('/en/admin/orders')
        revalidatePath(`/fr/admin/orders/${orderId}`)
        revalidatePath(`/ar/admin/orders/${orderId}`)
        revalidatePath(`/en/admin/orders/${orderId}`)

        return { success: true, stockAction }
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
}

/**
 * Met à jour le numéro de support WhatsApp de la société de livraison
 */
export async function updateShippingCompanySupportPhone(companyId: string, phone: string) {
    try {
        await verifyAdmin()
        await prisma.shippingCompany.update({
            where: { id: companyId },
            data: { supportPhone: phone }
        })
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
}
