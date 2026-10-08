'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { createAuditLog } from './audit'
import { withyouService } from '@/lib/delivery/withyou'
import { normalizeCityForCarrier } from '@/lib/constants/cities'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

import { OrderStatus } from '@prisma/client'

/**
 * Mettre à jour le statut d'une commande
 * Si RETURNED ou CANCELLED : réintègre le stock des livres
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, options?: { skipSyncToProvider?: boolean, historyComment?: string }) {
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
            // Récupérer la compagnie de livraison
            const company = order.shippingCompany ? await tx.shippingCompany.findUnique({ where: { id: order.shippingCompany } }) : null;

            // Mise à jour statut + historique
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status,
                    statusHistory: {
                        create: {
                            status,
                            comment: options?.historyComment || `Statut mis à jour manuellement par l'administrateur`,
                            createdBy: 'ADMIN'
                        }
                    }
                }
            })

            // Push status to WithYou if applicable
            if (!options?.skipSyncToProvider && company?.name.toLowerCase().includes('withyou') && order.trackingID) {
                let wyStatus = status.toLowerCase()
                if (status === 'DELIVERED') wyStatus = 'livrer'
                if (status === 'SHIPPED') wyStatus = 'expedier'
                if (status === 'RETURNED') wyStatus = 'retour'
                if (status === 'CANCELLED') wyStatus = 'annuler'

                try {
                    await withyouService.updateStatus(order.trackingID, wyStatus)
                } catch (err) {
                    console.error('Failed to sync status to WithYou:', err)
                }
            }

            // Réintégrer le stock si retour/annulation d'une commande qui avait décrémenté le stock
            if (isNowReturned && !wasAlreadyRestored) {
                for (const item of order.items) {
                    if (item.type === 'BOOK' && item.bookId) {
                        await tx.book.updateMany({
                            where: { id: item.bookId },
                            data: { stock: { increment: item.quantity } }
                        })
                    } else if (item.type === 'ACCESSORY' && item.extraProductId) {
                        await tx.extraProduct.updateMany({
                            where: { id: item.extraProductId },
                            data: { stock: { increment: item.quantity } }
                        })
                    } else if (item.type === 'PACK' && item.pack) {
                        for (const packBook of item.pack.books) {
                            await tx.book.updateMany({
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

        revalidatePath('/[locale]/admin/orders', 'page')
        revalidatePath('/fr/admin/orders')
        revalidatePath('/ar/admin/orders')
        revalidatePath('/en/admin/orders')
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
            const msg = `📦 *Retour Commande*\n\n🆔 \`${orderId.slice(0, 8)}\`\n👤 ${order.fullName}\n📱 ${order.phone}\n💰 ${order.total} درهم\n📍 ${order.city}${stockNote}`
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
export async function updateOrderDetails(orderId: string, data: any) {
    try {
        await verifyAdmin()

        const cleanData = { ...data }
        if (cleanData.shippingFees === null) cleanData.shippingFees = 0
        if (cleanData.total === null) cleanData.total = 0

        await prisma.order.update({
            where: { id: orderId },
            data: {
                ...cleanData,
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
 * Modifier manuellement le Tracking ID (Code Colis) d'une commande
 */
