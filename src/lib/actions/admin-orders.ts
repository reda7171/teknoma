'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { createAuditLog } from './audit'
import { withyouService } from '@/lib/delivery/withyou'
import { sendTelegramMessage } from '@/lib/telegram'

import { OrderStatus } from '@prisma/client'

/**
 * Mettre à jour le statut d'une commande
 * Si RETURNED ou CANCELLED : réintègre le stock des livres
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
        await verifyAdmin()

        // Récupérer la commande avec items pour gérer le stock
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        book: { select: { id: true, title: true } },
                        pack: { include: { books: true } },
                        extraProduct: { select: { id: true, name: true } }
                    }
                }
            }
        })

        if (!order) return { success: false, error: 'Commande introuvable' }

        const prevStatus = order.status
        const isNowReturned = status === 'RETURNED' || status === 'CANCELLED'
        
        // Si le statut précédent est déjà CANCELLED ou RETURNED, le stock a déjà été réintégré.
        // Sinon, le stock avait été décrémenté (lors de la création de la commande), et il faut le réintégrer.
        const wasAlreadyRestored = ['CANCELLED', 'RETURNED'].includes(prevStatus)

        await prisma.$transaction(async (tx) => {
            // Mise à jour statut + historique
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status,
                    statusHistory: {
                        create: {
                            status,
                            comment: `Statut mis à jour manuellement par l'administrateur`,
                            createdBy: 'ADMIN'
                        }
                    }
                }
            })

            // Réintégrer le stock si retour/annulation d'une commande qui avait décrémenté le stock
            if (isNowReturned && !wasAlreadyRestored) {
                for (const item of order.items) {
                    if (item.type === 'BOOK' && item.bookId) {
                        await tx.book.update({
                            where: { id: item.bookId },
                            data: { stock: { increment: item.quantity } }
                        })
                    } else if (item.type === 'ACCESSORY' && item.extraProductId) {
                        await tx.extraProduct.update({
                            where: { id: item.extraProductId },
                            data: { stock: { increment: item.quantity } }
                        })
                    } else if (item.type === 'PACK' && item.pack) {
                        for (const packBook of item.pack.books) {
                            await tx.book.update({
                                where: { id: packBook.bookId },
                                data: { stock: { increment: item.quantity } }
                            })
                        }
                    }
                }
            }

            // Empêcher le double remboursement si on annule depuis RETURNED
            if (status === 'CANCELLED' && prevStatus === 'RETURNED') {
                // Déjà remis en stock, ne rien faire
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        const stockNote = isNowReturned && !wasAlreadyRestored
            ? ` | Stock des produits réintégré (${order.items.length} articles)`
            : ''

        await createAuditLog({
            action: 'UPDATE_STATUS',
            entity: 'ORDER',
            entityId: orderId,
            details: `Statut: ${prevStatus} → ${status}${stockNote}`
        })

        // Notification Telegram si retour
        if (status === 'RETURNED') {
            const msg = `📦 *Retour Commande*\n\n🆔 \`${orderId.slice(0, 8)}\`\n👤 ${order.fullName}\n📱 ${order.phone}\n💰 ${order.total} MAD\n📍 ${order.city}${stockNote}`
            sendTelegramMessage(msg).catch(console.error)
        }

        return {
            success: true,
            message: `Statut mis à jour vers ${status}${stockNote}`
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
 * Modifier les informations d'une commande
 */
export async function updateOrderDetails(orderId: string, data: {
    fullName?: string
    phone?: string
    address?: string
    city?: string
    total?: number
    comment?: string
}) {
    try {
        await verifyAdmin()

        await prisma.order.update({
            where: { id: orderId },
            data: {
                ...data,
                updatedAt: new Date()
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        await createAuditLog({
            action: 'UPDATE_DETAILS',
            entity: 'ORDER',
            entityId: orderId,
            details: `Informations de la commande modifiées par l'administrateur`
        })

        return { success: true }
    } catch (error) {
        console.error('Erreur mise à jour commande:', error)
        return { success: false, error: 'Impossible de modifier la commande' }
    }
}


/**
 * Récupérer toutes les commandes (admin)
 */
export async function getAllOrders() {
    try {
        await verifyAdmin()
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                image: true,
                                price: true,
                            }
                        },
                        pack: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return orders
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error)
        return []
    }
}

