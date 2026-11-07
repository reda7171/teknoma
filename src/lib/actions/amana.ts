'use server'

import { prisma } from '@/lib/prisma'
import { getAmanaTracking, AmanaTrackingResult } from '@/lib/shipping/amana-tracking'

export async function fetchLiveAmanaTracking(orderId: string): Promise<AmanaTrackingResult | null> {
    try {
        if (!orderId) return null

        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { id: orderId },
                    { id: { startsWith: orderId.toLowerCase() } },
                    { trackingID: orderId }
                ]
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                city: true,
                address: true,
                trackingID: true,
                shippingCompany: true,
            }
        })

        if (!order) return null

        return await getAmanaTracking(order)
    } catch (error) {
        console.error('Error fetching live Amana tracking:', error)
        return null
    }
}

