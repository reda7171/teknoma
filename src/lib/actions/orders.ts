'use server'

import { publicOrderSelect } from '@/lib/public-order'
import { priceCheckoutItems, couponDiscount } from '@/lib/checkout-pricing'

import { canReadOrder, getGuestOrderIds, grantOrderAccess } from '@/lib/order-access'

import { prisma } from '@/lib/prisma'
import { cookies, headers } from 'next/headers'
import { getCommunityUser } from './community-auth'
import { verifyAdmin, isAuthenticated } from './auth'
import { z } from 'zod'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { calculate3For4Discount } from '@/lib/utils'
import { allocateOrderItemStock } from "@/lib/server/warehouse"
import * as crypto from 'crypto'
import { resolveStorefrontChannel } from '@/lib/sales-channel'
import type { SalesChannel } from '@prisma/client'
import { generateAmanaTrackingId } from '@/lib/shipping/amana-tracking'

const OrderSchema = z.object({
    fullName: z.string().min(1, 'Nom complet requis').max(100),
    email: z.string().optional().default(''),
    phone: z.string().min(8, 'Téléphone invalide').max(30),
    address: z.string().min(5, 'Adresse trop courte').max(500),
    city: z.string().min(1, 'Ville requise').max(100),
    comment: z.string().max(1000).optional(),
    shippingCompany: z.string().max(100).optional(),
    items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive('La quantité doit être supérieure à 0').max(100),
        type: z.enum(['BOOK', 'PACK', 'GIFT', 'DIGITAL', 'ACCESSORY']),
        price: z.number().min(0, 'Le prix doit être positif ou nul').max(100000),
        replacedBooks: z.record(z.string(), z.object({ id: z.string(), title: z.string() })).optional()
    })).min(1, 'Panier vide').max(50),
    couponCode: z.string().max(50).optional(),
    cartSessionId: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/).optional(),
    discount: z.number().optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(255).optional(),
    fbclid: z.string().max(255).optional(),
    ttclid: z.string().max(255).optional(),
    utmttclid: z.string().max(255).optional(),
    gclid: z.string().max(255).optional(),
    gaClientId: z.string().max(255).optional(),
    fbp: z.string().max(255).optional(),
    fbc: z.string().max(255).optional(),
    paymentMethod: z.enum(['COD', 'STRIPE', 'PAYPAL', 'CMI', 'BANK_TRANSFER']).optional(),
    useCredits: z.boolean().optional()
})

export async function getOrders() {
    const accessibleIds = await getGuestOrderIds()
    if (!accessibleIds.length) return []

    try {
        const orders = await (prisma.order as any).findMany({
            where: {
                id: { in: accessibleIds }
            },
            select: publicOrderSelect,
            orderBy: {
                createdAt: 'desc'
            }
        })

        return orders as any[]
    } catch (error) {
        return []
    }
}