/**
 * Récupérer une commande par son ID
 */
export async function getOrderById(orderId: string) {
    try {
        await verifyAdmin()
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                image: true,
                                price: true,
                                costPrice: true,
                            }
                        },
                        pack: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                costPrice: true,
                            }
                        }
                    }
                }
            }
        })

        return order
    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error)
        return null
    }
}

/**
 * Envoyer la commande à WithYou
 */
export async function syncOrderToWithYou(orderId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) throw new Error('Commande introuvable')
        if (order.trackingID) throw new Error('Cette commande a déjà un tracking ID')

        // Préparer les données pour WithYou
        const packageData = {
            villedest: order.city,
            nomdest: order.fullName,
            teldest: order.phone,
            adressedest: order.address,
            prixcolis: order.total.toString(),
            refcolis: order.id,
            observation: `Commande Riwaya #${order.id.slice(0, 8)}`
        }

        // Créer le colis sur WithYou
        const response = await withyouService.createPackage(packageData)

        // On suppose que la réponse renvoie un succès. Si pas de trackingID clair, on utilise l'ID de la commande comme référence
        const trackingID = response?.data?.[0]?.trackingID || response?.trackingID || order.id

        // Mettre à jour la commande locale
        await prisma.order.update({
            where: { id: orderId },
            data: {
                trackingID: trackingID,
                deliveryStatus: 'CREATED',
                deliverySyncAt: new Date(),
                status: 'CONFIRMED' // Automatiquement passer à confirmé si envoyé à livraison
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            trackingID: trackingID,
            message: 'Commande envoyée à WithYou avec succès'
        }
    } catch (error: any) {
        console.error('Erreur Sync WithYou:', error)
        return {
            success: false,
            error: error.message || 'Erreur lors de la synchronisation avec WithYou'
        }
    }
}

/**
 * Envoyer la commande à une société de livraison spécifique (Générique)
 */
