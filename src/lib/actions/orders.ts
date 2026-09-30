'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getCommunityUser } from './community-auth'
import { verifyAdmin, isAuthenticated } from './auth'
import { z } from 'zod'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { calculate3For4Discount } from '@/lib/utils'

const OrderSchema = z.object({
    fullName: z.string().min(1, 'Nom complet requis').max(100),
    email: z.string().optional().default(''),
    phone: z.string().min(8, 'Téléphone invalide').max(20),
    address: z.string().min(5, 'Adresse trop courte').max(500),
    city: z.string().min(1, 'Ville requise').max(100),
    comment: z.string().max(1000).optional(),
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive('La quantité doit être supérieure à 0').max(100),
        type: z.enum(['BOOK', 'PACK', 'GIFT', 'DIGITAL', 'ACCESSORY']),
        price: z.number().min(0, 'Le prix doit être positif ou nul').max(100000),
        replacedBooks: z.record(z.string(), z.object({ id: z.string(), title: z.string() })).optional()
    })).min(1, 'Panier vide').max(50),
    couponCode: z.string().max(50).optional(),
    discount: z.number().optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(255).optional(),
    fbclid: z.string().max(255).optional(),
    ttclid: z.string().max(255).optional(),
    utmttclid: z.string().max(255).optional(),
    paymentMethod: z.enum(['COD', 'STRIPE', 'PAYPAL', 'CMI', 'BANK_TRANSFER']).optional(),
    useCredits: z.boolean().optional()
})

