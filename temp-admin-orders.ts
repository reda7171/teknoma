'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { createAuditLog } from './audit'
import { withyouService } from '@/lib/delivery/withyou'
import { sendTelegramMessage } from '@/lib/telegram'

import { OrderStatus } from '@prisma/client'

/**
 * Mettre ├á jour le statut d'une commande
 * Si RETURNED ou CANCELLED : r├®int├¿gre le stock des livres
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
        await verifyAdmin()

        // R├®cup├®rer la commande avec items pour g├®rer le stock
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
        
        // Si le statut pr├®c├®dent est d├®j├á CANCELLED ou RETURNED, le stock a d├®j├á ├®t├® r├®int├®gr├®.
        // Sinon, le stock avait ├®t├® d├®cr├®ment├® (lors de la cr├®ation de la commande), et il faut le r├®int├®grer.
        const wasAlreadyRestored = ['CANCELLED', 'RETURNED'].includes(prevStatus)

        await prisma.$transaction(async (tx) => {
            // Mise ├á jour statut + historique
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status,
                    statusHistory: {
                        create: {
                            status,
                            comment: `Statut mis ├á jour manuellement par l'administrateur`,
                            createdBy: 'ADMIN'
                        }
                    }
                }
            })

            // R├®int├®grer le stock si retour/annulation d'une commande qui avait d├®cr├®ment├® le stock
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

            // Emp├¬cher le double remboursement si on annule depuis RETURNED
            if (status === 'CANCELLED' && prevStatus === 'RETURNED') {
                // D├®j├á remis en stock, ne rien faire
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        const stockNote = isNowReturned && !wasAlreadyRestored
            ? ` | Stock des produits r├®int├®gr├® (${order.items.length} articles)`
            : ''

        await createAuditLog({
            action: 'UPDATE_STATUS',
            entity: 'ORDER',
            entityId: orderId,
            details: `Statut: ${prevStatus} ÔåÆ ${status}${stockNote}`
        })

        // Notification Telegram si retour
        if (status === 'RETURNED') {
            const msg = `­ƒôª *Retour Commande*\n\n­ƒåö \`${orderId.slice(0, 8)}\`\n­ƒæñ ${order.fullName}\n­ƒô▒ ${order.phone}\n­ƒÆ░ ${order.total} MAD\n­ƒôì ${order.city}${stockNote}`
            sendTelegramMessage(msg).catch(console.error)
        }

        return {
            success: true,
            message: `Statut mis ├á jour vers ${status}${stockNote}`
        }
    } catch (error) {
        console.error('Erreur lors de la mise ├á jour du statut:', error)
        return {
            success: false,
            error: 'Impossible de mettre ├á jour le statut'
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
            details: `Informations de la commande modifi├®es par l'administrateur`
        })

        return { success: true }
    } catch (error) {
        console.error('Erreur mise ├á jour commande:', error)
        return { success: false, error: 'Impossible de modifier la commande' }
    }
}


/**
 * R├®cup├®rer toutes les commandes (admin)
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
        console.error('Erreur lors de la r├®cup├®ration des commandes:', error)
        return []
    }
}

/**
 * R├®cup├®rer une commande par son ID
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
        console.error('Erreur lors de la r├®cup├®ration de la commande:', error)
        return null
    }
}

/**
 * Envoyer la commande ├á WithYou
 */
