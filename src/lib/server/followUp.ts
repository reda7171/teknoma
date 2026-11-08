import 'server-only'

import { prisma } from '@/lib/prisma'
import { subDays, subHours } from 'date-fns'

export async function getFollowUpData() {
    const now = new Date()

    // 1. Commandes PENDING pour confirmation COD
    // Commandes passées il y a plus de 2 heures mais moins de 7 jours
    const pendingOrders = await prisma.order.findMany({
        where: {
            status: 'PENDING',
            createdAt: {
                lt: subHours(now, 2),
                gt: subDays(now, 7)
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    })

    // 2. Paniers abandonnés
    // Non implémenté dans le schéma pour le moment
    const abandonedCarts: any[] = []

    // 3. Demande d'avis (Commandes DELIVERED)
    // Livrées il y a plus de 3 jours, moins de 15 jours
    const deliveredOrders = await prisma.order.findMany({
        where: {
            status: 'DELIVERED',
            updatedAt: {
                lt: subDays(now, 3),
                gt: subDays(now, 15)
            }
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
    })

    return {
        pendingOrders,
        abandonedCarts,
        deliveredOrders
    }
}

export async function incrementFollowUp(orderId: string) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                followUpCount: { increment: 1 },
                lastFollowUp: new Date()
            }
        })
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2025') {
            return { success: false, error: 'Order not found' }
        }
        console.error('Failed to increment follow-up:', e)
        return { success: false }
    }
}