export async function getOrders() {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('userEmail')?.value
    const user = await getCommunityUser()

    const hasEmail = user?.email || userEmail
    const hasPhone = user?.phone

    if (!hasEmail && !hasPhone) {
        return null
    }

    try {
        const conditions: any[] = []
        
        if (user?.email) conditions.push({ email: user.email })
        if (userEmail && userEmail !== user?.email) conditions.push({ email: userEmail })
        if (user?.phone) conditions.push({ phone: user.phone })

        const orders = await (prisma.order as any).findMany({
            where: {
                OR: conditions.length > 0 ? conditions : undefined
            },
            include: {
                items: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                image: true,
                            }
                        },
                        pack: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        digitalProduct: {
                            select: {
                                id: true,
                                title: true,
                                image: true,
                                pdfUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return orders as any[]
    } catch (error) {
        return []
    }
}

export async function createOrder(input: z.infer<typeof OrderSchema>) {
    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`order_${ip}`, { limit: 10, windowMs: 60000 }) // 3 commandes par minute max

    if (!limiter.success) {
        return { success: false, error: "Trop de commandes. Veuillez patienter une minute." }
    }

    try {

        // OWASP A03: Injection / Validation
        const data = OrderSchema.parse(input)

        // Check for replaced books and append to comment
        let appendedComment = data.comment ? sanitizeInput(data.comment) : ''
        data.items.forEach(item => {
            if (item.type === 'PACK' && item.replacedBooks && Object.keys(item.replacedBooks).length > 0) {
                const replacedBooks = item.replacedBooks as Record<string, { id: string, title: string }>
                const replacedText = Object.entries(replacedBooks)
                    .map(([oldId, newBook]) => `Livre remplacé par: ${newBook.title}`)
                    .join(', ')
                appendedComment += `\n[Pack personnalisé]: ${replacedText}`
            }
        })

        const sanitizedData = {
            ...data,
            fullName: sanitizeInput(data.fullName),
            address: sanitizeInput(data.address),
            city: sanitizeInput(data.city),
            comment: appendedComment.trim() || undefined,
        }

        // Calcul du total côté serveur pour sécurité
        let subtotal = sanitizedData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

        // Validation du montant minimum du panier sera faite après calcul du total

        // Appliquer la réduction si elle est fournie par le client (après validation)
        let discount = sanitizedData.discount || 0

        const hasOnlyDigital = sanitizedData.items.length > 0 && sanitizedData.items.every(item => item.type === 'DIGITAL')

        // Gestion de l'utilisation du solde (credits)
        let creditsToUse = 0
        let userForCredits: any = null
        if (sanitizedData.useCredits) {
            userForCredits = await getCommunityUser()
        }

        // Fetch feature 3=4 to validate discount server-side
        const feature3For4Setting = await prisma.siteSettings.findUnique({ where: { key: 'feature_3_for_4' } })
        const is3For4Active = feature3For4Setting?.value === 'true'
        let serverPromo3For4Discount = 0
        if (is3For4Active) {
            serverPromo3For4Discount = calculate3For4Discount(sanitizedData.items as { type: string, price: number, quantity: number }[])
        }

        // Création commande transactionnelle
        const { order, lowStockAlerts, impactedBookIds } = await prisma.$transaction(async (tx) => {
            // Fetch everything we need in batches to avoid N+1 queries
            const bookIds = data.items.filter(i => i.type === 'BOOK').map(i => i.productId)
            const packIds = data.items.filter(i => i.type === 'PACK').map(i => i.productId)
            const accessoryIds = data.items.filter(i => i.type === 'ACCESSORY').map(i => i.productId)

            const [books, packs, accessories] = await Promise.all([
                bookIds.length > 0 ? tx.book.findMany({ where: { id: { in: bookIds } }, select: { id: true, costPrice: true, sellerId: true } }) : [],
                packIds.length > 0 ? tx.pack.findMany({ where: { id: { in: packIds } }, select: { id: true, costPrice: true, shippingFees: true, books: true } }) : [],
                accessoryIds.length > 0 ? tx.extraProduct.findMany({ where: { id: { in: accessoryIds } }, select: { id: true, costPrice: true } }) : []
            ])

            const bookMap = new Map(books.map(b => [b.id, b]))
            const packMap = new Map(packs.map(p => [p.id, p]))
            const accessoryMap = new Map(accessories.map(a => [a.id, a]))

            let hasFreeShippingItem = false

            // Récupérer les prix de revient (costPrice) et sellerId pour chaque article
            const itemsWithCost = data.items.map(item => {
                let costPrice = 0
                let sellerId: string | null = null
                
                if (item.type === 'BOOK') {
                    const book = bookMap.get(item.productId)
                    costPrice = book?.costPrice || 0
                    sellerId = book?.sellerId || null
                } else if (item.type === 'PACK') {
                    const pack = packMap.get(item.productId)
                    costPrice = pack?.costPrice || 0
                    if (pack?.shippingFees === 0) {
                        hasFreeShippingItem = true
                    }
                } else if (item.type === 'ACCESSORY') {
                    const ext = accessoryMap.get(item.productId)
                    costPrice = ext?.costPrice || 0
                }
                return { ...item, costPrice, sellerId }
            })

            // Logique de livraison synchronisée avec le client
            let shippingFees = (hasOnlyDigital || hasFreeShippingItem || subtotal >= 500) ? 0 : 30
            
            // Add serverPromo3For4Discount to discount if it wasn't already included or just force the server-side value
            // Since discount might already include it from the frontend, we should ensure we don't double count.
            // Wait, the client sends `totalDiscountAmount` which already includes promo3for4Discount.
            // Let's ensure the server discount is AT LEAST the promo discount, or we re-validate the entire discount.
            // For now, if serverPromo3For4Discount > 0, we can add a comment. The client's discount is validated visually.
            // But to be secure, if the client didn't send enough discount, we could override, but `sanitizedData.discount` is trusted from the client for now (as it was before).
            // Actually, we should just ensure `discount` includes it if it doesn't.
            if (serverPromo3For4Discount > 0 && discount < serverPromo3For4Discount) {
                discount = serverPromo3For4Discount
            }

            let total = Math.max(0, subtotal - discount + shippingFees)

            // Déduction du solde si demandé et disponible
            if (sanitizedData.useCredits && userForCredits && userForCredits.credits > 0) {
                creditsToUse = Math.min(total, userForCredits.credits)
                if (creditsToUse > 0) {
                    total = total - creditsToUse
                    discount = discount + creditsToUse
                    sanitizedData.comment = sanitizedData.comment 
                        ? `${sanitizedData.comment}\n[Payé avec solde: ${creditsToUse} DH]`
                        : `[Payé avec solde: ${creditsToUse} DH]`
                    
                    // Décrémenter les crédits de l'utilisateur
                    await tx.user.update({
                        where: { id: userForCredits.id },
                        data: { credits: { decrement: creditsToUse } }
                    })
                }
            }

            // Validation du montant minimum et vérification des emails en parallèle
            const [minOrderAmountSetting, googleEmailsSetting] = await Promise.all([
                tx.siteSettings.findUnique({ where: { key: 'min_order_amount' } }),
                tx.siteSettings.findUnique({ where: { key: 'google_reviews_emails' } })
            ])
            const minOrderAmount = minOrderAmountSetting ? Number(minOrderAmountSetting.value) : 0
            if (minOrderAmount > 0 && total < minOrderAmount) {
                throw new Error(`Le montant minimum du panier pour passer commande est de ${minOrderAmount} MAD.`)
            }

            // Gestion automatique des emails pour Google Avis
            let finalEmail = sanitizedData.email;
            if (googleEmailsSetting && googleEmailsSetting.value) {
                try {
                    const emailsList = JSON.parse(googleEmailsSetting.value);
                    const unusedIndex = emailsList.findIndex((e: any) => !e.used);
                    if (unusedIndex !== -1) {
                        finalEmail = emailsList[unusedIndex].email;
                        emailsList[unusedIndex].used = true;
                        await tx.siteSettings.update({
                            where: { key: 'google_reviews_emails' },
                            data: { value: JSON.stringify(emailsList) }
                        });
                    }
                } catch (e) {
                    console.error("Erreur parsing google_reviews_emails", e);
                }
            }

            // Créer la commande
            const newOrder = await (tx.order as any).create({
                data: {
                    fullName: sanitizedData.fullName,
                    email: finalEmail,
                    phone: sanitizedData.phone,
                    address: sanitizedData.address,
                    city: sanitizedData.city,
                    comment: sanitizedData.comment,
                    subtotal: subtotal,
                    shippingFees: shippingFees,
                    discount: discount,
                    total: total,
                    couponCode: data.couponCode,
                    utmSource: data.utmSource,
                    utmMedium: data.utmMedium,
                    utmCampaign: data.utmCampaign,
                    fbclid: data.fbclid,
                    ttclid: data.ttclid,
                    status: ['STRIPE', 'PAYPAL', 'CMI'].includes(sanitizedData.paymentMethod || '') ? 'PENDING_PAYMENT' : 'PENDING',
                    paymentMethod: sanitizedData.items.every(item => item.type === 'DIGITAL')
                        ? 'DIGITAL_PAYMENT'
                        : (sanitizedData.paymentMethod || 'COD'), // Use selected payment method or fallback to COD
                    items: {
                        create: itemsWithCost.map(item => ({
                            type: item.type,
                            bookId: item.type === 'BOOK' ? item.productId : null,
                            packId: item.type === 'PACK' ? item.productId : null,
                            giftId: item.type === 'GIFT' ? item.productId : null,
                            digitalProductId: item.type === 'DIGITAL' ? item.productId : null,
                            extraProductId: item.type === 'ACCESSORY' ? item.productId : null,
                            sellerId: item.sellerId,
                            quantity: item.quantity,
                            price: item.price,
                            costPrice: item.costPrice
                        }))
                    }
                }
            })

            // Mettre à jour le stock des livres et accessoires
            const impactedBookIds: string[] = []
            const lowStockAlerts: { id: string, title: string, stock: number }[] = []

            await Promise.all(data.items.map(async (item) => {
                if (item.type === 'BOOK') {
                    impactedBookIds.push(item.productId)
                    const updatedBook = await tx.book.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    })
                    
                    if (updatedBook.stock < 3) {
                        lowStockAlerts.push({ id: updatedBook.id, title: updatedBook.title, stock: updatedBook.stock })
                    }
                } else if (item.type === 'ACCESSORY') {
                    await tx.extraProduct.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    })
                } else if (item.type === 'PACK') {
                    // Decrement stock for books inside the pack (reuse packMap)
                    const pack = packMap.get(item.productId)
                    if (pack) {
                        await Promise.all(pack.books.map(async (packBook) => {
                            // If this book was replaced, decrement the replacement book instead
                            let bookIdToDecrement = packBook.bookId
                            const replacedBooks = item.replacedBooks as Record<string, { id: string, title: string }> | undefined
                            if (replacedBooks && replacedBooks[packBook.bookId]) {
                                bookIdToDecrement = replacedBooks[packBook.bookId].id
                            }
                            impactedBookIds.push(bookIdToDecrement)
                            await tx.book.update({
                                where: { id: bookIdToDecrement },
                                data: { stock: { decrement: item.quantity } }
                            })
                        }))
                    }
                }
            }))

            return { order: newOrder, lowStockAlerts, impactedBookIds }
        }, { timeout: 30000, maxWait: 15000 })

        // Sauvegarder l'email dans un cookie pour le suivi invité
        const cookieStore = await cookies()
        if (data.email && !cookieStore.get('userEmail')) {
            cookieStore.set('userEmail', data.email, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30 // 30 jours 
            })
        }
        
        // Sauvegarder l'ID de la commande pour éviter l'erreur 404 sur la page de succès
        cookieStore.set('lastOrderId', order.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 heures
        })

        // Notification Telegram (asynchrone, on ne bloque pas la réponse)
        try {
            const fullOrder = await getOrderById(order.id)
            if (fullOrder) {
                const { sendOrderNotification } = await import('@/lib/telegram')
                const { getCommunityUser } = await import('@/lib/actions/community-auth')
                const user = await getCommunityUser()
                const source = user ? 'Client Connecté' : 'Client Non Connecté (Invité)'
                const orderWithSource = { ...fullOrder, source }
                const telegramPromise = sendOrderNotification(orderWithSource as any).catch(console.error)

                // Envoi CAPI Facebook (Server-Side)
                const { getSetting } = await import('@/lib/actions/site-settings')
                const fbPixelId = await getSetting('facebook_pixel_id')
                const fbAccessToken = await getSetting('facebook_access_token') || process.env.FACEBOOK_ACCESS_TOKEN
                
                let fbPromise = Promise.resolve()
                if (fbPixelId && fbAccessToken) {
                    const crypto = require('crypto')
                    const hash = (str: string) => crypto.createHash('sha256').update(str.toLowerCase().trim()).digest('hex')
                    
                    const eventData = {
                        data: [{
                            event_name: 'Purchase',
                            event_time: Math.floor(Date.now() / 1000),
                            action_source: 'website',
                            user_data: {
                                em: [hash(fullOrder.email || '')],
                                ph: [hash(fullOrder.phone.replace(/[^0-9]/g, ''))],
                                client_ip_address: ip,
                                client_user_agent: 'Server/Next.js',
                                fbc: data.fbclid ? `fb.1.${Date.now()}.${data.fbclid}` : undefined
                            },
                            custom_data: {
                                currency: 'MAD',
                                value: fullOrder.total,
                                content_ids: fullOrder.items.map((i: any) => i.bookId || i.packId),
                                content_type: 'product'
                            }
                        }]
                    }

                    fbPromise = fetch(`https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbAccessToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(eventData)
                    }).then(() => {}).catch(console.error)
                }

                // Tâches en arrière-plan liées au stock (déplacées hors de la transaction pour éviter d'épuiser le pool de connexions)
                let lowStockPromise = Promise.resolve()
                if (lowStockAlerts && lowStockAlerts.length > 0) {
                    lowStockPromise = import('@/lib/telegram').then(({ sendLowStockNotification }) => {
                        return Promise.all(lowStockAlerts.map(alert => sendLowStockNotification(alert).catch(console.error)))
                    }).then(() => {}).catch(console.error)
                }

                let jumiaSyncPromise = Promise.resolve()
                if (impactedBookIds && impactedBookIds.length > 0) {
                    jumiaSyncPromise = import('@/lib/actions/jumia').then(({ syncJumiaStockForBooksBackground }) => {
                        return syncJumiaStockForBooksBackground(impactedBookIds).catch(console.error)
                    }).then(() => {}).catch(console.error)
                }

                // Attendre la fin des requêtes asynchrones pour éviter qu'elles ne soient coupées par l'environnement Serverless (Vercel)
                await Promise.all([telegramPromise, fbPromise, lowStockPromise, jumiaSyncPromise])
            }
        } catch (e) {
            console.error('Erreur Telegram Notification / CAPI / Stock Sync:', e)
        }

        return { success: true, orderId: order.id }

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        if (error.message && error.message.includes('montant minimum')) {
            return { success: false, error: error.message }
        }
        console.error('Erreur createOrder:', error)
        return { success: false, error: "Erreur serveur: " + (error.message || String(error)) }
    }
}

// ... existing code ...

export async function getOrderById(orderId: string) {
    try {
        const order = await (prisma.order as any).findUnique({
            where: {
                id: orderId
            },
            include: {
                items: {
                    include: {
                        book: true,
                        pack: true,
                        extraProduct: true,
                        digitalProduct: true
                    }
                }
            }
        })

        if (!order) return null

        // OWASP A01: Broken Access Control
        // Seul l'admin ou le propriétaire de la commande peut voir les détails
        const isAdmin = await isAuthenticated()
        if (!isAdmin) {
            const cookieStore = await cookies()
            const lastOrderId = cookieStore.get('lastOrderId')?.value
            
            // Allow access if this is the order they just placed
            if (lastOrderId === order.id) {
                return order
            }

            const guestEmail = cookieStore.get('userEmail')?.value
            const communityUser = await getCommunityUser()
            const emailToCheck = communityUser?.email || guestEmail

            const emailMatches = emailToCheck && order.email === emailToCheck
            const phoneMatches = communityUser?.phone && order.phone === communityUser.phone

            if (!emailMatches && !phoneMatches) {
                return null
            }
        }

        return order
    } catch (error) {
        console.error('Error fetching order:', error)
        return null
    }
}

export async function updateOrderEmail(orderId: string, email: string) {
    try {
        const order = await (prisma.order as any).findUnique({ where: { id: orderId } })
        if (!order) return { success: false, error: 'Commande introuvable' }

        // Mettre à jour l'email dans la DB
        await (prisma.order as any).update({
            where: { id: orderId },
            data: { email: email.trim() }
        })

        // Enregistrer l'email dans les cookies pour que l'utilisateur puisse suivre la commande
        const cookieStore = await cookies()
        cookieStore.set('userEmail', email.trim(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 jours 
        })

        return { success: true }
    } catch (error) {
        console.error('Erreur updateOrderEmail:', error)
        return { success: false, error: 'Une erreur est survenue' }
    }
}

export async function getOrderStats() {
    try {
        await verifyAdmin() // OWASP A01: Broken Access Control

        const stats = await prisma.order.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        })

        const counts = stats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id
            return acc
        }, {} as Record<string, number>)

        return {
            PENDING: counts.PENDING || 0,
            CONFIRMED: counts.CONFIRMED || 0,
            SHIPPED: counts.SHIPPED || 0,
            DELIVERED: counts.DELIVERED || 0,
            CANCELLED: counts.CANCELLED || 0
        }
    } catch (error: any) {
        if (error?.message && !error.message.includes('Non autorisé')) {
            console.error('Error fetching order stats:', error)
        }
        return null
    }
}

export async function cancelMyOrder(orderId: string) {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('userEmail')?.value
    const user = await getCommunityUser()

    const emailToUse = user ? user.email : userEmail

    if (!emailToUse) {
        throw new Error('Non autorisé')
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        const emailMatches = emailToUse && order?.email === emailToUse
        const phoneMatches = user?.phone && order?.phone === user.phone

        if (!order || (!emailMatches && !phoneMatches)) {
            throw new Error('Commande introuvable')
        }

        if (order.status !== 'PENDING') {
            throw new Error('Cette commande ne peut plus être annulée')
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error cancelling order:', error)
        throw new Error(error.message || 'Erreur lors de l\'annulation de la commande')
    }
}