export async function syncOrderToShippingCompany(orderId: string, companyId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) throw new Error('Commande introuvable')
        if (order.trackingID) throw new Error('Cette commande a déjà un tracking ID')

        const company = await prisma.shippingCompany.findUnique({
            where: { id: companyId }
        })

        if (!company) throw new Error('Société de livraison introuvable')

        let trackingID = order.id

        const compName = company.name.toLowerCase()

        if (compName.includes('withyou')) {
            const packageData = {
                villedest: order.city,
                nomdest: order.fullName,
                teldest: order.phone,
                adressedest: order.address,
                prixcolis: order.total.toString(),
                refcolis: order.id,
                observation: `Commande Riwaya #${order.id.slice(0, 8)}`
            }

            const response = await withyouService.createPackage(packageData)
            trackingID = response?.data?.[0]?.trackingID || response?.trackingID || order.id
        } else if (compName.includes('olivraison')) {
            const token = company.apiKey || (await prisma.siteSettings.findUnique({ where: { key: 'olivraison_api_key' } }))?.value
            if (!token) throw new Error("Clé API Olivraison manquante")

            const packageData = {
                price: order.total,
                comment: order.comment || `Commande Riwaya #${order.id.slice(0, 8)}`,
                description: `Commande Riwaya #${order.id.slice(0, 8)}`,
                inventory: true,
                name: order.fullName,
                destination: {
                    name: order.fullName,
                    phone: order.phone,
                    city: order.city,
                    streetAddress: order.address
                },
                pickup_address: {
                    streetAddress: "Adresse Riwaya",
                    city: "Ville Riwaya",
                    phone: "0600000000",
                    company: "Riwaya",
                    email: "contact@riwaya.store",
                    website: "https://riwaya.store"
                }
            }

            const res = await fetch(`http://partners.olivraison.com/package`, {
                method: 'POST',
                headers: { 
                    'authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packageData)
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.message || 'Erreur API Olivraison')
            }
            
            const data = await res.json()
            trackingID = data.trackingID || order.id
        } else {
             // throw new Error("Société non supportée pour la création automatique")
             // Pour les autres, on assigne juste le colis à la société
        }

        // Mettre à jour la commande locale
        await prisma.order.update({
            where: { id: orderId },
            data: {
                trackingID: trackingID,
                deliveryStatus: 'CREATED',
                deliverySyncAt: new Date(),
                status: 'CONFIRMED', // Automatiquement passer à confirmé si envoyé à livraison
                shippingCompany: company.id
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            trackingID: trackingID,
            message: `Commande envoyée à ${company.name} avec succès`
        }
    } catch (error: any) {
        console.error('Erreur Sync Livraison:', error)
        return {
            success: false,
            error: error.message || 'Erreur lors de la synchronisation avec la livraison'
        }
    }
}

/**
 * Récupérer le sticker de livraison
 */
export async function getOrderShippingLabel(orderId: string) {
    return { success: false, error: 'La génération d\'étiquettes n\'est pas supportée par l\'API WithYou' }
}

/**
 * Suppression groupée de commandes (Bulk Delete)
 */
export async function bulkDeleteOrders(orderIds: string[]) {
    try {
        await verifyAdmin()

        if (!orderIds || orderIds.length === 0) {
            return {
                success: false,
                error: 'Aucune commande sélectionnée'
            }
        }

        // Supprimer les commandes (les items et l'historique de statut seront supprimés via Cascade ou manuellement si nécessaire)
        // Note: Dans le schéma, OrderItem et OrderStatusHistory doivent avoir onDelete: Cascade sur orderId
        await prisma.order.deleteMany({
            where: {
                id: { in: orderIds }
            }
        })

        revalidatePath('/admin/orders')

        await createAuditLog({
            action: 'BULK_DELETE',
            entity: 'ORDER',
            entityId: 'MULTIPLE',
            details: `Suppression groupée de ${orderIds.length} commandes`
        })

        sendTelegramMessage(`🗑️ *Suppression Massive*\n\n${orderIds.length} commandes ont été supprimées par l'administrateur.\n🕒 ${new Date().toLocaleString('fr-FR')}`).catch(console.error)

        return {
            success: true,
            message: `${orderIds.length} commandes supprimées avec succès`
        }
    } catch (error) {
        console.error('Erreur lors de la suppression groupée des commandes:', error)
        return {
            success: false,
            error: 'Une erreur est survenue lors de la suppression'
        }
    }
}

/**
 * Synchroniser le statut de livraison depuis l'API de la société de livraison
 */
export async function syncDeliveryStatus(orderId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) return { success: false, error: 'Commande introuvable' }
        if (!order.trackingID) return { success: false, error: 'Aucun numéro de suivi pour cette commande' }
        if (!order.shippingCompany) return { success: false, error: 'Aucune société de livraison associée' }

        let newStatus = order.deliveryStatus

        const company = await prisma.shippingCompany.findUnique({ where: { id: order.shippingCompany } })
        if (!company) return { success: false, error: 'Société de livraison non trouvée en base' }

        const compName = company.name.toLowerCase()

        if (compName.includes('withyou')) {
            const res = await withyouService.getStatus([order.trackingID])
            if (Array.isArray(res) && res.length > 0) {
                newStatus = res[0].status || newStatus
            } else if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
                newStatus = res.data[0].status || newStatus
            }
        } else if (compName.includes('olivraison')) {
            const token = company.apiKey || (await prisma.siteSettings.findUnique({ where: { key: 'olivraison_api_key' } }))?.value
            if (token) {
                try {
                    const res = await fetch(`http://partners.olivraison.com/package/${order.trackingID}`, {
                        headers: { 'authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        newStatus = data.status || newStatus
                    }
                } catch (err) {
                    console.error('Erreur API Olivraison', err)
                }
            }
        }

        if (newStatus !== order.deliveryStatus) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    deliveryStatus: newStatus,
                    deliverySyncAt: new Date()
                }
            })
            revalidatePath('/admin/orders')
            revalidatePath(`/admin/orders/${orderId}`)
            return { success: true, status: newStatus, message: 'Statut mis à jour avec succès' }
        }

        return { success: true, status: order.deliveryStatus, message: 'Le statut est déjà à jour' }
    } catch (error: any) {
        console.error('Erreur lors de la synchronisation de la livraison:', error)
        return { success: false, error: error.message || 'Erreur lors de la synchronisation' }
    }
}

