'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin, getAdminUser } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'

export async function getCurrentPosSession() {
    await verifyAdmin()
    
    // Find the latest open session
    const session = await prisma.posSession.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
    })
    
    return session
}

export async function openPosSession(startingFloat: number) {
    await verifyAdmin()
    const adminId = await getAdminUser()
    
    if (!adminId) {
        throw new Error('Utilisateur non trouvé.')
    }
    
    // Check if there is already an open session
    const existing = await prisma.posSession.findFirst({
        where: { status: 'OPEN' }
    })
    
    if (existing) {
        throw new Error('Une session de caisse est déjà ouverte.')
    }
    
    const session = await prisma.posSession.create({
        data: {
            startingFloat,
            status: 'OPEN',
            userId: adminId
        }
    })
    
    revalidatePath('/admin/pos')
    return session
}

export async function closePosSession(sessionId: string, actualCash: number) {
    await verifyAdmin()
    
    const session = await prisma.posSession.findUnique({
        where: { id: sessionId }
    })
    
    if (!session || session.status === 'CLOSED') {
        throw new Error('Session invalide ou déjà clôturée.')
    }
    
    // Calculate expected cash
    // Fetch all cash orders created during this session.
    // In POS, paymentMethod is often 'CASH' or 'ESPÈCES', let's sum all orders where paymentMethod contains 'CASH' or 'ESP' or if all POS orders are cash by default.
    // To be safe, we'll check how POS orders are created. Usually they are created with POS_CASH or CASH.
    
    const posOrders = await prisma.order.findMany({
        where: {
            posSessionId: sessionId,
            status: { not: 'CANCELLED' } 
        }
    })
    
    // We assume all POS orders linked to this session that are not card/transfer are cash.
    // For simplicity, let's assume POS orders are cash unless specified otherwise.
    const totalCashSales = posOrders
        .filter(o => o.paymentMethod.toUpperCase().includes('CASH') || o.paymentMethod.toUpperCase().includes('ESP'))
        .reduce((acc, order) => acc + order.total, 0)
    
    const expectedCash = session.startingFloat + totalCashSales
    const difference = actualCash - expectedCash
    
    const closedSession = await prisma.posSession.update({
        where: { id: sessionId },
        data: {
            actualCash,
            expectedCash,
            difference,
            status: 'CLOSED',
            closedAt: new Date()
        }
    })
    
    revalidatePath('/admin/pos')
    return closedSession
}
