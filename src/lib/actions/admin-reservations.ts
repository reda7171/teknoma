'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from './auth'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.'
}

export async function getReservations() {
    try {
        await verifyAdmin()

        const reservations = await prisma.bookReservation.findMany({
            include: {
                book: {
                    select: {
                        title: true,
                        image: true,
                        author: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: reservations }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
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
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
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
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
    }
}

export async function updateReservationWhatsapp(id: string, whatsapp: string) {
    try {
        await verifyAdmin()

        const normalizedWhatsapp = whatsapp.trim().replace(/[\s().-]/g, '')
        const digitCount = normalizedWhatsapp.replace(/\D/g, '').length

        if (!id.trim()) {
            return { success: false, error: 'Réservation invalide.' }
        }
        if (!/^\+?\d+$/.test(normalizedWhatsapp) || digitCount < 8 || digitCount > 15) {
            return { success: false, error: 'Le numéro doit contenir entre 8 et 15 chiffres.' }
        }

        await prisma.bookReservation.update({
            where: { id },
            data: { whatsapp: normalizedWhatsapp },
        })

        revalidatePath('/[locale]/admin/reservations', 'page')
        return { success: true, whatsapp: normalizedWhatsapp }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
    }
}

type BulkReservationAction = 'PENDING' | 'NOTIFIED' | 'DELETE'

export async function bulkUpdateReservations(ids: string[], action: BulkReservationAction) {
    try {
        await verifyAdmin()

        const uniqueIds = [...new Set(ids.filter(id => typeof id === 'string' && id.trim().length > 0))]
        if (uniqueIds.length === 0) {
            return { success: false, error: 'Aucune réservation sélectionnée.' }
        }

        if (!['PENDING', 'NOTIFIED', 'DELETE'].includes(action)) {
            return { success: false, error: 'Action groupée invalide.' }
        }

        const result = action === 'DELETE'
            ? await prisma.bookReservation.deleteMany({ where: { id: { in: uniqueIds } } })
            : await prisma.bookReservation.updateMany({
                where: { id: { in: uniqueIds } },
                data: { status: action },
            })

        revalidatePath('/[locale]/admin/reservations', 'page')
        return { success: true, count: result.count }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
    }
}