export async function bulkSyncDeliveries() {
    try {
        await verifyAdmin()

        const activeOrders = await prisma.order.findMany({
            where: {
                trackingID: { not: null },
                status: {
                    notIn: ['DELIVERED', 'RETURNED', 'CANCELED']
                },
                shippingCompany: { not: null }
            }
        })

        if (activeOrders.length === 0) {
            return { success: true, updatedCount: 0 }
        }

        const companies = await prisma.shippingCompany.findMany({
            where: {
                id: { in: Array.from(new Set(activeOrders.map(o => o.shippingCompany!))) }
            }
        })

        const companyMap = new Map(companies.map(c => [c.id, c.name.toLowerCase()]))
        
        let updatedCount = 0
        const BATCH_SIZE = 50

        const withYouOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('withyou')
        })

        const olivraisonOrders = activeOrders.filter(o => {
            const name = companyMap.get(o.shippingCompany!)
            return name && name.includes('olivraison')
        })

        // WithYou Bulk
        if (withYouOrders.length > 0) {
            for (let i = 0; i < withYouOrders.length; i += BATCH_SIZE) {
                const batch = withYouOrders.slice(i, i + BATCH_SIZE)
                const trackingIds = batch.map(o => o.trackingID!).filter(Boolean)
                
                try {
                    const res = await withyouService.getStatus(trackingIds)
                    let statusArray: any[] = []
                    
                    if (Array.isArray(res)) {
                        statusArray = res
                    } else if (res?.data && Array.isArray(res.data)) {
                        statusArray = res.data
                    }
                    
                    for (const item of statusArray) {
                        const trackingID = item.trackingID || item.trackingId || item.code_tracking
                        const extStatus = item.status || item.statut
                        
                        if (trackingID && extStatus) {
                            const orderToUpdate = batch.find(o => o.trackingID === trackingID)
                            if (orderToUpdate && orderToUpdate.deliveryStatus !== extStatus) {
                                let newInternalStatus = orderToUpdate.status
                                const statusLower = extStatus.toLowerCase()
                                
                                if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                    newInternalStatus = 'DELIVERED'
                                } else if (statusLower.includes('retour') || statusLower.includes('returned')) {
                                    newInternalStatus = 'RETURNED'
                                } else if (statusLower.includes('annul') || statusLower.includes('cancel')) {
                                    newInternalStatus = 'CANCELED'
                                }

                                await prisma.order.update({
                                    where: { id: orderToUpdate.id },
                                    data: {
                                        deliveryStatus: extStatus,
                                        deliverySyncAt: new Date(),
                                        status: newInternalStatus
                                    }
                                })
                                updatedCount++
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur sync bulk WithYou:', error)
                }
            }
        }

        // Olivraison
        if (olivraisonOrders.length > 0) {
            const defaultKey = await prisma.siteSettings.findUnique({ where: { key: 'olivraison_api_key' } })
            
            for (const order of olivraisonOrders) {
                try {
                    const comp = companies.find(c => c.id === order.shippingCompany)
                    const token = comp?.apiKey || defaultKey?.value
                    if (!token) continue

                    const res = await fetch(`http://partners.olivraison.com/package/${order.trackingID}`, {
                        headers: { 'authorization': `Bearer ${token}` }
                    })
                    
                    if (res.ok) {
                        const data = await res.json()
                        const extStatus = data.status
                        if (extStatus && extStatus !== order.deliveryStatus) {
                            let newInternalStatus = order.status
                            const statusLower = extStatus.toLowerCase()
                            
                            if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                newInternalStatus = 'DELIVERED'
                            } else if (statusLower.includes('retour') || statusLower.includes('returned')) {
                                newInternalStatus = 'RETURNED'
                            } else if (statusLower.includes('annul') || statusLower.includes('cancel')) {
                                newInternalStatus = 'CANCELED'
                            }

                            await prisma.order.update({
                                where: { id: order.id },
                                data: {
                                    deliveryStatus: extStatus,
                                    deliverySyncAt: new Date(),
                                    status: newInternalStatus
                                }
                            })
                            updatedCount++
                        }
                    }
                } catch (err) {
                    console.error('Erreur API Olivraison', err)
                }
            }
        }

        revalidatePath('/admin/orders')
        return { success: true, updatedCount }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur inconnue' }
    }
}
