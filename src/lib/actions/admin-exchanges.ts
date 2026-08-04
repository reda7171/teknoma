'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from './auth'

/**
 * Récupérer tous les échanges pour l'admin
 */
export async function getAllExchanges() {
    try {
        await verifyAdmin()
        const exchanges = await (prisma as any).exchange.findMany({
            include: {
                requester: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        city: true,
                    }
                },
                responder: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        city: true,
                    }
                },
                bookRequested: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        condition: true,
                        image: true,
                    }
                },
                bookOffered: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        condition: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return exchanges
    } catch (error) {
        console.error('Erreur lors de la récupération des échanges:', error)
        return []
    }
}

/**
 * Récupérer un échange par ID
 */
export async function getExchangeById(id: string) {
    try {
        await verifyAdmin()
        const exchange = await (prisma as any).exchange.findUnique({
            where: { id },
            include: {
                requester: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        city: true,
                        image: true,
                    }
                },
                responder: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        city: true,
                        image: true,
                    }
                },
                bookRequested: true,
                bookOffered: true,
            }
        })

        return exchange
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'échange:', error)
        return null
    }
}

/**
 * Mettre à jour le statut d'un échange (admin)
 */
export async function updateExchangeStatus(exchangeId: string, status: string) {
    try {
        await verifyAdmin()

        if (status === 'CANCELLED') {
            return await cancelExchange(exchangeId, 'Annulé par administrateur')
        }

        // Si l'échange est complété, marquer les livres comme échangés
        if (status === 'COMPLETED') {
            const exchange = await (prisma as any).exchange.findUnique({
                where: { id: exchangeId }
            })

            if (exchange) {
                if (exchange.bookRequestedId) {
                    await (prisma as any).exchangeBook.update({
                        where: { id: exchange.bookRequestedId },
                        data: { status: 'EXCHANGED' }
                    })
                }

                if (exchange.bookOfferedId) {
                    await (prisma as any).exchangeBook.update({
                        where: { id: exchange.bookOfferedId },
                        data: { status: 'EXCHANGED' }
                    })
                }
            }
        }

        await (prisma as any).exchange.update({
            where: { id: exchangeId },
            data: { status }
        })

        revalidatePath('/admin/exchanges')
        revalidatePath(`/admin/exchanges/${exchangeId}`)

        return {
            success: true,
            message: 'Statut mis à jour avec succès'
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error)
        return {
            success: false,
            error: 'Impossible de mettre à jour le statut'
        }
    }
}

/**
 * Annuler un échange (admin)
 */
export async function cancelExchange(exchangeId: string, reason?: string) {
    try {
        await verifyAdmin()

        const exchange = await (prisma as any).exchange.findUnique({
            where: { id: exchangeId }
        })

        if (!exchange) {
            return { success: false, error: 'Échange introuvable' }
        }

        // Mettre à jour le statut
        await (prisma as any).exchange.update({
            where: { id: exchangeId },
            data: {
                status: 'CANCELLED'
            }
        })

        // Remettre les livres disponibles
        if (exchange.bookRequestedId) {
            await (prisma as any).exchangeBook.update({
                where: { id: exchange.bookRequestedId },
                data: { status: 'AVAILABLE' }
            })
        }

        if (exchange.bookOfferedId) {
            await (prisma as any).exchangeBook.update({
                where: { id: exchange.bookOfferedId },
                data: { status: 'AVAILABLE' }
            })
        }

        revalidatePath('/admin/exchanges')

        return {
            success: true,
            message: 'Échange annulé avec succès'
        }
    } catch (error) {
        console.error('Erreur lors de l\'annulation de l\'échange:', error)
        return {
            success: false,
            error: 'Impossible d\'annuler l\'échange'
        }
    }
}

/**
 * Obtenir les statistiques des échanges
 */
export async function getExchangeStats() {
    try {
        await verifyAdmin()

        const [total, pending, accepted, completed, cancelled] = await Promise.all([
            (prisma as any).exchange.count(),
            (prisma as any).exchange.count({ where: { status: 'PENDING' } }),
            (prisma as any).exchange.count({ where: { status: 'ACCEPTED' } }),
            (prisma as any).exchange.count({ where: { status: 'COMPLETED' } }),
            (prisma as any).exchange.count({ where: { status: 'CANCELLED' } }),
        ])

        return {
            total,
            pending,
            accepted,
            completed,
            cancelled,
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des stats:', error)
        return {
            total: 0,
            pending: 0,
            accepted: 0,
            completed: 0,
            cancelled: 0,
        }
    }
}

/**
 * Créer un échange depuis l'admin
 */
export async function createAdminExchange(data: {
    requesterId: string
    responderId: string
    bookRequestedId: string
    bookOfferedId?: string
    type: 'DIRECT' | 'CREDIT'
    creditsAmount?: number
    message?: string
}) {
    try {
        await verifyAdmin()

        const exchange = await (prisma as any).exchange.create({
            data: {
                ...data,
                status: 'PENDING'
            }
        })

        // Marquer les livres comme PENDING
        await (prisma as any).exchangeBook.update({
            where: { id: data.bookRequestedId },
            data: { status: 'PENDING' }
        })

        if (data.bookOfferedId) {
            await (prisma as any).exchangeBook.update({
                where: { id: data.bookOfferedId },
                data: { status: 'PENDING' }
            })
        }

        revalidatePath('/admin/exchanges')
        return { success: true, id: exchange.id }
    } catch (error: any) {
        console.error('Erreur création échange:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Récupérer les utilisateurs pour le formulaire
 */
export async function getEligibleUsers() {
    try {
        await verifyAdmin()
        return await (prisma as any).user.findMany({
            where: { role: 'USER' },
            select: { id: true, fullName: true, email: true }
        })
    } catch (error) {
        return []
    }
}

/**
 * Récupérer les livres d'un utilisateur
 */
export async function getUserExchangeBooks(userId: string) {
    try {
        await verifyAdmin()
        return await (prisma as any).exchangeBook.findMany({
            where: { ownerId: userId, status: 'AVAILABLE' },
            select: { id: true, title: true, author: true }
        })
    } catch (error) {
        return []
    }
}

/**
 * Supprimer plusieurs échanges (admin bulk delete)
 */
export async function deleteExchanges(exchangeIds: string[]) {
    try {
        await verifyAdmin()

        if (!exchangeIds || exchangeIds.length === 0) {
            return { success: false, error: 'Aucun échange sélectionné' }
        }

        const exchanges = await (prisma as any).exchange.findMany({
            where: { id: { in: exchangeIds } }
        })

        // On remet dispo les livres concernés si ce n'est pas déjà complété
        for (const exchange of exchanges) {
            if (exchange.status !== 'COMPLETED') {
                if (exchange.bookRequestedId) {
                    await (prisma as any).exchangeBook.update({
                        where: { id: exchange.bookRequestedId },
                        data: { status: 'AVAILABLE' }
                    }).catch(() => {})
                }
                if (exchange.bookOfferedId) {
                    await (prisma as any).exchangeBook.update({
                        where: { id: exchange.bookOfferedId },
                        data: { status: 'AVAILABLE' }
                    }).catch(() => {})
                }
            }
        }

        // On supprime les échanges
        await (prisma as any).exchange.deleteMany({
            where: { id: { in: exchangeIds } }
        })

        revalidatePath('/admin/exchanges')
        return { success: true, message: `${exchangeIds.length} échange(s) supprimé(s)` }
    } catch (error) {
        console.error('Erreur lors de la suppression en masse:', error)
        return { success: false, error: 'Impossible de supprimer les échanges' }
    }
}