export async function createOrder(input: z.infer<typeof OrderSchema>, salesChannelOverride?: SalesChannel) {
    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`order_${ip}`, { limit: 10, windowMs: 60000 }) // 3 commandes par minute max

    if (!limiter.success) {
        return { success: false, error: "Trop de commandes. Veuillez patienter une minute." }
    }

    try {
        let requestHeaders: Pick<Headers, 'get'> = { get: () => null }
        try {
            requestHeaders = await headers()
        } catch {}
        const salesChannel = salesChannelOverride || resolveStorefrontChannel(requestHeaders)

        // OWASP A03: Injection / Validation
        const data = OrderSchema.parse(input)
        data.items = await priceCheckoutItems(data.items)

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
        let discount = await couponDiscount(sanitizedData.couponCode, subtotal)

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
                bookIds.length > 0 ? tx.book.findMany({ where: { id: { in: bookIds } }, select: { id: true, costPrice: true, sellerId: true, stock: true } }) : [],
                packIds.length > 0 ? tx.pack.findMany({ where: { id: { in: packIds } }, select: { id: true, costPrice: true, shippingFees: true, books: true, extraProducts: true } }) : [],
                accessoryIds.length > 0 ? tx.extraProduct.findMany({ where: { id: { in: accessoryIds } }, select: { id: true, costPrice: true, stock: true } }) : []
            ])

            const bookMap = new Map(books.map(b => [b.id, b]))
            const packMap = new Map(packs.map(p => [p.id, p]))
            const accessoryMap = new Map(accessories.map(a => [a.id, a]))

            let hasFreeShippingItem = false

            // Récupérer les prix de revient (costPrice), sellerId et vérifier si le produit est en rupture (manquant)
            const itemsWithCost = data.items.map(item => {
                let costPrice = 0
                let sellerId: string | null = null
                let isMissing = false

                if (item.type === 'BOOK') {
                    const book = bookMap.get(item.productId)
                    costPrice = book?.costPrice || 0
                    sellerId = book?.sellerId || null
                    if (book && book.stock <= 0) {
                        isMissing = true
                    }
                } else if (item.type === 'PACK') {
                    const pack = packMap.get(item.productId)
                    costPrice = pack?.costPrice || 0
                    if (pack?.shippingFees === 0) {
                        hasFreeShippingItem = true
                    }
                } else if (item.type === 'ACCESSORY') {
                    const ext = accessoryMap.get(item.productId)
                    costPrice = ext?.costPrice || 0
                    if (ext && (ext as any).stock <= 0) {
                        isMissing = true
                    }
                }
                return { ...item, costPrice, sellerId, isMissing }
            })

            // Logique de livraison synchronisée avec le client (Maroc Standard vs Worldwide Amana)
            const isWorldwideShipping = sanitizedData.shippingCompany === 'Amana International' || sanitizedData.shippingCompany === 'AMANA_WORLDWIDE'
            let shippingFees = hasOnlyDigital ? 0 : isWorldwideShipping ? 200 : (hasFreeShippingItem || subtotal >= 500) ? 0 : 30

            // Apply only discounts calculated from trusted server records.
            discount = Math.min(subtotal, discount + serverPromo3For4Discount)
            if (data.cartSessionId) {
                const offer = await tx.instantOffer.findFirst({ where: { sessionId: data.cartSessionId, status: 'ACCEPTED', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
                if (offer) {
                    const consumed = await tx.instantOffer.updateMany({ where: { id: offer.id, status: 'ACCEPTED' }, data: { status: 'USED' } })
                    if (consumed.count !== 1) throw new Error('Offre déjà utilisée')
                    discount = Math.min(subtotal, discount + Math.max(0, offer.discount))
                }
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
                    const debit = await tx.user.updateMany({
                        where: { id: userForCredits.id, credits: { gte: creditsToUse } },
                        data: { credits: { decrement: creditsToUse } }
                    })
                    if (debit.count !== 1) throw new Error('Solde insuffisant')
                }
            }

            // Validation du montant minimum et vérification des emails en parallèle
            const minOrderAmountSetting = await tx.siteSettings.findUnique({ where: { key: 'min_order_amount' } })
            const minOrderAmount = minOrderAmountSetting ? Number(minOrderAmountSetting.value) : 0
            if (minOrderAmount > 0 && total < minOrderAmount) {
                throw new Error(`Le montant minimum du panier pour passer commande est de ${minOrderAmount} MAD.`)
            }

            const finalEmail = sanitizedData.email

            const orderId = crypto.randomUUID()
            const impactedBookIds: string[] = []
            const lowStockAlerts: { id: string, title: string, stock: number }[] = []

            // Allocation prioritaire d'entrep�t : "Principal" en premier, sinon les autres
            const itemsWithWarehouse: (typeof itemsWithCost[0] & { warehouseId?: string | null })[] = []

            for (const item of itemsWithCost) {
                let assignedWarehouseId: string | null = null

                if (item.type === 'BOOK') {
                    impactedBookIds.push(item.productId)
                    const alloc = await allocateOrderItemStock(tx, {
                        bookId: item.productId,
                        quantity: item.quantity,
                        orderId
                    })
                    assignedWarehouseId = alloc.warehouseId

                    await tx.book.updateMany({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    })

                    const updatedBook = await tx.book.findUnique({ where: { id: item.productId } })
                    if (updatedBook && updatedBook.stock < 3) {
                        lowStockAlerts.push({ id: updatedBook.id, title: updatedBook.title, stock: updatedBook.stock })
                    }
                } else if (item.type === 'ACCESSORY') {
                    const alloc = await allocateOrderItemStock(tx, {
                        extraProductId: item.productId,
                        quantity: item.quantity,
                        orderId
                    })
                    assignedWarehouseId = alloc.warehouseId

                    await tx.extraProduct.updateMany({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    })
                } else if (item.type === 'PACK') {
                    const pack = packMap.get(item.productId)
                    if (pack) {
                        for (const packBook of (pack as any).books) {
                            let bookIdToDecrement = packBook.bookId
                            const replacedBooks = item.replacedBooks as Record<string, { id: string, title: string }> | undefined
                            if (replacedBooks && replacedBooks[packBook.bookId]) {
                                bookIdToDecrement = replacedBooks[packBook.bookId].id
                            }
                            impactedBookIds.push(bookIdToDecrement)
                            const alloc = await allocateOrderItemStock(tx, {
                                bookId: bookIdToDecrement,
                                quantity: item.quantity,
                                orderId
                            })
                            if (!assignedWarehouseId) {
                                assignedWarehouseId = alloc.warehouseId
                            }
                            await tx.book.updateMany({
                                where: { id: bookIdToDecrement },
                                data: { stock: { decrement: item.quantity } }
                            })
                        }
                        for (const packExtraProduct of (pack as any).extraProducts) {
                            const alloc = await allocateOrderItemStock(tx, {
                                extraProductId: packExtraProduct.extraProductId,
                                quantity: item.quantity,
                                orderId
                            })
                            if (!assignedWarehouseId) {
                                assignedWarehouseId = alloc.warehouseId
                            }
                            await tx.extraProduct.updateMany({
                                where: { id: packExtraProduct.extraProductId },
                                data: { stock: { decrement: item.quantity } }
                            })
                        }
                    }
                }

                itemsWithWarehouse.push({
                    ...item,
                    warehouseId: assignedWarehouseId
                })
            }

            // Cr�er la commande avec le warehouseId associ� sur chaque article
            const newOrder = await (tx.order as any).create({
                data: {
                    id: orderId,
                    salesChannel,
                    fullName: sanitizedData.fullName,
                    email: finalEmail,
                    phone: sanitizedData.phone,
                    address: sanitizedData.address,
                    city: sanitizedData.city,
                    comment: sanitizedData.comment,
                    shippingCompany: sanitizedData.shippingCompany || (isWorldwideShipping ? 'Amana International' : undefined),
                    trackingID: isWorldwideShipping ? generateAmanaTrackingId(orderId) : undefined,
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
                    status: 'PENDING',
                    paymentMethod: sanitizedData.paymentMethod || (sanitizedData.items.every(item => item.type === 'DIGITAL') ? 'DIGITAL_PAYMENT' : 'COD'),
                    items: {
                        create: itemsWithWarehouse.map(item => ({
                            type: item.type,
                            bookId: item.type === 'BOOK' ? item.productId : null,
                            packId: item.type === 'PACK' ? item.productId : null,
                            giftId: item.type === 'GIFT' ? item.productId : null,
                            digitalProductId: item.type === 'DIGITAL' ? item.productId : null,
                            extraProductId: item.type === 'ACCESSORY' ? item.productId : null,
                            sellerId: item.sellerId,
                            warehouseId: item.warehouseId || null,
                            quantity: item.quantity,
                            price: item.price,
                            costPrice: item.costPrice,
                            isMissing: Boolean(item.isMissing)
                        }))
                    }
                }
            })

            return { order: newOrder, lowStockAlerts, impactedBookIds }
        }, { timeout: 30000, maxWait: 15000 })

        // Sauvegarder l'email dans un cookie pour le suivi invité
        try {
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
            await grantOrderAccess(order.id)
            cookieStore.set('lastOrderId', order.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 // 24 heures
            })
        } catch {
            // Ignoré si exécuté hors d'un contexte de requête HTTP (ex: CLI, tests E2E, workers)
        }

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

                // Préparation commune des signaux PII et serveur (CAPI Facebook & GA4 Measurement Protocol)
                const { getSetting } = await import('@/lib/server/site-settings')
                const hash = (str: string) => crypto.createHash('sha256').update(str.toLowerCase().trim()).digest('hex')

                // Normalisation internationale du numéro de téléphone (E.164)
                let normalizedPhone = fullOrder.phone.replace(/\D/g, '')
                if (normalizedPhone.startsWith('00')) normalizedPhone = normalizedPhone.slice(2)
                if (normalizedPhone.startsWith('0') && normalizedPhone.length >= 9) {
                    normalizedPhone = '212' + normalizedPhone.slice(1)
                } else if ((normalizedPhone.startsWith('6') || normalizedPhone.startsWith('7')) && normalizedPhone.length === 9) {
                    normalizedPhone = '212' + normalizedPhone
                }

                const cleanEmail = (fullOrder.email || '').trim().toLowerCase()
                const nameParts = (fullOrder.fullName || '').trim().split(/\s+/).filter(Boolean)
                const fn = nameParts.length > 0 ? [hash(nameParts[0].toLowerCase())] : undefined
                const ln = nameParts.length > 1 ? [hash(nameParts.slice(1).join(' ').toLowerCase())] : undefined
                const rawCity = (fullOrder.city || '').split(',')[0].trim().toLowerCase()

                const clientIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || ip
                const clientUserAgent = requestHeaders.get('user-agent') || undefined
                const cookieHeader = requestHeaders.get('cookie') || ''

                // Envoi CAPI Facebook (Server-Side) avec déduplication event_id et enrichissement EMQ
                const fbPixelId = await getSetting('facebook_pixel_id')
                const fbAccessToken = await getSetting('facebook_access_token') || process.env.FACEBOOK_ACCESS_TOKEN

                let fbPromise = Promise.resolve()
                if (fbPixelId && fbAccessToken) {
                    const em = cleanEmail && cleanEmail.includes('@') ? [hash(cleanEmail)] : undefined
                    const ph = normalizedPhone.length >= 9 ? [hash(normalizedPhone)] : undefined
                    const ct = rawCity ? [hash(rawCity)] : undefined
                    const country = [hash('ma')]

                    const headerFbp = cookieHeader.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1]
                    const headerFbc = cookieHeader.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1]
                    const resolvedFbp = data.fbp || headerFbp || undefined
                    const resolvedFbc = data.fbc || (data.fbclid ? `fb.1.${Date.now()}.${data.fbclid}` : headerFbc) || undefined

                    const userData: Record<string, any> = {
                        client_ip_address: clientIp,
                        client_user_agent: clientUserAgent,
                    }
                    if (em) userData.em = em
                    if (ph) userData.ph = ph
                    if (fn) userData.fn = fn
                    if (ln) userData.ln = ln
                    if (ct) userData.ct = ct
                    if (country) userData.country = country
                    if (resolvedFbp) userData.fbp = resolvedFbp
                    if (resolvedFbc) userData.fbc = resolvedFbc

                    const eventSourceUrl = requestHeaders.get('referer') || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'}/checkout`
                    const eventData = {
                        data: [{
                            event_name: 'Purchase',
                            event_time: Math.floor(Date.now() / 1000),
                            event_id: fullOrder.id,
                            event_source_url: eventSourceUrl,
                            action_source: 'website',
                            user_data: userData,
                            custom_data: {
                                currency: 'MAD',
                                value: Number(fullOrder.total),
                                content_type: 'product',
                                content_ids: fullOrder.items.map((i: any) => i.bookId || i.packId || i.extraProductId || i.giftId || i.id).filter(Boolean),
                                contents: fullOrder.items.map((i: any) => ({
                                    id: i.bookId || i.packId || i.extraProductId || i.giftId || i.id,
                                    quantity: i.quantity || 1,
                                    item_price: Number(i.price) || 0
                                })),
                                num_items: fullOrder.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
                            }
                        }]
                    }

                    fbPromise = fetch(`https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbAccessToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(eventData)
                    }).then(async (res) => {
                        if (!res.ok) {
                            const errBody = await res.text().catch(() => '')
                            console.error('Meta CAPI Error:', res.status, errBody)
                        }
                    }).catch(console.error)
                }

                // Envoi Google Analytics 4 Measurement Protocol avec Enhanced Conversions (Server-Side)
                const gaMeasurementId = await getSetting('google_analytics_id') || process.env.NEXT_PUBLIC_GA_ID || process.env.GA_MEASUREMENT_ID
                const gaApiSecret = await getSetting('google_analytics_api_secret') || process.env.GA_API_SECRET || process.env.GOOGLE_ANALYTICS_API_SECRET

                let gaPromise = Promise.resolve()
                if (gaMeasurementId && gaApiSecret) {
                    const gaCookieMatch = cookieHeader.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/)
                    const clientId = data.gaClientId || (gaCookieMatch ? gaCookieMatch[1] : undefined) || `${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`

                    const googleE164Phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`
                    const gaHashedPhone = normalizedPhone.length >= 9 ? [hash(googleE164Phone)] : undefined
                    const gaHashedEmail = cleanEmail && cleanEmail.includes('@') ? [hash(cleanEmail)] : undefined

                    const gaUserData: Record<string, any> = {
                        address: [{
                            city: rawCity || undefined,
                            country: 'MA',
                            sha256_first_name: fn ? fn[0] : undefined,
                            sha256_last_name: ln ? ln[0] : undefined,
                        }]
                    }
                    if (gaHashedEmail) gaUserData.sha256_email_address = gaHashedEmail
                    if (gaHashedPhone) gaUserData.sha256_phone_number = gaHashedPhone

                    const gaEventParams: Record<string, any> = {
                        transaction_id: fullOrder.id,
                        value: Number((Number(fullOrder.total) || 0).toFixed(2)),
                        currency: 'MAD',
                        shipping: Number((Number(fullOrder.shippingFees) || 0).toFixed(2)),
                        payment_type: data.paymentMethod || 'COD',
                        coupon: fullOrder.couponCode || undefined,
                        engagement_time_msec: 100,
                        items: fullOrder.items.map((i: any, index: number) => ({
                            item_id: i.bookId || i.packId || i.extraProductId || i.giftId || i.id,
                            item_name: i.book?.title || i.pack?.name || i.extraProduct?.name || 'Article',
                            price: Number((Number(i.price) || 0).toFixed(2)),
                            quantity: i.quantity || 1,
                            item_category: i.type || 'Books',
                            index
                        }))
                    }
                    if (data.gclid) {
                        gaEventParams.gclid = data.gclid
                    }

                    const gaPayload = {
                        client_id: clientId,
                        user_id: fullOrder.customerId || undefined,
                        user_data: gaUserData,
                        events: [{
                            name: 'purchase',
                            params: gaEventParams
                        }]
                    }

                    gaPromise = fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${gaMeasurementId}&api_secret=${gaApiSecret}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(gaPayload)
                    }).then(async (res) => {
                        if (!res.ok) {
                            const errBody = await res.text().catch(() => '')
                            console.error('GA4 Measurement Protocol Error:', res.status, errBody)
                        }
                    }).catch(console.error)
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
                    jumiaSyncPromise = import("@/lib/server/jumia").then(({ syncJumiaStockForBooksBackground }) => {
                        return syncJumiaStockForBooksBackground(impactedBookIds).catch(console.error)
                    }).then(() => {}).catch(console.error)
                }

                let autoEmailPromise = Promise.resolve()
                if (fullOrder.email) {
                    const articlesList = (fullOrder.items || []).map((i: any) =>
                        `• ${i.quantity}x ${i.book?.title || i.pack?.name || 'Article'} (${i.price} DH)`
                    ).join('<br/>')

                    const { sendTriggerEmail } = await import("@/lib/server/email-templates")
                    autoEmailPromise = sendTriggerEmail('order_created', fullOrder.email, {
                        client_nom: fullOrder.fullName,
                        customer_name: fullOrder.fullName,
                        order_id: fullOrder.id.slice(0, 8),
                        total: fullOrder.total,
                        adresse: fullOrder.address,
                        ville: fullOrder.city,
                        telephone: fullOrder.phone,
                        articles: articlesList,
                        tracking_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'}/track/${fullOrder.id}`
                    }).then(() => {}).catch(console.error)
                }

                // Attendre la fin des requêtes asynchrones pour éviter qu'elles ne soient coupées par l'environnement Serverless (Vercel)
                await Promise.all([telegramPromise, fbPromise, gaPromise, lowStockPromise, jumiaSyncPromise, autoEmailPromise])
            }
        } catch (e) {
            console.error('Erreur Telegram Notification / CAPI / GA4 / Stock Sync / AutoEmail:', e)
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
        return { success: false, error: "Impossible de cr?er la commande" }
    }
}

// ... existing code ...

export async function getOrderById(orderId: string) {
    try {
        const order = await (prisma.order as any).findUnique({
            where: {
                id: orderId
            },
            select: publicOrderSelect
        })

        if (!order) return null

        if (!(await canReadOrder(order))) return null

        return order
    } catch (error) {
        console.error('Error fetching order:', error)
        return null
    }
}

export async function updateOrderEmail(orderId: string, email: string) {
    try {
        if (typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Email invalide' }
        const order = await (prisma.order as any).findUnique({ where: { id: orderId } })
        if (!order || !(await canReadOrder(order))) return { success: false, error: 'Accès interdit' }
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
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order || !(await canReadOrder(order))) {
            throw new Error('Commande introuvable')
        }

        if (order.status !== 'PENDING') {
            throw new Error('Cette commande ne peut plus être annulée')
        }

        const changed = await prisma.order.updateMany({ where: { id: orderId, status: 'PENDING' }, data: { status: 'CANCELLED' } })
        if (changed.count !== 1) throw new Error('Commande non annulable')

        return { success: true }
    } catch (error: any) {
        console.error('Error cancelling order:', error)
        throw new Error(error.message || 'Erreur lors de l\'annulation de la commande')
    }
}