export async function syncOrderToWithYou(orderId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) throw new Error('Commande introuvable')
        if (order.trackingID) throw new Error('Cette commande a d├®j├á un tracking ID')

        // Pr├®parer les donn├®es pour WithYou
        const packageData = {
            villedest: order.city,
            nomdest: order.fullName,
            teldest: order.phone,
            adressedest: order.address,
            prixcolis: order.total.toString(),
            refcolis: order.id,
            observation: `Commande Riwaya #${order.id.slice(0, 8)}`
        }

        // Cr├®er le colis sur WithYou
        const response = await withyouService.createPackage(packageData)

        // On suppose que la r├®ponse renvoie un succ├¿s. Si pas de trackingID clair, on utilise l'ID de la commande comme r├®f├®rence
        const trackingID = response?.data?.[0]?.trackingID || response?.trackingID || order.id

        // Mettre ├á jour la commande locale
        await prisma.order.update({
            where: { id: orderId },
            data: {
                trackingID: trackingID,
                deliveryStatus: 'CREATED',
                deliverySyncAt: new Date(),
                status: 'CONFIRMED' // Automatiquement passer ├á confirm├® si envoy├® ├á livraison
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            trackingID: trackingID,
            message: 'Commande envoy├®e ├á WithYou avec succ├¿s'
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
 * Envoyer la commande ├á une soci├®t├® de livraison sp├®cifique (G├®n├®rique)
 */
export async function syncOrderToShippingCompany(orderId: string, companyId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) throw new Error('Commande introuvable')
        if (order.trackingID) throw new Error('Cette commande a d├®j├á un tracking ID')

        const company = await prisma.shippingCompany.findUnique({
            where: { id: companyId }
        })

        if (!company) throw new Error('Soci├®t├® de livraison introuvable')

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
            if (!token) throw new Error("Cl├® API Olivraison manquante")

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
             // throw new Error("Soci├®t├® non support├®e pour la cr├®ation automatique")
             // Pour les autres, on assigne juste le colis ├á la soci├®t├®
        }

        // Mettre ├á jour la commande locale
        await prisma.order.update({
            where: { id: orderId },
            data: {
                trackingID: trackingID,
                deliveryStatus: 'CREATED',
                deliverySyncAt: new Date(),
                status: 'CONFIRMED', // Automatiquement passer ├á confirm├® si envoy├® ├á livraison
                shippingCompany: company.id
            }
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            trackingID: trackingID,
            message: `Commande envoy├®e ├á ${company.name} avec succ├¿s`
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
 * R├®cup├®rer le sticker de livraison
 */
export async function getOrderShippingLabel(orderId: string) {
    return { success: false, error: 'La g├®n├®ration d\'├®tiquettes n\'est pas support├®e par l\'API WithYou' }
}

/**
 * Suppression group├®e de commandes (Bulk Delete)
 */
export async function bulkDeleteOrders(orderIds: string[]) {
    try {
        await verifyAdmin()

        if (!orderIds || orderIds.length === 0) {
            return {
                success: false,
                error: 'Aucune commande s├®lectionn├®e'
            }
        }

        // Supprimer les commandes (les items et l'historique de statut seront supprim├®s via Cascade ou manuellement si n├®cessaire)
        // Note: Dans le sch├®ma, OrderItem et OrderStatusHistory doivent avoir onDelete: Cascade sur orderId
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
            details: `Suppression group├®e de ${orderIds.length} commandes`
        })

        sendTelegramMessage(`­ƒùæ´©Å *Suppression Massive*\n\n${orderIds.length} commandes ont ├®t├® supprim├®es par l'administrateur.\n­ƒòÆ ${new Date().toLocaleString('fr-FR')}`).catch(console.error)

        return {
            success: true,
            message: `${orderIds.length} commandes supprim├®es avec succ├¿s`
        }
    } catch (error) {
        console.error('Erreur lors de la suppression group├®e des commandes:', error)
        return {
            success: false,
            error: 'Une erreur est survenue lors de la suppression'
        }
    }
}

/**
 * Synchroniser le statut de livraison depuis l'API de la soci├®t├® de livraison
 */
export async function syncDeliveryStatus(orderId: string) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) return { success: false, error: 'Commande introuvable' }
        if (!order.trackingID) return { success: false, error: 'Aucun num├®ro de suivi pour cette commande' }
        if (!order.shippingCompany) return { success: false, error: 'Aucune soci├®t├® de livraison associ├®e' }

        let newStatus = order.deliveryStatus

        const company = await prisma.shippingCompany.findUnique({ where: { id: order.shippingCompany } })
        if (!company) return { success: false, error: 'Soci├®t├® de livraison non trouv├®e en base' }

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
            return { success: true, status: newStatus, message: 'Statut mis ├á jour avec succ├¿s' }
        }

        return { success: true, status: order.deliveryStatus, message: 'Le statut est d├®j├á ├á jour' }
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