export async function updateOrderTrackingId(orderId: string, trackingID: string, shippingCompanyId?: string) {
    try {
        await verifyAdmin()

        const dataToUpdate: any = { trackingID }
        if (shippingCompanyId) {
            dataToUpdate.shippingCompany = shippingCompanyId
        }

        await prisma.order.update({
            where: { id: orderId },
            data: dataToUpdate
        })
        revalidatePath(`/admin/orders/${orderId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Basculer l'état de paiement d'une commande
 */
export async function togglePaymentStatus(orderId: string, isPaid: boolean, expenseId?: string | null) {
    try {
        await verifyAdmin()

        const data: any = { isPaid }
        if (expenseId !== undefined) {
            data.expenseId = expenseId
        }

        await prisma.order.update({
            where: { id: orderId },
            data
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        const details = isPaid
            ? `Statut de paiement modifié vers: Payé${expenseId ? ` (Lié à une facture)` : ''}`
            : `Statut de paiement modifié vers: Non payé`

        await createAuditLog({
            action: 'UPDATE_DETAILS',
            entity: 'ORDER',
            entityId: orderId,
            details
        })

        return { success: true }
    } catch (error: any) {
        return { success: false, error: 'Impossible de modifier le statut de paiement' }
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
                        },
                        extraProduct: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
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
                                stockMovements: {
                                    where: {
                                        type: 'EXIT',
                                        note: { contains: orderId }
                                    },
                                    include: {
                                        fromWarehouse: { select: { id: true, name: true } }
                                    },
                                    take: 1
                                }
                            }
                        },
                        pack: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                costPrice: true,
                                image: true,
                            }
                        },
                        extraProduct: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                costPrice: true,
                                image: true,
                                category: true,
                                stockMovements: {
                                    where: {
                                        type: 'EXIT',
                                        note: { contains: orderId }
                                    },
                                    include: {
                                        fromWarehouse: { select: { id: true, name: true } }
                                    },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        })

        return order
    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', orderId, error)
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

        const cleanPhone = (order.phone || '').replace(/[^0-9]/g, '')
        const formattedPhone = cleanPhone.startsWith('212') ? '0' + cleanPhone.slice(3) : cleanPhone
        const normalizedCity = normalizeCityForCarrier(order.city)

        // Préparer les données pour WithYou
        const packageData = {
            villedest: normalizedCity,
            nomdest: order.fullName,
            teldest: formattedPhone || order.phone,
            adressedest: order.address,
            prixcolis: order.total.toString(),
            refcolis: `RW-${order.id.slice(0, 8)}`,
            observation: `Commande Riwaya #${order.id.slice(0, 8)}`
        }

        // Créer le colis sur WithYou
        let trackingID = order.id
        let syncWarning: string | null = null

        try {
            const response = await withyouService.createPackage(packageData)
            trackingID = response?.tracking_number || response?.data?.[0]?.trackingID || response?.trackingID || order.id
        } catch (apiErr: any) {
            console.warn('[WithYou] API error in syncOrderToWithYou:', apiErr.message)
            syncWarning = apiErr.message
        }

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
            message: syncWarning 
                ? `Commande assignée à WithYou (Attention: ${syncWarning})`
                : 'Commande envoyée à WithYou avec succès'
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
        let syncWarning: string | null = null

        if (compName.includes('withyou')) {
            const cleanPhone = (order.phone || '').replace(/[^0-9]/g, '')
            const formattedPhone = cleanPhone.startsWith('212') ? '0' + cleanPhone.slice(3) : cleanPhone
            const normalizedCity = normalizeCityForCarrier(order.city)

            const packageData = {
                villedest: normalizedCity,
                nomdest: order.fullName,
                teldest: formattedPhone || order.phone,
                adressedest: order.address,
                prixcolis: order.total.toString(),
                refcolis: `RW-${order.id.slice(0, 8)}`,
                observation: `Commande Riwaya #${order.id.slice(0, 8)}`
            }

            try {
                const response = await withyouService.createPackage(packageData)
                trackingID = response?.tracking_number || response?.data?.[0]?.trackingID || response?.trackingID || order.id
            } catch (apiErr: any) {
                console.warn('[WithYou] API sync warning:', apiErr.message)
                syncWarning = apiErr.message
            }
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
            message: syncWarning 
                ? `Commande assignée à ${company.name} (Attention: ${syncWarning})`
                : `Commande envoyée à ${company.name} avec succès`
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

        // Conserver les informations avant la suppression en cascade des articles.
        const ordersToDelete = await prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
                id: true,
                fullName: true,
                total: true,
                items: {
                    select: {
                        type: true,
                        quantity: true,
                        price: true,
                        book: { select: { title: true, sellerSku: true } },
                        pack: { select: { name: true, sellerSku: true } },
                        gift: { select: { name: true } },
                        digitalProduct: { select: { title: true } },
                        extraProduct: { select: { name: true, sellerSku: true } }
                    }
                }
            }
        })

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

        const detailLines: string[] = []
        for (const order of ordersToDelete) {
            detailLines.push(
                `\n🧾 <b>Commande #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</b>`,
                `👤 ${escapeHtml(order.fullName)}`,
                `💰 Total : <b>${order.total.toFixed(2)} MAD</b>`,
                `📦 Articles (${order.items.length}) :`
            )

            if (order.items.length === 0) {
                detailLines.push('  • Aucun article enregistré')
                continue
            }

            for (const item of order.items) {
                const name = item.book?.title
                    || item.pack?.name
                    || item.extraProduct?.name
                    || item.digitalProduct?.title
                    || item.gift?.name
                    || 'Article inconnu'
                const sellerSku = item.book?.sellerSku || item.pack?.sellerSku || item.extraProduct?.sellerSku
                const skuText = sellerSku ? ` | SKU : <code>${escapeHtml(sellerSku)}</code>` : ''
                const lineTotal = item.price * item.quantity
                detailLines.push(
                    `  • <b>${item.quantity}× ${escapeHtml(name)}</b>${skuText}\n` +
                    `    Type : ${escapeHtml(item.type)} | ${item.price.toFixed(2)} MAD/u | Total : ${lineTotal.toFixed(2)} MAD`
                )
            }
        }

        const header = `🗑️ <b>Suppression Massive</b>\n\n${ordersToDelete.length} commande(s) supprimée(s) par l’administrateur.\n`
        const footer = `\n🕒 ${new Date().toLocaleString('fr-FR')}`
        const telegramMessages: string[] = []
        let currentMessage = header

        for (const line of detailLines) {
            if (`${currentMessage}\n${line}${footer}`.length > 3800) {
                telegramMessages.push(`${currentMessage}${footer}`)
                currentMessage = `${header}\n${line}`
            } else {
                currentMessage += `\n${line}`
            }
        }
        telegramMessages.push(`${currentMessage}${footer}`)

        Promise.all(telegramMessages.map(message => sendTelegramMessage(message))).catch(console.error)

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

        let mappedInternalStatus = order.status
        const sLower = (newStatus || '').toLowerCase()
        if (sLower.includes('livr') || sLower.includes('delivered')) {
            mappedInternalStatus = 'DELIVERED'
        } else if (sLower.includes('retour') || sLower.includes('returned') || sLower.includes('refus')) {
            mappedInternalStatus = 'RETURNED'
        } else if (sLower.includes('annul') || sLower.includes('cancel') || sLower.includes('interess')) {
            mappedInternalStatus = 'CANCELLED'
        } else if (sLower.includes('expedi') || sLower.includes('shipped') || (sLower.includes('ramass') && !sLower.includes('attente'))) {
            mappedInternalStatus = 'SHIPPED'
        } else if (sLower.includes('transit') || sLower.includes('chemin') || sLower.includes('report') || sLower.includes('programm')) {
            mappedInternalStatus = 'IN_TRANSIT'
        }

        if (newStatus !== order.deliveryStatus || mappedInternalStatus !== order.status) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    deliveryStatus: newStatus,
                    deliverySyncAt: new Date()
                }
            })

            if (mappedInternalStatus !== order.status) {
                await updateOrderStatus(orderId, mappedInternalStatus, {
                    skipSyncToProvider: true,
                    historyComment: `Statut synchronisé depuis le transporteur: ${newStatus}`
                })
            }

            revalidatePath('/[locale]/admin/orders', 'page')
            revalidatePath('/fr/admin/orders')
            revalidatePath('/ar/admin/orders')
            revalidatePath('/en/admin/orders')
            revalidatePath('/admin/orders')
            revalidatePath(`/fr/admin/orders/${orderId}`)
            revalidatePath(`/ar/admin/orders/${orderId}`)
            revalidatePath(`/admin/orders/${orderId}`)
            return { success: true, status: newStatus, internalStatus: mappedInternalStatus, message: 'Statut mis à jour avec succès' }
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
                shippingCompany: { not: null },
                OR: [
                    { status: { notIn: ['DELIVERED'] } },
                    { deliveryStatus: null },
                    { deliveryStatus: { notIn: ['Livrer', 'Livre', 'Livré', 'DELIVERED'] } }
                ]
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

        const companyMap = new Map<string, string>(companies.map(c => [c.id, c.name.toLowerCase()]))

        const updatedOrders: any[] = []
        const syncErrors: string[] = []
        let inspectedCount = 0
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
                const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
                const trackingIds = batch.map(o => o.trackingID!).filter(id => Boolean(id) && !isUuid(id))
                if (trackingIds.length === 0) continue

                try {
                    const res = await withyouService.getStatus(trackingIds)
                    let statusArray: any[] = []

                    if (Array.isArray(res)) {
                        statusArray = res
                    } else if (res?.data && Array.isArray(res.data)) {
                        statusArray = res.data
                    } else if (res?.data?.data && Array.isArray(res.data.data)) {
                        statusArray = res.data.data
                    } else if (res?.result && Array.isArray(res.result)) {
                        statusArray = res.result
                    } else if (res?.colis && Array.isArray(res.colis)) {
                        statusArray = res.colis
                    }

                    if (statusArray.length === 0) {
                        syncErrors.push(`WithYou: aucun statut retourné pour ${trackingIds.length} colis`)
                    }

                    for (const item of statusArray) {
                        const rawTrackingID = item.code_tracking || item.codetracking || item.trackingID || item.trackingId || item.numero || item.id
                        const trackingID = rawTrackingID == null ? '' : String(rawTrackingID).trim()
                        const extStatusRaw = item.status || item.statut
                        let extStatus = ''
                        if (typeof extStatusRaw === 'object' && extStatusRaw !== null) {
                            extStatus = extStatusRaw.code || extStatusRaw.label || extStatusRaw.statut || JSON.stringify(extStatusRaw)
                        } else {
                            extStatus = String(extStatusRaw || '')
                        }

                        if (trackingID && extStatus) {
                            const orderToUpdate = batch.find(o => String(o.trackingID).trim() === trackingID)
                            if (orderToUpdate) {
                                inspectedCount++
                                let newInternalStatus = orderToUpdate.status
                                const statusLower = extStatus.toLowerCase()

                                if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                    newInternalStatus = 'DELIVERED'
                                } else if (statusLower.includes('retour') || statusLower.includes('returned') || statusLower.includes('refus')) {
                                    newInternalStatus = 'RETURNED'
                                } else if (statusLower.includes('annul') || statusLower.includes('cancel') || statusLower.includes('interess')) {
                                    newInternalStatus = 'CANCELLED'
                                } else if (statusLower.includes('expedi') || statusLower.includes('shipped') || (statusLower.includes('ramass') && !statusLower.includes('attente'))) {
                                    newInternalStatus = 'SHIPPED'
                                } else if (statusLower.includes('transit') || statusLower.includes('chemin') || statusLower.includes('report') || statusLower.includes('programm')) {
                                    newInternalStatus = 'IN_TRANSIT'
                                }

                                if (orderToUpdate.deliveryStatus !== extStatus || orderToUpdate.status !== newInternalStatus) {

                                // Mettre à jour en base le "deliveryStatus"
                                await prisma.order.update({
                                    where: { id: orderToUpdate.id },
                                    data: {
                                        deliveryStatus: extStatus,
                                        deliverySyncAt: new Date()
                                    }
                                })

                                // Si le statut interne change, on utilise updateOrderStatus pour gérer le stock
                                if (newInternalStatus !== orderToUpdate.status) {
                                    await updateOrderStatus(orderToUpdate.id, newInternalStatus, {
                                        skipSyncToProvider: true,
                                        historyComment: `Statut synchronisé depuis le transporteur: ${extStatus}`
                                    })
                                }
                                updatedOrders.push({
                                    id: orderToUpdate.id,
                                    trackingID: trackingID,
                                    fullName: orderToUpdate.fullName,
                                    oldStatus: orderToUpdate.status,
                                    newStatus: newInternalStatus,
                                    deliveryStatus: extStatus,
                                    phone: orderToUpdate.phone,
                                    city: orderToUpdate.city,
                                    company: 'WithYou'
                                })
                                }
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('Erreur sync bulk WithYou:', error)
                    syncErrors.push(`WithYou: ${error.message}`)
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
                        inspectedCount++
                        const extStatusRaw = data.status
                        let extStatus = ''
                        if (typeof extStatusRaw === 'object' && extStatusRaw !== null) {
                            extStatus = extStatusRaw.code || extStatusRaw.label || extStatusRaw.statut || JSON.stringify(extStatusRaw)
                        } else {
                            extStatus = String(extStatusRaw || '')
                        }

                        if (extStatus && extStatus !== order.deliveryStatus) {
                            let newInternalStatus = order.status
                            const statusLower = extStatus.toLowerCase()

                            if (statusLower.includes('livr') || statusLower.includes('delivered')) {
                                newInternalStatus = 'DELIVERED'
                            } else if (statusLower.includes('retour') || statusLower.includes('returned')) {
                                newInternalStatus = 'RETURNED'
                            } else if (statusLower.includes('annul') || statusLower.includes('cancel')) {
                                newInternalStatus = 'CANCELLED'
                            }

                            // Mettre à jour en base le "deliveryStatus"
                            await prisma.order.update({
                                where: { id: order.id },
                                data: {
                                    deliveryStatus: extStatus,
                                    deliverySyncAt: new Date()
                                }
                            })

                            // Si le statut interne change, on utilise updateOrderStatus pour gérer le stock
                            if (newInternalStatus !== order.status) {
                                await updateOrderStatus(order.id, newInternalStatus, {
                                    skipSyncToProvider: true,
                                    historyComment: `Statut synchronisé depuis le transporteur: ${extStatus}`
                                })
                            }
                            updatedOrders.push({
                                id: order.id,
                                trackingID: order.trackingID,
                                fullName: order.fullName,
                                oldStatus: order.status,
                                newStatus: newInternalStatus,
                                deliveryStatus: extStatus,
                                phone: order.phone,
                                city: order.city,
                                company: 'Olivraison'
                            })
                        }
                    } else {
                        syncErrors.push(`Olivraison ${order.trackingID}: HTTP ${res.status}`)
                    }
                } catch (err) {
                    console.error('Erreur API Olivraison', err)
                    syncErrors.push(`Olivraison ${order.trackingID}: API inaccessible`)
                }
            }
        }

        revalidatePath('/[locale]/admin/orders', 'page')
        revalidatePath('/fr/admin/orders')
        revalidatePath('/ar/admin/orders')
        revalidatePath('/en/admin/orders')
        revalidatePath('/admin/orders')
        if (syncErrors.length > 0 && inspectedCount === 0 && updatedOrders.length === 0) {
            return {
                success: false,
                error: syncErrors.join('\n'),
                updatedCount: 0,
                updatedOrders: []
            }
        }

        return {
            success: true,
            updatedCount: updatedOrders.length,
            inspectedCount,
            updatedOrders,
            errors: syncErrors.length > 0 ? syncErrors : undefined
        }
    } catch (error: any) {
        return { success: false, error: error.message || 'Erreur inconnue' }
    }
}



