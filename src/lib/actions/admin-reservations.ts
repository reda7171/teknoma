'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from './auth'

export async function getReservations() {
    try {
        await verifyAdmin()

        const reservations = await prisma.bookReservation.findMany({
            include: {
                book: {
                    select: {
                        title: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: reservations }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateReservationStatus(id: string, status: string) {
    try {
        await verifyAdmin()

        await prisma.bookReservation.update({
            where: { id },
            data: { status }
        })
        revalidatePath('/[locale]/admin/reservations', 'page')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteReservation(id: string) {
    try {
        await verifyAdmin()

        await prisma.bookReservation.delete({
            where: { id }
        })
        revalidatePath('/[locale]/admin/reservations', 'page')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