/**
 * Mettre à jour les articles d'une commande (Edition dynamique)
 */
export async function updateOrderItems(orderId: string, items: {
    id?: string;
    type: 'BOOK' | 'PACK' | 'ACCESSORY';
    productId: string;
    quantity: number;
    price: number;
}[]) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) {
            throw new Error('Commande introuvable')
        }

        // Si la commande n'a pas un statut qui a décrémenté le stock, on n'impacte pas le stock
        // Habituellement, toute commande non annulée a décrémenté le stock à la création.
        // Si elle est "RETURNED" ou "CANCELED" ou "CANCELLED", le stock a déjà été réintégré.
        const isCanceledOrReturned = (order.status as string) === 'CANCELLED' || order.status === 'RETURNED'
        const impactsStock = !isCanceledOrReturned

        let newSubtotal = 0

        // Transaction pour assurer la cohérence
        await prisma.$transaction(async (tx) => {
            // 1. Pour chaque ancien item, on regarde s'il est supprimé ou modifié
            for (const oldItem of order.items) {
                const newItem = items.find(i => i.id === oldItem.id)

                if (!newItem) {
                    // Item supprimé
                    if (impactsStock) {
                        if (oldItem.type === 'BOOK' && oldItem.bookId) {
                            await tx.book.updateMany({
                                where: { id: oldItem.bookId },
                                data: { stock: { increment: oldItem.quantity } }
                            })
                        } else if (oldItem.type === 'PACK' && oldItem.packId) {
                            const packBooks = await tx.packBook.findMany({ where: { packId: oldItem.packId } })
                            for (const pb of packBooks) {
                                await tx.book.updateMany({
                                    where: { id: pb.bookId },
                                    data: { stock: { increment: oldItem.quantity } }
                                })
                            }
                        } else if (oldItem.type === 'ACCESSORY' && oldItem.extraProductId) {
                            await tx.extraProduct.updateMany({
                                where: { id: oldItem.extraProductId },
                                data: { stock: { increment: oldItem.quantity } }
                            })
                        }
                    }
                    await tx.orderItem.delete({ where: { id: oldItem.id } })
                } else {
                    // Item modifié (changement de quantité)
                    const diff = newItem.quantity - oldItem.quantity
                    if (diff !== 0 && impactsStock) {
                        if (oldItem.type === 'BOOK' && oldItem.bookId) {
                            await tx.book.updateMany({
                                where: { id: oldItem.bookId },
                                data: { stock: { decrement: diff } }
                            })
                        } else if (oldItem.type === 'PACK' && oldItem.packId) {
                            const packBooks = await tx.packBook.findMany({ where: { packId: oldItem.packId } })
                            for (const pb of packBooks) {
                                await tx.book.updateMany({
                                    where: { id: pb.bookId },
                                    data: { stock: { decrement: diff } }
                                })
                            }
                        } else if (oldItem.type === 'ACCESSORY' && oldItem.extraProductId) {
                            await tx.extraProduct.updateMany({
                                where: { id: oldItem.extraProductId },
                                data: { stock: { decrement: diff } }
                            })
                        }
                    }

                    // Calculer le prix
                    newSubtotal += newItem.price * newItem.quantity

                    await tx.orderItem.update({
                        where: { id: oldItem.id },
                        data: {
                            quantity: newItem.quantity,
                            price: newItem.price,
                        }
                    })
                }
            }

            // 2. Pour chaque nouvel item, on l'ajoute
            for (const newItem of items.filter(i => !i.id)) {
                let costPrice = 0
                if (newItem.type === 'BOOK') {
                    const book = await tx.book.findUnique({ where: { id: newItem.productId } })
                    if (book) {
                        costPrice = book.costPrice
                        if (impactsStock) {
                            await tx.book.updateMany({
                                where: { id: newItem.productId },
                                data: { stock: { decrement: newItem.quantity } }
                            })
                        }
                    }
                } else if (newItem.type === 'PACK') {
                    const pack = await tx.pack.findUnique({ where: { id: newItem.productId } })
                    if (pack) {
                        costPrice = pack.costPrice
                        if (impactsStock) {
                            const packBooks = await tx.packBook.findMany({ where: { packId: newItem.productId } })
                            for (const pb of packBooks) {
                                await tx.book.updateMany({
                                    where: { id: pb.bookId },
                                    data: { stock: { decrement: newItem.quantity } }
                                })
                            }
                        }
                    }
                } else if (newItem.type === 'ACCESSORY') {
                    const accessory = await tx.extraProduct.findUnique({ where: { id: newItem.productId } })
                    if (accessory) {
                        costPrice = accessory.costPrice
                        if (impactsStock) {
                            await tx.extraProduct.updateMany({
                                where: { id: newItem.productId },
                                data: { stock: { decrement: newItem.quantity } }
                            })
                        }
                    }
                }

                newSubtotal += newItem.price * newItem.quantity

                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        type: newItem.type as any,
                        quantity: newItem.quantity,
                        price: newItem.price,
                        costPrice: costPrice,
                        bookId: newItem.type === 'BOOK' ? newItem.productId : null,
                        packId: newItem.type === 'PACK' ? newItem.productId : null,
                        extraProductId: newItem.type === 'ACCESSORY' ? newItem.productId : null
                    }
                })
            }

            // 3. Mettre à jour la commande
            const newTotal = newSubtotal + order.shippingFees - order.discount
            await tx.order.update({
                where: { id: order.id },
                data: {
                    subtotal: newSubtotal,
                    total: newTotal,
                    updatedAt: new Date()
                }
            })

            // 4. Historique
            await tx.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    status: order.status,
                    comment: "Modification des articles et quantités de la commande",
                    createdBy: "ADMIN"
                }
            })

            // Log global
            await tx.auditLog.create({
                data: {
                    action: 'UPDATE_ITEMS',
                    entity: 'ORDER',
                    entityId: order.id,
                    details: `Mise à jour des articles. Nouveau total: ${newTotal}`,
                    adminId: null
                }
            })
        })

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${orderId}`)

        return {
            success: true,
            message: "Les articles de la commande ont été mis à jour"
        }
    } catch (error: any) {
        console.error('Erreur lors de la modification des articles:', error)
        return {
            success: false,
            error: error.message || 'Impossible de mettre à jour les articles'
        }
    }
}

/**
 * Rechercher des livres ou packs pour les ajouter à une commande
 */
export async function searchProductsForOrder(query: string) {
    try {
        await verifyAdmin()
        if (!query || query.length < 2) return []

        const books = await prisma.book.findMany({
            where: { title: { contains: query } },
            take: 10,
            select: { id: true, title: true, price: true, image: true, stock: true }
        })

        const packs = await prisma.pack.findMany({
            where: { name: { contains: query } },
            take: 5,
            select: { id: true, name: true, price: true, image: true }
        })

        const accessories = await prisma.extraProduct.findMany({
            where: { name: { contains: query } },
            take: 8,
            select: { id: true, name: true, price: true, image: true, stock: true }
        })

        const results = [
            ...books.map(b => ({ type: 'BOOK' as const, id: b.id, title: b.title, price: b.price, image: b.image, stock: b.stock })),
            ...packs.map(p => ({ type: 'PACK' as const, id: p.id, title: p.name, price: p.price, image: p.image, stock: 999 })), // on simule un stock infini pour les packs pour l'instant
            ...accessories.map(a => ({ type: 'ACCESSORY' as const, id: a.id, title: a.name, price: a.price, image: a.image, stock: a.stock }))
        ]

        return results
    } catch (error) {
        console.error('Erreur recherche produits:', error)
        return []
    }
}
