import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { answerCallbackQuery, editTelegramMessage, sendTelegramMessage, sendTelegramPhoto, sendTelegramMediaGroup } from '@/lib/telegram'
import { OrderStatus } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { isAuthorizedTelegramWebhook } from '@/lib/telegram-webhook-auth'
import { getCronSecret } from '@/lib/cron-auth'
import { getJumiaOrderStatus, isJumiaRevenueOrder, summarizeJumiaOrders, type JumiaReportOrder } from '@/lib/jumia-reporting'

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmée',
    SHIPPED: 'En livraison',
    DELIVERED: 'Livrée',
    RETURNED: 'Retournée',
    CANCELLED: 'Annulée',
    IN_TRANSIT: 'En transit',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    FAILED: 'Échec',
}

async function callProtectedCron(pathname: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const cronSecret = getCronSecret()
    if (!appUrl || !cronSecret) throw new Error('Configuration cron incomplète')

    const response = await fetch(new URL(pathname, appUrl), {
        headers: { Authorization: `Bearer ${cronSecret}` },
        cache: 'no-store',
        redirect: 'error'
    })

    if (!response.ok) {
        const payload = await response.clone().json().catch(() => null)
        const detail = typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`
        throw new Error(`API cron indisponible (${detail})`)
    }

    return response
}

export async function POST(req: Request) {
    let currentCallbackId: string | null = null
    let currentToken: string | null = null

    try {
        if (!(await isAuthorizedTelegramWebhook(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        
        // Récupérer le token depuis la DB
        const tokenSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
        const token = tokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN || ''
        currentToken = token

        if (!token) {
            console.error('[SECURITY] Bot token not configured')
            return NextResponse.json({ error: 'Not configured' }, { status: 500 })
        }

        // Traitement des callback_query (boutons)
        if (body.callback_query) {
            const { id: callbackId, data, message } = body.callback_query
            currentCallbackId = callbackId
            const { escapeHtml } = await import('@/lib/telegram')
            
            void(`[TELEGRAM CALLBACK] Received ID: ${callbackId}, Data: ${data}`)

            // ─── Bouton Ping (Session) ───────────────────────────────────────
            if (data && data.startsWith('ping:')) {
                const sessionId = data.split(':')[1]
                const lastView = await prisma.pageView.findFirst({
                    where: { sessionId },
                    orderBy: { createdAt: 'desc' }
                })

                if (!lastView) {
                    await answerCallbackQuery(callbackId, '❌ Session introuvable dans les logs.', token, true)
                } else {
                    const diffMs = new Date().getTime() - lastView.createdAt.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    
                    if (diffMins < 5) {
                        await answerCallbackQuery(callbackId, `✅ En ligne ! (Dernière action il y a ${diffMins} min)`, token, true)
                    } else {
                        await answerCallbackQuery(callbackId, `⚠️ Inactif depuis ${diffMins} min`, token, true)
                    }
                }
                
                return NextResponse.json({ ok: true })
            }
            // ─────────────────────────────────────────────────────────────────

            // ─── Boutons offre panier (-10, -20, -30 Dhs) ────────────────────
            if (data && data.startsWith('offer_')) {
                const parts = data.split(':')
                const offerType = parts[0]   // offer_10 | offer_20 | offer_30
                const sessionId = parts[1]    // sessionId du client

                let discount = 0
                if (offerType === 'offer_10') discount = 10
                if (offerType === 'offer_20') discount = 20
                if (offerType === 'offer_30') discount = 30

                if (discount > 0 && sessionId) {
                    // Créer l'offre en DB (sera récupérée par le polling du client)
                    await prisma.instantOffer.create({
                        data: {
                            sessionId,
                            discount,
                            status: 'PENDING',
                            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
                        }
                    })

                    await answerCallbackQuery(callbackId, `✅ Offre de ${discount} Dhs envoyée au client!`, token)

                    // Mettre à jour le message en retirant les boutons
                    if (message?.chat?.id && message?.message_id) {
                        const newText = (message.text || '') + `\n\n✅ <b>Offre de -${discount} Dhs envoyée avec succès!</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, newText, token, { inline_keyboard: [] })
                    }

                    return NextResponse.json({ ok: true })
                }

                await answerCallbackQuery(callbackId, '❌ Erreur offre invalide', token)
                return NextResponse.json({ ok: true })
            }
            // ─────────────────────────────────────────────────────────────────

            // ─── Bouton Stock Zéro (depuis les notifications de visite) ──────
            if (data && data.startsWith('zero_stock:')) {
                const parts = data.split(':')
                const bookId = parts[1]

                if (bookId) {
                    await prisma.book.updateMany({
                        where: { id: bookId },
                        data: { stock: 0 }
                    })

                    await answerCallbackQuery(callbackId, `✅ Le stock du livre a été remis à zéro!`, token)

                    // Mettre à jour le message pour indiquer que ça a été fait
                    if (message?.chat?.id && message?.message_id) {
                        const newText = (message.text || '') + `\n\n✅ <b>Stock remis à 0</b>`
                        // On garde les autres boutons (ou on pourrait les enlever si on veut)
                        await editTelegramMessage(message.chat.id, message.message_id, newText, token, { inline_keyboard: message.reply_markup?.inline_keyboard || [] })
                    }

                    return NextResponse.json({ ok: true })
                }
                
                await answerCallbackQuery(callbackId, '❌ Erreur ID livre', token)
                return NextResponse.json({ ok: true })
            }
            // ─────────────────────────────────────────────────────────────────

            // Format attendu: os:{orderId}:{STATUS}
            if (data && data.startsWith('os:')) {
                const parts = data.split(':')
                const orderId = parts[1]
                const newStatus = parts[2]
                
                void(`[TELEGRAM STATUS] Updating order ${orderId} to status: ${newStatus}`)

                if (!STATUS_LABELS[newStatus]) {
                    console.warn(`[TELEGRAM] Status label not found for: ${newStatus}`)
                    await answerCallbackQuery(callbackId, '❌ Statut invalide', token)
                    return NextResponse.json({ ok: true })
                }

                try {
                    const existingOrder = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { items: { include: { pack: { include: { books: true } } } } }
                    })

                    if (!existingOrder) throw new Error('Order not found')

                    const prevStatus = existingOrder.status
                    const isNowReturned = newStatus === 'RETURNED' || newStatus === 'CANCELLED'
                    const wasAlreadyRestored = ['CANCELLED', 'RETURNED'].includes(prevStatus)

                    const order = await prisma.$transaction(async (tx) => {
                        // Restock if needed
                        if (isNowReturned && !wasAlreadyRestored) {
                            for (const item of existingOrder.items) {
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

                        return await tx.order.update({
                            where: { id: orderId },
                            data: {
                                status: newStatus as OrderStatus,
                                statusHistory: {
                                    create: {
                                        status: newStatus as OrderStatus,
                                        comment: 'Statut mis à jour via Telegram Bot',
                                        createdBy: 'TELEGRAM'
                                    }
                                }
                            }
                        })
                    })

                    void(`[TELEGRAM] Order ${orderId} successfully updated to ${newStatus}`)
                    const label = STATUS_LABELS[newStatus]
                    await answerCallbackQuery(callbackId, `✅ Statut : ${label}`, token)

                    const shortId = orderId.slice(0, 8).toUpperCase()
                    const updatedText = `✅ <b>Commande #${shortId}</b>\n\n` +
                        `👤 ${escapeHtml(order.fullName)}\n` +
                        `📍 ${escapeHtml(order.city)}\n` +
                        `💰 ${order.total.toFixed(2)} درهم\n\n` +
                        `📌 <b>Statut :</b> ${label}`

                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token, message.reply_markup)
                    }
                } catch (error) {
                    console.error('[TELEGRAM] Database error during status update:', error)
                    await answerCallbackQuery(callbackId, '❌ Erreur : Commande introuvable ou erreur DB', token)
                }
            }
            
            // Format: sw:{orderId}
            else if (data && data.startsWith('sw:')) {
                const [, orderId] = data.split(':')
                const { syncOrderToWithYou } = await import('@/lib/actions/admin-orders')

                try {
                    const result = await syncOrderToWithYou(orderId)
                    if (result.success) {
                        await answerCallbackQuery(callbackId, `🚀 Expédié WithYou avec succès !`, token)
                        const order = await prisma.order.findUnique({ where: { id: orderId } })
                        if (order && message?.chat?.id && message?.message_id) {
                            const shortId = orderId.slice(0, 8).toUpperCase()
                            const updatedText = `✅ <b>Commande #${shortId} EXPÉDIÉE</b>\n\n` +
                                `👤 ${escapeHtml(order.fullName)}\n` +
                                `📍 ${escapeHtml(order.city)}\n` +
                                `💰 ${order.total.toFixed(2)} درهم\n\n` +
                                `🚀 <b>WithYou Tracking :</b> <code>${order.trackingID}</code>\n` +
                                `📌 <b>Statut :</b> Confirmée`
                            await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                        }
                    } else {
                        await answerCallbackQuery(callbackId, `❌ Erreur : ${result.error}`, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur système : ${error.message}`, token)
                }
            }
            
            else if (data && data.startsWith('jumia_label:')) {
                const [, orderId] = data.split(':')
                const { printJumiaOrderLabelsFull } = await import('@/app/[locale]/admin/jumia-orders/actions')

                try {
                    await answerCallbackQuery(callbackId, `⏳ Impression de l'étiquette #${orderId}...`, token)
                    const printResponse = await printJumiaOrderLabelsFull(orderId)

                    const v2Base64 = printResponse?.success?.labels?.[0]?.label
                    const trackingNumber = printResponse?.success?.labels?.[0]?.trackingNumber
                    const base64Data = v2Base64 || printResponse.document || printResponse.file || printResponse.data || printResponse.pdf
                    const contentType = printResponse.contentType || 'application/pdf'
                    const ext = contentType.includes('zip') ? 'zip' : 'pdf'

                    const { sendTelegramDocument, sendTelegramMessage } = await import('@/lib/telegram')

                    if (typeof base64Data === 'string' && base64Data.length > 50) {
                        const buffer = Buffer.from(base64Data, 'base64')
                        await sendTelegramDocument(
                            buffer,
                            `etiquette_jumia_${orderId}.${ext}`,
                            `🏷️ <b>Étiquette Jumia - Commande #${orderId}</b>\n${trackingNumber ? `📦 Suivi : <code>${trackingNumber}</code>\n` : ''}📄 Document généré avec succès.`,
                            message?.chat?.id?.toString(),
                            token
                        )
                    } else if (printResponse.url || printResponse.link) {
                        await sendTelegramDocument(
                            printResponse.url || printResponse.link,
                            `etiquette_jumia_${orderId}.${ext}`,
                            `🏷️ <b>Étiquette Jumia - Commande #${orderId}</b>`,
                            message?.chat?.id?.toString(),
                            token
                        )
                    } else {
                        await sendTelegramMessage(
                            `⚠️ Étiquette générée pour la commande #${orderId}, mais le fichier PDF n'a pas pu être extrait automatiquement.`,
                            message?.chat?.id?.toString(),
                            token
                        )
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur étiquette : ${error.message}`, token)
                }
            }

            else if (data && data.startsWith('jumia_rts:')) {
                const [, orderId] = data.split(':')
                const { packJumiaOrderFull } = await import('@/app/[locale]/admin/jumia-orders/actions')

                await answerCallbackQuery(callbackId, `⏳ Préparation de la commande ${orderId}...`, token).catch(() => {})

                try {
                    await packJumiaOrderFull(orderId)
                    
                    if (message?.chat?.id) {
                        const successMarkup = {
                            inline_keyboard: [
                                [{ text: '🏷️ Imprimer étiquette', callback_data: `jumia_label:${orderId}` }]
                            ]
                        }

                        if (message.message_id) {
                            const safeText = escapeHtml(message.text || '')
                            const updatedText = safeText + '\n\n✅ <b>Statut mis à jour sur Jumia :</b> Prête à expédier (Ready-to-Ship)'
                            await editTelegramMessage(message.chat.id, message.message_id, updatedText, token, successMarkup).catch(() => {})
                        }

                        await sendTelegramMessage(
                            `✅ <b>Commande ${orderId} prête à expédier</b>\n\nLe statut Ready-to-Ship a été appliqué avec succès sur Jumia.`,
                            message.chat.id.toString(),
                            token,
                            successMarkup
                        )
                    }
                } catch (error: any) {
                    if (message?.chat?.id) {
                        await sendTelegramMessage(
                            `❌ <b>Erreur Jumia pour la commande ${orderId}</b>\n\n${escapeHtml(error.message || 'Erreur inconnue')}`,
                            message.chat.id.toString(),
                            token
                        )
                    }
                }
            }

            else if (data && data.startsWith('upd_stock:')) {
                const bookId = data.split(':')[1]
                const book = await prisma.book.findUnique({ where: { id: bookId } })
                if (!book) {
                    await answerCallbackQuery(callbackId, 'Livre introuvable.', token)
                } else {
                    await answerCallbackQuery(callbackId, 'Instructions envoyées.', token)
                    await sendTelegramMessage(`🔄 Pour mettre à jour le stock de <b>${book.title}</b> :\n\nCopiez et envoyez la commande suivante avec la nouvelle quantité :\n<code>/setstock ${book.id} [quantité]</code>`, message?.chat?.id.toString(), token)
                }
            }
            // Format: jumia:pending_orders | jumia:monthly_stats | jumia:returns_check
            else if (data && data.startsWith('jumia:')) {
                const action = data.split(':')[1]
                try {
                    if (action === 'product_counts') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')

                        const catalogProducts: any[] = []
                        let nextToken: string | undefined
                        let pageCount = 0
                        do {
                            const response = await jumia.getProducts({ size: 50, token: nextToken })
                            const products = response?.products || response?.data?.products || []
                            catalogProducts.push(...products)
                            nextToken = response?.nextToken || response?.data?.nextToken || undefined
                            pageCount++
                            if (products.length === 0 || catalogProducts.length >= 20000 || pageCount >= 400) {
                                nextToken = undefined
                            }
                        } while (nextToken)

                        const [linkedBooks, linkedPacks, linkedAccessories] = await Promise.all([
                            prisma.book.count({ where: { isSyncedWithJumia: true, sellerSku: { not: null } } }),
                            prisma.pack.count({ where: { isSyncedWithJumia: true, sellerSku: { not: null } } }),
                            prisma.extraProduct.count({ where: { isSyncedWithJumia: true, sellerSku: { not: null } } })
                        ])
                        const linkedTotal = linkedBooks + linkedPacks + linkedAccessories
                        const activeCount = catalogProducts.filter(product => {
                            const status = String(product.status || product.Status || product.qcStatus || '').toUpperCase()
                            return ['ACTIVE', 'APPROVED', 'LIVE', 'VALID'].includes(status)
                        }).length

                        await answerCallbackQuery(callbackId, `${catalogProducts.length} produit(s) Jumia`, token)
                        await sendTelegramMessage(
                            `🔢 <b>NOMBRE DE PRODUITS JUMIA</b>\n\n` +
                            `🟠 Catalogue API Jumia : <b>${catalogProducts.length}</b>\n` +
                            (activeCount > 0 ? `✅ Actifs/approuvés détectés : <b>${activeCount}</b>\n` : '') +
                            `\n🔗 <b>Produits liés dans Riwaya : ${linkedTotal}</b>\n` +
                            `📚 Livres : <b>${linkedBooks}</b>\n` +
                            `🎁 Packs : <b>${linkedPacks}</b>\n` +
                            `🛍️ Accessoires : <b>${linkedAccessories}</b>\n\n` +
                            `📊 Écart catalogue/liaisons : <b>${catalogProducts.length - linkedTotal}</b>`,
                            message?.chat?.id.toString(),
                            token
                        )
                    } else if (action === 'low_stock') {
                        const lowStockWhere = {
                            isSyncedWithJumia: true,
                            sellerSku: { not: null as null },
                            jumiaStock: { not: null as null, lte: 3 }
                        }
                        const [books, packs, accessories] = await Promise.all([
                            prisma.book.findMany({
                                where: lowStockWhere,
                                orderBy: { jumiaStock: 'asc' },
                                take: 20,
                                select: { title: true, sellerSku: true, jumiaStock: true, stock: true }
                            }),
                            prisma.pack.findMany({
                                where: lowStockWhere,
                                orderBy: { jumiaStock: 'asc' },
                                take: 20,
                                select: { name: true, sellerSku: true, jumiaStock: true, stock: true }
                            }),
                            prisma.extraProduct.findMany({
                                where: lowStockWhere,
                                orderBy: { jumiaStock: 'asc' },
                                take: 20,
                                select: { name: true, sellerSku: true, jumiaStock: true, stock: true }
                            })
                        ])

                        const products = [
                            ...books.map(product => ({ name: product.title, ...product })),
                            ...packs.map(product => ({ name: product.name, ...product })),
                            ...accessories.map(product => ({ name: product.name, ...product }))
                        ].sort((a, b) => (a.jumiaStock ?? 0) - (b.jumiaStock ?? 0)).slice(0, 30)

                        if (products.length === 0) {
                            await answerCallbackQuery(callbackId, '✅ Aucun stock Jumia faible', token)
                            await sendTelegramMessage('✅ <b>Stock Jumia</b>\n\nAucun produit synchronisé avec un stock inférieur ou égal à 3.', message?.chat?.id.toString(), token)
                        } else {
                            const lines = products.map(product => {
                                const icon = (product.jumiaStock ?? 0) === 0 ? '🔴' : '🟠'
                                return `${icon} <b>${escapeHtml(product.name)}</b>\n   SKU: <code>${escapeHtml(product.sellerSku || 'N/A')}</code> | Jumia: <b>${product.jumiaStock ?? 0}</b> | Local: <b>${product.stock}</b>`
                            })
                            await answerCallbackQuery(callbackId, `${products.length} produit(s) en stock faible`, token)
                            await sendTelegramMessage(
                                `⚠️ <b>STOCK FAIBLE JUMIA (≤ 3)</b>\n\n${lines.join('\n\n')}`,
                                message?.chat?.id.toString(),
                                token
                            )
                        }
                    } else if (action === 'recent_labels') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')

                        const response = await jumia.getOrders(5, undefined, undefined, undefined, undefined, 'createdAt', 'DESC')
                        const orders = (response?.orders || response?.data?.orders || []).slice(0, 5)
                        if (orders.length === 0) {
                            await answerCallbackQuery(callbackId, 'Aucune commande Jumia trouvée', token)
                            await sendTelegramMessage('🏷️ <b>Étiquettes Jumia</b>\n\nAucune commande récente trouvée.', message?.chat?.id.toString(), token)
                        } else {
                            const lines = orders.map((order: any, index: number) => {
                                const number = order.number || order.orderNumber || order.OrderNumber || order.id || 'N/A'
                                const status = getJumiaOrderStatus(order)
                                const date = order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' }) : 'Date inconnue'
                                return `${index + 1}. <b>#${escapeHtml(String(number))}</b> — ${escapeHtml(status)}\n   📅 ${escapeHtml(date)}`
                            })
                            const keyboard = orders.map((order: any) => {
                                const number = order.number || order.orderNumber || order.OrderNumber || order.id || 'Commande'
                                const internalId = order.id || order.orderId || order.OrderId || number
                                return [{
                                    text: `🏷️ Étiquette #${String(number).slice(-18)}`,
                                    callback_data: `jumia_label:${internalId}`
                                }]
                            })
                            await answerCallbackQuery(callbackId, `${orders.length} étiquette(s) disponible(s)`, token)
                            await sendTelegramMessage(
                                `🏷️ <b>5 DERNIÈRES ÉTIQUETTES JUMIA</b>\n\n${lines.join('\n\n')}\n\nChoisissez une commande :`,
                                message?.chat?.id.toString(),
                                token,
                                { inline_keyboard: keyboard }
                            )
                        }
                    } else if (action === 'pending_orders') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const response = await jumia.getOrders(20, undefined, 'PENDING')
                        const orders = response?.orders || response?.data?.orders || []
                        if (orders.length === 0) {
                            await answerCallbackQuery(callbackId, '✅ Aucune commande en attente', token)
                        } else {
                            const lines = orders.slice(0, 10).map((o: any) => {
                                const id = o.number || o.orderId || 'N/A'
                                const amount = o.totalAmountLocal?.value || '?'
                                const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : ''
                                return `📦 #${id} | ${amount} درهم | ${date}`
                            }).join('\n')
                            const keyboard = orders.slice(0, 5).map((o: any) => {
                                const number = o.number || o.orderNumber || o.id
                                const internalId = o.id || o.orderId || number
                                return [{ text: `📦 Préparer #${number}`, callback_data: `jumia_rts:${internalId}` }]
                            })
                            await answerCallbackQuery(callbackId, `${orders.length} commande(s) en attente`, token)
                            await sendTelegramMessage(`🟠 <b>${orders.length} Commande(s) Jumia En Attente</b>\n\n${lines}`, message?.chat?.id.toString(), token, { inline_keyboard: keyboard })
                        }
                    } else if (action === 'last_3_payouts') {
                        const { getJumiaPayoutStatements } = await import('@/app/[locale]/admin/jumia-orders/actions')
                        const data = await getJumiaPayoutStatements({ page: 1, size: 3 })
                        const statements = data?.statements || (Array.isArray(data) ? data : [])
                        
                        if (statements.length === 0) {
                            await answerCallbackQuery(callbackId, '✅ Aucun paiement trouvé', token)
                        } else {
                            const lines = statements.slice(0, 3).map((stmt: any) => {
                                const amount = stmt.payout?.amount ?? stmt.closingBalance ?? stmt.amount ?? '0'
                                const currency = stmt.payout?.currency ?? stmt.currency ?? 'درهم'
                                const dateStr = stmt.createdAt ? new Date(stmt.createdAt).toLocaleDateString('fr-FR') : 'Inconnue'
                                const status = stmt.paid || stmt.status === 'paid' ? '✅ Payé' : '⏳ En attente'
                                const period = stmt.periodStart && stmt.periodEnd 
                                    ? `(${new Date(stmt.periodStart).toLocaleDateString('fr-FR')} - ${new Date(stmt.periodEnd).toLocaleDateString('fr-FR')})` 
                                    : ''
                                return `💰 <b>${amount} ${currency}</b>\n${status} | 📅 ${dateStr} ${period}`
                            }).join('\n\n')
                            
                            await answerCallbackQuery(callbackId, 'Derniers paiements chargés', token)
                            await sendTelegramMessage(`🟠 <b>Les 3 Derniers Paiements Jumia</b>\n\n${lines}`, message?.chat?.id.toString(), token)
                        }
                    } else if (action === 'monthly_stats') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
                        
                        let allOrders: any[] = []
                        let hasMore = true
                        let nextToken: string | undefined = undefined
                        while (hasMore) {
                            const response = await jumia.getOrders(100, nextToken, undefined, monthStart, monthEnd)
                            const orders = response?.orders || response?.data?.orders || []
                            allOrders = allOrders.concat(orders)
                            nextToken = response?.nextToken || response?.data?.nextToken
                            if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                        }
                        
                        const summary = summarizeJumiaOrders(allOrders)
                        const text = `📊 <b>Bilan Jumia — ${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</b>\n\n📦 Commandes valides: <b>${summary.valid}</b> / ${summary.total}\n⏳ En attente: <b>${summary.statusCounts.PENDING || 0}</b>\n✅ Prêt à expédier: <b>${summary.statusCounts.READY_TO_SHIP || 0}</b>\n🚚 Expédiées: <b>${summary.statusCounts.SHIPPED || 0}</b>\n🏁 Livrées: <b>${summary.statusCounts.DELIVERED || 0}</b>\n❌ Annulées/retournées/échouées: <b>${summary.excluded}</b>\n\n💰 CA net: <b>${summary.revenue.toFixed(2)} درهم</b>`
                        await answerCallbackQuery(callbackId, 'Bilan Jumia chargé', token)
                        await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                    } else if (action === 'yearly_stats') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        let allOrders: any[] = []
                        
                        const year = now.getFullYear();
                        const quarters = [
                            { start: `${year}-01-01`, end: `${year}-03-31` },
                            { start: `${year}-04-01`, end: `${year}-06-30` },
                            { start: `${year}-07-01`, end: `${year}-09-30` },
                            { start: `${year}-10-01`, end: `${year}-12-31` }
                        ];

                        await Promise.all(quarters.map(async (q) => {
                            let hasMore = true
                            let nextToken: string | undefined = undefined
                            while (hasMore) {
                                const response: any = await jumia.getOrders(100, nextToken, undefined, q.start, q.end).catch(() => null)
                                if (!response) break;
                                const orders = response?.orders || response?.data?.orders || []
                                allOrders.push(...orders)
                                nextToken = response?.nextToken || response?.data?.nextToken
                                if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                            }
                        }));

                        const summary = summarizeJumiaOrders(allOrders)
                        const text = `📅 <b>Bilan Jumia — Année ${now.getFullYear()}</b>\n\n📦 Commandes valides: <b>${summary.valid}</b> / ${summary.total}\n⏳ En attente: <b>${summary.statusCounts.PENDING || 0}</b>\n✅ Prêt à expédier: <b>${summary.statusCounts.READY_TO_SHIP || 0}</b>\n🚚 Expédiées: <b>${summary.statusCounts.SHIPPED || 0}</b>\n🏁 Livrées: <b>${summary.statusCounts.DELIVERED || 0}</b>\n❌ Annulées/retournées/échouées: <b>${summary.excluded}</b>\n\n💰 CA net: <b>${summary.revenue.toFixed(2)} درهم</b>`
                        await answerCallbackQuery(callbackId, 'Bilan Jumia annuel chargé', token)
                        await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                    } else if (action === 'yearly_chart') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        let allOrders: any[] = []
                        
                        const year = now.getFullYear();
                        const quarters = [
                            { start: `${year}-01-01`, end: `${year}-03-31` },
                            { start: `${year}-04-01`, end: `${year}-06-30` },
                            { start: `${year}-07-01`, end: `${year}-09-30` },
                            { start: `${year}-10-01`, end: `${year}-12-31` }
                        ];

                        await Promise.all(quarters.map(async (q) => {
                            let hasMore = true
                            let nextToken: string | undefined = undefined
                            while (hasMore) {
                                const response: any = await jumia.getOrders(100, nextToken, undefined, q.start, q.end).catch(() => null)
                                if (!response) break;
                                const orders = response?.orders || response?.data?.orders || []
                                allOrders.push(...orders)
                                nextToken = response?.nextToken || response?.data?.nextToken
                                if (!nextToken || orders.length === 0 || allOrders.length > 10000) hasMore = false
                            }
                        }));

                        const monthlyRevenue = Array(12).fill(0)
                        const monthlyTotalOrders = Array(12).fill(0)
                        const monthlyCanceledOrders = Array(12).fill(0)
                        
                        allOrders.forEach(o => {
                            if (o.createdAt && o.status) {
                                const month = new Date(o.createdAt).getMonth()
                                monthlyTotalOrders[month]++
                                
                                if (!isJumiaRevenueOrder(o)) {
                                    monthlyCanceledOrders[month]++
                                } else {
                                    const amount = parseFloat(o.totalAmountLocal?.value || '0')
                                    monthlyRevenue[month] += amount
                                }
                            }
                        })

                        const cancellationRate = monthlyTotalOrders.map((total, i) => total > 0 ? Math.round((monthlyCanceledOrders[i] / total) * 100) : 0)

                        const chartConfig = {
                            type: 'bar',
                            data: {
                                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                                datasets: [
                                    {
                                        type: 'line',
                                        label: 'Taux Annulation (%)',
                                        data: cancellationRate,
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        borderWidth: 2,
                                        fill: false,
                                        yAxisID: 'y1'
                                    },
                                    {
                                        type: 'bar',
                                        label: 'CA Net (درهم)',
                                        data: monthlyRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(255, 153, 0, 0.8)',
                                        borderRadius: 4,
                                        yAxisID: 'y'
                                    }
                                ]
                            },
                            options: {
                                plugins: {
                                    title: { display: true, text: `Évolution CA Jumia & Annulations - ${now.getFullYear()}` }
                                },
                                scales: {
                                    y: { type: 'linear', display: true, position: 'left' },
                                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100 }
                                }
                            }
                        }
                        
                        const chartUrl = `https://quickchart.io/chart?v=3&c=${encodeURIComponent(JSON.stringify(chartConfig))}`
                        
                        const { sendTelegramPhoto } = await import('@/lib/telegram')
                        await sendTelegramPhoto(chartUrl, `📈 <b>Évolution du CA Jumia et Annulations (${now.getFullYear()})</b>`, message?.chat?.id.toString(), token)
                    } else if (action === 'jumia_vs_store_chart') {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (!jumia) throw new Error('Jumia non configuré')
                        const now = new Date()
                        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
                        const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                        
                        await answerCallbackQuery(callbackId, 'Génération comparatif en cours...', token)

                        let allJumiaOrders: any[] = []
                        const year = now.getFullYear();
                        const quarters = [
                            { start: `${year}-01-01`, end: `${year}-03-31` },
                            { start: `${year}-04-01`, end: `${year}-06-30` },
                            { start: `${year}-07-01`, end: `${year}-09-30` },
                            { start: `${year}-10-01`, end: `${year}-12-31` }
                        ];

                        await Promise.all(quarters.map(async (q) => {
                            let hasMore = true
                            let nextToken: string | undefined = undefined
                            while (hasMore) {
                                const response: any = await jumia.getOrders(100, nextToken, undefined, q.start, q.end).catch(() => null)
                                if (!response) break;
                                const orders = response?.orders || response?.data?.orders || []
                                allJumiaOrders.push(...orders)
                                nextToken = response?.nextToken || response?.data?.nextToken
                                if (!nextToken || orders.length === 0 || allJumiaOrders.length > 10000) hasMore = false
                            }
                        }));

                        const monthlyJumiaRevenue = Array(12).fill(0)
                        allJumiaOrders.forEach(o => {
                            if (o.createdAt && o.status && isJumiaRevenueOrder(o)) {
                                const month = new Date(o.createdAt).getMonth()
                                const amount = parseFloat(o.totalAmountLocal?.value || '0')
                                monthlyJumiaRevenue[month] += amount
                            }
                        })

                        const storeOrders = await prisma.order.findMany({
                            where: {
                                createdAt: {
                                    gte: new Date(yearStart),
                                    lte: new Date(yearEnd + 'T23:59:59Z')
                                }
                            },
                            select: { total: true, createdAt: true, status: true }
                        })

                        const monthlyStoreRevenue = Array(12).fill(0)
                        storeOrders.forEach(o => {
                            if (o.status !== 'CANCELLED' && o.status !== 'RETURNED') {
                                const month = o.createdAt.getMonth()
                                monthlyStoreRevenue[month] += o.total
                            }
                        })

                        const chartConfig = {
                            type: 'bar',
                            data: {
                                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                                datasets: [
                                    {
                                        label: 'Boutique (درهم)',
                                        data: monthlyStoreRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                                        borderRadius: 4
                                    },
                                    {
                                        label: 'Jumia (درهم)',
                                        data: monthlyJumiaRevenue.map(v => Math.round(v)),
                                        backgroundColor: 'rgba(255, 153, 0, 0.8)',
                                        borderRadius: 4
                                    }
                                ]
                            },
                            options: {
                                plugins: {
                                    title: { display: true, text: `Comparatif Jumia vs Boutique - ${now.getFullYear()}` }
                                }
                            }
                        }
                        
                        const chartUrl = `https://quickchart.io/chart?v=3&c=${encodeURIComponent(JSON.stringify(chartConfig))}`
                        
                        const { sendTelegramPhoto } = await import('@/lib/telegram')
                        await sendTelegramPhoto(chartUrl, `📊 <b>Comparatif Jumia vs Boutique (${now.getFullYear()})</b>`, message?.chat?.id.toString(), token)
                    } else if (action === 'returns_check') {
                        await answerCallbackQuery(callbackId, '🔄 Vérification en cours, merci de patienter...', token)
                        try {
                            const res = await callProtectedCron('/api/cron/jumia-returns-alert')
                            const data = await res.json()
                            
                            if (data.success) {
                                let resultMsg = `🔄 <b>Bilan de la vérification Jumia</b>\n\n`
                                resultMsg += `↩️ Retours détectés : <b>${data.returned || 0}</b>\n`
                                resultMsg += `❌ Annulations : <b>${data.canceled || 0}</b>\n`
                                resultMsg += `📦 Stocks réintégrés (Nouveaux) : <b>${data.restored || 0}</b>`
                                
                                await sendTelegramMessage(resultMsg, message?.chat?.id.toString(), token)
                            } else {
                                await sendTelegramMessage(`❌ Erreur lors de la vérification: ${data.error}`, message?.chat?.id.toString(), token)
                            }
                        } catch (err: any) {
                            await sendTelegramMessage(`❌ Impossible de contacter l'API: ${err.message}`, message?.chat?.id.toString(), token)
                        }
                    } else if (action === 'status_check') {
                        await answerCallbackQuery(callbackId, '🔄 Vérification des statuts Jumia...', token)
                        try {
                            const res = await callProtectedCron('/api/cron/jumia-status-changes')
                            const data = await res.json()
                            if (data.success) {
                                await sendTelegramMessage(
                                    `🚚 <b>Vérification Statuts Jumia Terminée</b>\n\n` +
                                    `📦 Commandes vérifiées : <b>${data.inspectedCount || 0}</b>\n` +
                                    `🔄 Changements notifiés : <b>${data.changedCount || 0}</b>`,
                                    message?.chat?.id.toString(),
                                    token
                                )
                            } else {
                                await sendTelegramMessage(`❌ Erreur vérification Jumia: ${data.error || 'Erreur inconnue'}`, message?.chat?.id.toString(), token)
                            }
                        } catch (err: any) {
                            await sendTelegramMessage(`❌ Erreur contact cron Jumia: ${err.message}`, message?.chat?.id.toString(), token)
                        }
                    } else if (action === 'sync_order_stock') {
                        const orderInternalId = data.split(':').slice(2).join(':')
                        await answerCallbackQuery(callbackId, '🔄 Synchronisation des articles commandés...', token)
                        try {
                            const { JumiaAPI } = await import('@/lib/jumia-api')
                            const jumia = await JumiaAPI.getInstance()
                            if (!jumia) throw new Error('Jumia non configuré')

                            const response = await jumia.getOrderItems(orderInternalId)
                            const containers = Array.isArray(response)
                                ? response
                                : response?.data && Array.isArray(response.data)
                                    ? response.data
                                    : [response?.data || response]
                            const items = containers.flatMap((container: any) => {
                                if (Array.isArray(container)) return container
                                return container?.orderItems || container?.items || container?.data?.orderItems || container?.data?.items || []
                            })
                            const sellerSkus = Array.from(new Set(items.map((item: any) =>
                                item.product?.sellerSku || item.Sku || item.sellerSku || item.SellerSku || item.sku || item.shopSku
                            ).filter(Boolean))) as string[]

                            if (sellerSkus.length === 0) throw new Error('Aucun SKU trouvé dans cette commande')

                            const updates: Array<{ sellerSku: string; id?: string; stock: number }> = []
                            for (const sellerSku of sellerSkus) {
                                const [book, extraProduct, pack, productResponse] = await Promise.all([
                                    prisma.book.findUnique({ where: { sellerSku }, select: { stock: true } }),
                                    prisma.extraProduct.findUnique({ where: { sellerSku }, select: { stock: true } }),
                                    prisma.pack.findUnique({
                                        where: { sellerSku },
                                        include: { books: { include: { book: { select: { stock: true } } } } }
                                    }),
                                    jumia.getProducts({ sellerSku })
                                ])
                                const packStock = pack?.books.length
                                    ? Math.min(...pack.books.map(packBook => packBook.book.stock))
                                    : undefined
                                const stock = book?.stock ?? extraProduct?.stock ?? packStock
                                if (typeof stock !== 'number') continue

                                const product = productResponse?.products?.[0]
                                    || productResponse?.data?.products?.[0]
                                    || productResponse?.data?.[0]
                                    || productResponse?.[0]
                                updates.push({ sellerSku, id: product?.id, stock })
                            }

                            if (updates.length === 0) throw new Error('Aucun SKU de la commande n’est lié à un produit Riwaya')

                            await jumia.updateProductsStock(updates)
                            const details = updates
                                .map(update => `• <code>${escapeHtml(update.sellerSku)}</code> → stock <b>${update.stock}</b>`)
                                .join('\n')
                            await sendTelegramMessage(
                                `✅ <b>Stock Jumia synchronisé</b>\n\n${details}\n\nSeuls les articles de cette commande ont été modifiés.`,
                                message?.chat?.id.toString(),
                                token
                            )
                        } catch (err: any) {
                            await sendTelegramMessage(`❌ Erreur de synchronisation ciblée: ${escapeHtml(err.message)}`, message?.chat?.id.toString(), token)
                        }
                    } else if (action === 'sync_stock') {
                        await answerCallbackQuery(callbackId, '🔄 Synchronisation en cours, cela peut prendre un moment...', token)
                        try {
                            const { syncAllJumiaStock } = await import('@/app/[locale]/admin/jumia-orders/actions')
                            const result = await syncAllJumiaStock()
                            if (result && result.success) {
                                await sendTelegramMessage(`✅ <b>Synchronisation réussie</b>\n\n${result.count} produit(s) mis à jour sur Jumia depuis le stock local.`, message?.chat?.id.toString(), token)
                            } else {
                                await sendTelegramMessage(`❌ Erreur de synchronisation: ${result?.error || 'Erreur inconnue'}`, message?.chat?.id.toString(), token)
                            }
                        } catch (err: any) {
                            await sendTelegramMessage(`❌ Erreur: ${err.message}`, message?.chat?.id.toString(), token)
                        }
                    } else if (action === 'skip_sync') {
                        await answerCallbackQuery(callbackId, 'Stock non synchronisé.', token)
                    }
                } catch (err: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur: ${err.message}`, token)
                }
            }
            
            // Format: promo_flash:{bookId}
            else if (data && data.startsWith('promo_flash:')) {
                const [, bookId] = data.split(':')
                try {
                    const book = await prisma.book.findUnique({ where: { id: bookId } })
                    if (!book) throw new Error('Livre introuvable')
                    
                    const newPrice = Math.round(book.price * 0.9) // -10%
                    await prisma.book.update({
                        where: { id: bookId },
                        data: { price: newPrice }
                    })

                    await answerCallbackQuery(callbackId, `🏷️ Promo appliquée : ${newPrice} درهم`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `🏷️ <b>PROMO FLASH APPLIQUÉE (-10%)</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `💰 <b>Ancien prix:</b> ${book.price} درهم\n` +
                                            `🔥 <b>Nouveau prix:</b> ${newPrice} درهم\n` +
                                            `📦 <b>Stock:</b> ${book.stock}`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: jumia_rts:{orderNumber}
            else if (data && data.startsWith('jumia_rts:')) {
                const [, orderNumber] = data.split(':')
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (!jumia) throw new Error('Jumia non configuré')
                    
                    const itemsResponse = await jumia.getOrderItems(orderNumber)
                    const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    const orderItemIds = items.map((i: any) => i.orderItemId)

                    if (orderItemIds.length === 0) throw new Error('Aucun article trouvé')

                    await jumia.packOrders({ orderItemIds, deliveryType: 'dropship' })
                    
                    const providersResponse = await jumia.getShipmentProviders(orderItemIds)
                    const providers = providersResponse?.shipmentProviders || providersResponse?.data?.shipmentProviders || []
                    const defaultProvider = providers.length > 0 ? providers[0].name : ''

                    await jumia.readyToShipOrders({
                        orderItemIds,
                        deliveryType: 'dropship',
                        shipmentProvider: defaultProvider,
                        trackingNumber: ''
                    })

                    await answerCallbackQuery(callbackId, `✅ Commande ${orderNumber} passée en Ready to Ship`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `✅ <b>Commande Jumia prête à expédier (RTS)</b>\n\n🆔 Commande: <b>${orderNumber}</b>`
                        const updatedMarkup = {
                            inline_keyboard: [
                                [{ text: '🏷️ Imprimer étiquette', callback_data: `jumia_label:${orderNumber}` }]
                            ]
                        }
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token, updatedMarkup)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur RTS : ${error.message}`, token)
                }
            }

            // Format: jumia_cancel:{orderNumber}
            else if (data && data.startsWith('jumia_cancel:')) {
                const [, orderNumber] = data.split(':')
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (!jumia) throw new Error('Jumia non configuré')
                    
                    const itemsResponse = await jumia.getOrderItems(orderNumber)
                    const items = itemsResponse?.orderItems || itemsResponse?.data?.orderItems || []
                    const orderItemIds = items.map((i: any) => i.orderItemId)

                    if (orderItemIds.length === 0) throw new Error('Aucun article trouvé')

                    await jumia.cancelOrders(orderItemIds)
                    
                    await answerCallbackQuery(callbackId, `❌ Commande ${orderNumber} annulée`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `❌ <b>Commande Jumia annulée</b>\n\n🆔 Commande: <b>${orderNumber}</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur Annulation : ${error.message}`, token)
                }
            }

            // Format: restock:{bookId}:{amount}
            else if (data && data.startsWith('restock:')) {
                const [, bookId, amount] = data.split(':')
                try {
                    const book = await prisma.book.update({
                        where: { id: bookId },
                        data: { stock: { increment: parseInt(amount) } }
                    })
                    await answerCallbackQuery(callbackId, `📦 Stock mis à jour : ${book.stock}`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `✅ <b>RÉAPPROVISIONNEMENT EFFECTUÉ</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `📦 <b>Nouveau stock:</b> <b>${book.stock}</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: hide_book:{bookId}
            else if (data && data.startsWith('hide_book:')) {
                const [, bookId] = data.split(':')
                try {
                    const book = await prisma.book.update({
                        where: { id: bookId },
                        data: { active: false }
                    })
                    await answerCallbackQuery(callbackId, `🚫 Livre masqué du site`, token)
                    if (message?.chat?.id && message?.message_id) {
                        const updatedText = `🚫 <b>LIVRE MASQUÉ DU SITE</b>\n\n` +
                                            `📖 <b>Livre:</b> ${escapeHtml(book.title)}\n` +
                                            `📌 Statut: <b>INACTIF</b>`
                        await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }
            
            // Format: gen_creative:{orderId}
            else if (data && data.startsWith('gen_creative:')) {
                const [, orderId] = data.split(':')
                try {
                    const order = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { items: { include: { book: true, pack: true } } }
                    })
                    
                    if (!order || order.items.length === 0) throw new Error('Commande ou articles introuvables')
                    
                    const firstItem = order.items[0]
                    const itemId = firstItem.bookId || firstItem.packId
                    const itemType = firstItem.bookId ? 'BOOK' : 'PACK'

                    const shortType = itemType === 'PACK' ? 'P' : 'B'
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '📸 Instagram', callback_data: `pub_c:${itemId}:${shortType}:ig` },
                                { text: '📘 Facebook', callback_data: `pub_c:${itemId}:${shortType}:fb` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_c:${itemId}:${shortType}:tt` },
                                { text: '✈️ Telegram', callback_data: `pub_c:${itemId}:${shortType}:tg` }
                            ],
                            [
                                { text: '🧵 Threads', callback_data: `pub_c:${itemId}:${shortType}:th` },
                                { text: '🌍 Toutes (All)', callback_data: `pub_c:${itemId}:${shortType}:all` }
                            ]
                        ]
                    }

                    await answerCallbackQuery(callbackId, `📱 Choisissez la plateforme`, token)
                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, `📱 <b>Destination du Visuel</b>\n\nSur quelle plateforme souhaitez-vous publier ce visuel ?`, token, replyMarkup)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: pub_c:{id}:{type}:{platform}
            else if (data && data.startsWith('pub_c:')) {
                const [, itemId, shortType, shortPlatform] = data.split(':')
                const itemType = shortType === 'P' ? 'PACK' : 'BOOK'
                const platformMap: any = { ig: 'instagram', fb: 'facebook', tt: 'tiktok', tg: 'telegram', th: 'threads', all: 'all' }
                const platform = platformMap[shortPlatform] || 'instagram'

                try {
                    let item: any = null;
                    let imageUrl = '';
                    let title = 'Riwaya';

                    if (itemId && itemId.length === 36 && itemId.includes('-')) {
                        if (itemType === 'BOOK') {
                            item = await prisma.book.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.title; }
                        } else if (itemType === 'PACK') {
                            item = await prisma.pack.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.name; }
                        }
                    } else if (itemId && itemId !== 'manual') {
                        const fs = require('fs').promises
                        const path = require('path')
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                        try {
                            const files = await fs.readdir(uploadDir)
                            const matchedFile = files.find((f: string) => f.startsWith(itemId))
                            if (matchedFile) {
                                imageUrl = `/uploads/books/${matchedFile}`
                                title = matchedFile
                            } else {
                                imageUrl = `/uploads/books/${itemId}`
                                title = itemId
                            }
                        } catch (err) {
                            imageUrl = `/uploads/books/${itemId}`
                            title = itemId
                        }
                    }

                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                    }

                    const isVideo = imageUrl.toLowerCase().endsWith('.mp4') || imageUrl.toLowerCase().endsWith('.mov') || imageUrl.toLowerCase().endsWith('.webm')


                    const customCaptionSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_custom_caption' } })
                    const customCaption = customCaptionSetting?.value
                    
                    const finalCaption = (customCaption && customCaption.length > 0) ? customCaption : (item?.description || title)

                    const baseItem = {
                        itemId: item?.id || 'marketing',
                        itemType,
                        title: title,
                        author: item?.author || 'Riwaya',
                        price: item?.price || 0,
                        category: item?.category || 'Promotion',
                        image: imageUrl,
                        isVideo,
                        isPack: itemType === 'PACK',
                        bookUrl: itemType === 'BOOK' && item ? `${baseUrl}/fr/books/${item.id}` : '',
                        packUrl: itemType === 'PACK' && item ? `${baseUrl}/fr/packs` : '',
                        itemUrl: item ? (itemType === 'BOOK' ? `${baseUrl}/fr/books/${item.id}` : `${baseUrl}/fr/packs`) : baseUrl,
                        caption: finalCaption,
                        format: 'story',
                        source: 'telegram-bot-action',
                        
                        facebook_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'facebook_access_token' } }))?.value,
                        instagram_account_id: (await prisma.siteSettings.findUnique({ where: { key: 'marketing_instagram_id' } }))?.value,
                        tiktok_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_access_token' } }))?.value,
                        tiktok_creator_id: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_creator_id' } }))?.value,
                        tiktok_app_id: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_app_id' } }))?.value,
                        tiktok_client_secret: (await prisma.siteSettings.findUnique({ where: { key: 'tiktok_client_secret' } }))?.value
                    }

                    const n8nWebhookUrl = (await prisma.siteSettings.findUnique({ where: { key: 'n8n_webhook_url' } }))?.value || process.env.N8N_WEBHOOK_URL
                    if (!n8nWebhookUrl) throw new Error('n8n non configuré')

                    await answerCallbackQuery(callbackId, `🚀 Publication ${platform} lancée...`, token)

                    let platformsArray = ['facebook']
                    if (platform === 'both' || platform === 'all') {
                        platformsArray = ['facebook', 'instagram', 'tiktok', 'threads']
                    } else if (platform) {
                        platformsArray = [platform]
                    }

                    const payload = {
                        batch: platformsArray.map(p => ({
                            ...baseItem,
                            platform: p
                        }))
                    }

                    fetch(n8nWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).catch(console.error)

                    if (customCaption) {
                        await prisma.siteSettings.update({ where: { key: 'telegram_custom_caption' }, data: { value: '' } })
                    }

                    if (message?.chat?.id && message?.message_id) {
                        await editTelegramMessage(message.chat.id, message.message_id, `⏳ <b>Génération en cours...</b>\n\nVotre visuel pour <b>${platform.toUpperCase()}</b> est en cours de création via n8n.`, token)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }

            // Format: prep_c:{itemId}:{itemType}
            else if (data && data.startsWith('prep_c:')) {
                const [, itemId, shortType] = data.split(':')
                try {
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '👁️ Voir l\'image', callback_data: `view_c:${itemId}:${shortType}` }
                            ],
                            [
                                { text: '📸 Instagram', callback_data: `pub_c:${itemId}:${shortType}:ig` },
                                { text: '📘 Facebook', callback_data: `pub_c:${itemId}:${shortType}:fb` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_c:${itemId}:${shortType}:tt` },
                                { text: '✈️ Telegram', callback_data: `pub_c:${itemId}:${shortType}:tg` }
                            ],
                            [
                                { text: '🧵 Threads', callback_data: `pub_c:${itemId}:${shortType}:th` },
                                { text: '🌍 Toutes (All)', callback_data: `pub_c:${itemId}:${shortType}:all` }
                            ],
                            [
                                { text: '✏️ Légende Personnalisée', callback_data: `caption_info` }
                            ]
                        ]
                    }
                    if (message?.chat?.id && message?.message_id) {
                        await answerCallbackQuery(callbackId, `📱 Options du visuel`, token)
                        await editTelegramMessage(message.chat.id, message.message_id, `📱 <b>Options du Visuel</b>\n\nQue souhaitez-vous faire ?`, token, replyMarkup)
                    }
                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur: ${error.message}`, token)
                }
            }
            
            // Format: view_c:{itemId}:{shortType}
            else if (data && data.startsWith('view_c:')) {
                const [, itemId, shortType] = data.split(':')
                const itemType = shortType === 'P' ? 'PACK' : 'BOOK'
                try {
                    let item: any = null;
                    let imageUrl = '';
                    let title = 'Riwaya';

                    if (itemId && itemId.length === 36 && itemId.includes('-')) {
                        if (itemType === 'BOOK') {
                            item = await prisma.book.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.title; }
                        } else if (itemType === 'PACK') {
                            item = await prisma.pack.findUnique({ where: { id: itemId } })
                            if (item) { imageUrl = item.image; title = item.name; }
                        }
                    } else if (itemId && itemId !== 'manual') {
                        const fs = require('fs').promises
                        const path = require('path')
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                        try {
                            const files = await fs.readdir(uploadDir)
                            const matchedFile = files.find((f: string) => f.startsWith(itemId))
                            if (matchedFile) {
                                imageUrl = `/uploads/books/${matchedFile}`
                                title = matchedFile
                            } else {
                                imageUrl = `/uploads/books/${itemId}`
                                title = itemId
                            }
                        } catch (err) {
                            imageUrl = `/uploads/books/${itemId}`
                            title = itemId
                        }
                    }

                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
                    }

                    await answerCallbackQuery(callbackId, `Envoi de l'image...`, token)
                    
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '📸 Instagram', callback_data: `pub_c:${itemId}:${shortType}:ig` },
                                { text: '📘 Facebook', callback_data: `pub_c:${itemId}:${shortType}:fb` }
                            ],
                            [
                                { text: '🎵 TikTok', callback_data: `pub_c:${itemId}:${shortType}:tt` },
                                { text: '✈️ Telegram', callback_data: `pub_c:${itemId}:${shortType}:tg` }
                            ]
                        ]
                    }

                    const { sendTelegramPhoto } = await import('@/lib/telegram')
                    await sendTelegramPhoto(imageUrl, `👁️ Aperçu : <b>${title}</b>`, message?.chat?.id.toString(), token, replyMarkup)

                } catch (error: any) {
                    await answerCallbackQuery(callbackId, `❌ Erreur : ${error.message}`, token)
                }
            }
            
            // Format: caption_info
            else if (data === 'caption_info') {
                await answerCallbackQuery(callbackId, `Comment ajouter une légende`, token)
                if (message?.chat?.id) {
                    await sendTelegramMessage(`✏️ <b>Pour personnaliser la légende :</b>\n\nEnvoyez simplement un message dans ce chat commençant par <code>#legende</code>.\n\nExemple :\n<code>#legende 🔥 Ne ratez pas notre promotion ! Lien en bio.</code>\n\nUne fois enregistrée, la légende sera utilisée pour votre prochaine publication.`, message.chat.id.toString(), token)
                }
            }
            
            // Format: approve_review:{reviewId}
            else if (data && data.startsWith('approve_review:')) {
                const [, reviewId] = data.split(':')
                const review = await prisma.review.update({
                    where: { id: reviewId },
                    data: { isApproved: true },
                    include: { book: { select: { title: true } } }
                })
                
                await answerCallbackQuery(callbackId, '✅ Avis approuvé !', token)
                const updatedText = `✅ <b>Avis Approuvé</b>\n\n` +
                    `👤 <b>Client:</b> ${review.fullName}\n` +
                    `📖 <b>Livre:</b> ${review.book.title}\n` +
                    `⭐ <b>Note:</b> ${review.rating}/5\n` +
                    `💬 <i>${review.comment}</i>`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: delete_review:{reviewId}
            else if (data && data.startsWith('delete_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.delete({ where: { id: reviewId } })
                
                await answerCallbackQuery(callbackId, '🗑️ Avis supprimé !', token)
                const updatedText = `🗑️ <b>Avis Supprimé</b>\n\nL'avis a été définitivement retiré.`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: auth_approve:{requestId}
            else if (data && data.startsWith('auth_approve:')) {
                const [, requestId] = data.split(':')
                const request = await prisma.adminAuthRequest.findUnique({ where: { id: requestId } })
                const updated = await prisma.adminAuthRequest.updateMany({
                    where: {
                        id: requestId,
                        status: 'PENDING',
                        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
                    },
                    data: { status: 'APPROVED' }
                })

                if (!request || updated.count !== 1) {
                    await answerCallbackQuery(callbackId, 'Demande expirée ou déjà traitée.', token)
                    return NextResponse.json({ ok: true })
                }
                
                await answerCallbackQuery(callbackId, '✅ Connexion approuvée !', token)
                const updatedText = `✅ <b>Demande d'accès Approuvée</b>\n\n` +
                    `👤 <b>Utilisateur:</b> ${escapeHtml(request.email)}\n` +
                    `🌐 <b>IP:</b> ${request.ip}\n` +
                    `🕒 <b>Heure:</b> ${new Date().toLocaleString('fr-FR')}`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }

            // Format: auth_reject:{requestId}
            else if (data && data.startsWith('auth_reject:')) {
                const [, requestId] = data.split(':')
                const request = await prisma.adminAuthRequest.findUnique({ where: { id: requestId } })
                const updated = await prisma.adminAuthRequest.updateMany({
                    where: {
                        id: requestId,
                        status: 'PENDING',
                        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
                    },
                    data: { status: 'REJECTED' }
                })

                if (!request || updated.count !== 1) {
                    await answerCallbackQuery(callbackId, 'Demande expirée ou déjà traitée.', token)
                    return NextResponse.json({ ok: true })
                }
                
                await answerCallbackQuery(callbackId, '❌ Connexion refusée !', token)
                const updatedText = `❌ <b>Demande d'accès Refusée</b>\n\n` +
                    `👤 <b>Utilisateur:</b> ${escapeHtml(request.email)}\n` +
                    `🌐 <b>IP:</b> ${request.ip}\n` +
                    `🕒 <b>Heure:</b> ${new Date().toLocaleString('fr-FR')}`

                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, updatedText, token)
                }
            }
            
            // Format: approve_review:{reviewId}
            else if (data && data.startsWith('approve_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.update({ where: { id: reviewId }, data: { isApproved: true } })
                await answerCallbackQuery(callbackId, '✅ Avis approuvé !', token)
                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, `✅ <b>Avis approuvé avec succès.</b>`, token)
                }
            }

            // Format: delete_review:{reviewId}
            else if (data && data.startsWith('delete_review:')) {
                const [, reviewId] = data.split(':')
                await prisma.review.delete({ where: { id: reviewId } })
                await answerCallbackQuery(callbackId, '🗑️ Avis supprimé !', token)
                if (message?.chat?.id && message?.message_id) {
                    await editTelegramMessage(message.chat.id, message.message_id, `🗑️ <b>Avis supprimé.</b>`, token)
                }
            }
            
            // Format: month_orders:{year}:{month}
            else if (data && data.startsWith('month_orders:')) {
                const [, yearStr, monthStr] = data.split(':')
                const year = parseInt(yearStr)
                const month = parseInt(monthStr)
                const start = new Date(year, month, 1)
                const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
                
                const siteOrders = await prisma.order.findMany({
                    where: { createdAt: { gte: start, lte: end } },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, status: true }
                })
                
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                const label = `${months[month]} ${year}`
                
                let orderText = `📦 <b>Détails des Commandes - ${label}</b>\n\n`
                orderText += `🔵 <b>SITE WEB :</b>\n`
                let siteCount = 0
                
                for (const o of siteOrders) {
                    if (orderText.length > 3700) {
                        orderText += `\n... (Liste tronquée pour cause de limite de texte Telegram)\n`
                        break
                    }
                    orderText += `• #${o.id.substring(0, 8)} - ${o.status}\n`
                    siteCount++
                }
                orderText += `\nTotal Site: <b>${siteOrders.length}</b> commandes\n\n`

                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (jumia) {
                        orderText += `🟠 <b>JUMIA :</b>\n`
                        const createdAfter = start.toISOString().split('T')[0]
                        const createdBefore = end.toISOString().split('T')[0]
                        const response = await jumia.getOrders(500, undefined, undefined, createdAfter, createdBefore)
                        const jumiaOrders = response?.orders || response?.data?.orders || []
                        
                        let jumiaCount = 0
                        for (const o of jumiaOrders) {
                            if (orderText.length > 3700) {
                                orderText += `\n... (Liste tronquée pour cause de limite de texte Telegram)\n`
                                break
                            }
                            const status = (o.status || o.Status || '').toUpperCase()
                            orderText += `• ${o.OrderNumber || o.orderNumber} - ${status}\n`
                            jumiaCount++
                        }
                        orderText += `\nTotal Jumia: <b>${jumiaOrders.length}</b> commandes\n\n`
                        orderText += `Total Global: <b>${siteOrders.length + jumiaOrders.length}</b> commandes`
                    }
                } catch (e) {
                    console.error('Erreur stats Jumia:', e)
                    orderText += `\n⚠️ Impossible de charger les commandes Jumia.`
                }
                
                await answerCallbackQuery(callbackId, `Détails ${label} générés`, token)
                await sendTelegramMessage(orderText, message?.chat?.id.toString(), token)
            }
            
            // Format: stats:{period}
            else if (data && data.startsWith('stats:') && !['stats:recent_orders', 'stats:compare_months', 'stats:all_time', 'stats:yearly_chart'].includes(data)) {
                const [, period] = data.split(':')
                const now = new Date()
                let start = new Date(now.setHours(0, 0, 0, 0))
                let end = new Date(now.setHours(23, 59, 59, 999))
                let label = "Aujourd'hui"

                if (period === 'yesterday') {
                    start = new Date(now.setDate(now.getDate() - 1))
                    start.setHours(0,0,0,0)
                    end = new Date(start)
                    end.setHours(23,59,59,999)
                    label = "Hier"
                } else if (period === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    label = "Ce Mois"
                } else if (period === '30days') {
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    thirtyDaysAgo.setHours(0,0,0,0)
                    start = thirtyDaysAgo
                    label = "30 Derniers Jours"
                } else if (period === '3months') {
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                    threeMonthsAgo.setHours(0,0,0,0)
                    start = threeMonthsAgo
                    label = "3 Derniers Mois"
                } else if (period === '1year') {
                    const oneYearAgo = new Date()
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
                    oneYearAgo.setHours(0,0,0,0)
                    start = oneYearAgo
                    label = "1 An"
                }

                if (period === 'top5' || period === 'top10') {
                    const limit = period === 'top10' ? 10 : 5;
                    const topBooks = await prisma.orderItem.groupBy({
                        by: ['bookId'],
                        where: { bookId: { not: null }, order: { status: { not: 'CANCELLED' } } },
                        _count: { bookId: true },
                        orderBy: { _count: { bookId: 'desc' } },
                        take: limit
                    })

                    const books = await Promise.all(topBooks.map(async (item) => {
                        const book = await prisma.book.findUnique({ where: { id: item.bookId! }, select: { title: true } })
                        return `🏆 <b>${book?.title || 'Livre inconnu'}</b> : ${item._count.bookId} ventes`
                    }))

                    const title = limit === 10 ? "TOP 10 DES VENTES" : "TOP 5 DES VENTES";
                    const text = `🥇 <b>${title}</b>\n\n${books.join('\n')}`
                    await answerCallbackQuery(callbackId, `🏆 Top ${limit} généré`, token)
                    await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                } else {
                    // Récupérer les paramètres pour savoir quoi afficher
                    const showVisitors = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_visitors' } }))?.value === 'true'
                    const showRegistrations = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_registrations' } }))?.value === 'true'
                    const showViews = (await prisma.siteSettings.findUnique({ where: { key: 'telegram_stats_top_views' } }))?.value === 'true'

                    const [orderStats, visitors, registrations] = await Promise.all([
                        prisma.order.groupBy({
                            by: ['status'],
                            where: { createdAt: { gte: start, lte: end } },
                            _count: true,
                            _sum: { total: true }
                        }),
                        showVisitors ? prisma.pageView.groupBy({
                            by: ['sessionId'],
                            where: { createdAt: { gte: start, lte: end } }
                        }).then(res => res.length) : Promise.resolve(0),
                        showRegistrations ? prisma.user.count({
                            where: { createdAt: { gte: start, lte: end }, role: 'USER' }
                        }) : Promise.resolve(0)
                    ])

                    let siteStats = { count: 0, revenue: 0, pending: 0, shipped: 0, delivered: 0, canceled: 0 }
                    for (const stat of orderStats) {
                        const status = stat.status;
                        const count = stat._count;
                        const revenue = stat._sum.total || 0;
                        
                        siteStats.count += count;
                        
                        if (status !== 'CANCELLED') {
                            siteStats.revenue += revenue;
                        }
                        
                        if (status === 'PENDING') siteStats.pending += count;
                        else if (status === 'SHIPPED') siteStats.shipped += count;
                        else if (status === 'DELIVERED') siteStats.delivered += count;
                        else if (status === 'CANCELLED') siteStats.canceled += count;
                    }

                    let jumiaStats = { count: 0, revenue: 0, pending: 0, shipped: 0, delivered: 0, canceled: 0 }
                    let jumiaStatsError: string | null = null
                    try {
                        const { JumiaAPI } = await import('@/lib/jumia-api')
                        const jumia = await JumiaAPI.getInstance()
                        if (jumia) {
                            const formatLocalDate = (date: Date) => {
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                return `${year}-${month}-${day}`
                            }
                            const createdAfter = formatLocalDate(start)
                            const createdBefore = formatLocalDate(end)
                            const isToday = period === 'today'
                            const allJumiaOrders: JumiaReportOrder[] = []
                            let nextToken: string | undefined
                            let pageCount = 0

                            do {
                                // Une borne future peut faire renvoyer une liste vide par Jumia.
                                // Pour aujourd'hui, charger les plus récentes puis filtrer au Maroc.
                                const response = await jumia.getOrders(
                                    100,
                                    nextToken,
                                    undefined,
                                    isToday ? undefined : createdAfter,
                                    isToday ? undefined : createdBefore,
                                    'createdAt',
                                    'DESC'
                                )
                                const pageOrders = response?.orders || response?.data?.orders || []
                                allJumiaOrders.push(...pageOrders)
                                nextToken = response?.nextToken || response?.data?.nextToken || undefined
                                pageCount++
                                if (pageOrders.length === 0 || allJumiaOrders.length >= 10000 || pageCount >= 20) {
                                    nextToken = undefined
                                }
                            } while (nextToken)

                            const moroccoDate = new Intl.DateTimeFormat('en-CA', {
                                timeZone: 'Africa/Casablanca',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            })
                            const targetDay = moroccoDate.format(new Date())
                            const jumiaOrders = isToday
                                ? allJumiaOrders.filter(order => {
                                    const rawDate = order.createdAt || order.CreatedAt || order.created_at || order.orderDate || order.OrderDate
                                    if (typeof rawDate !== 'string' && typeof rawDate !== 'number' && !(rawDate instanceof Date)) return false
                                    const orderDate = new Date(rawDate)
                                    return !Number.isNaN(orderDate.getTime()) && moroccoDate.format(orderDate) === targetDay
                                })
                                : allJumiaOrders
                            const summary = summarizeJumiaOrders(jumiaOrders)
                            jumiaStats = {
                                count: summary.valid,
                                revenue: summary.revenue,
                                pending: summary.statusCounts.PENDING || 0,
                                shipped: (summary.statusCounts.SHIPPED || 0) + (summary.statusCounts.READY_TO_SHIP || 0),
                                delivered: summary.statusCounts.DELIVERED || 0,
                                canceled: summary.excluded
                            }
                        } else {
                            jumiaStatsError = 'Jumia non configuré'
                        }
                    } catch (e) {
                        console.error('Erreur stats Jumia:', e)
                        jumiaStatsError = 'Données Jumia indisponibles'
                    }

                    let text = `📊 <b>RAPPORT : ${label.toUpperCase()}</b>\n\n` +
                               `🔵 <b>SITE WEB :</b>\n` +
                               `📦 Commandes Total : <b>${siteStats.count}</b>\n` +
                               `💰 CA Total : <b>${siteStats.revenue.toFixed(2)} درهم</b>\n` +
                               `⏳ En attente : ${siteStats.pending}\n` +
                               `🚚 En expédition : ${siteStats.shipped}\n` +
                               `✅ Livrées : ${siteStats.delivered}\n` +
                               `❌ Annulées/Retours : ${siteStats.canceled}`
                    
                    text += `\n\n🟠 <b>JUMIA :</b>\n` +
                            `📦 Commandes valides : <b>${jumiaStats.count}</b>\n` +
                            `💰 CA net : <b>${jumiaStats.revenue.toFixed(2)} درهم</b>\n` +
                            `⏳ En attente : ${jumiaStats.pending}\n` +
                            `🚚 En expédition : ${jumiaStats.shipped}\n` +
                            `✅ Livrées : ${jumiaStats.delivered}\n` +
                            `❌ Annulées/Retours : ${jumiaStats.canceled}` +
                            (jumiaStatsError ? `\n⚠️ ${jumiaStatsError}` : '')
                    
                    if (showVisitors) text += `\n👥 Visiteurs Uniques : <b>${visitors}</b>`
                    if (showRegistrations) text += `\n👤 Inscriptions : <b>${registrations}</b>`

                    if (showViews) {
                        const topViews = await prisma.pageView.groupBy({
                            by: ['url'],
                            where: { 
                                createdAt: { gte: start, lte: end },
                                url: { contains: '/books/' }
                            },
                            _count: { url: true },
                            orderBy: { _count: { url: 'desc' } },
                            // Une même fiche peut avoir plusieurs URLs (locale, slug, query).
                            // On récupère davantage de lignes avant de les fusionner par UUID.
                            take: 30
                        })

                        const viewsByBookId = new Map<string, number>()
                        for (const view of topViews) {
                            const bookId = view.url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0]
                            if (bookId) {
                                viewsByBookId.set(bookId, (viewsByBookId.get(bookId) || 0) + view._count.url)
                            }
                        }

                        const rankedBookViews = [...viewsByBookId.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                        const viewedBooks = rankedBookViews.length > 0
                            ? await prisma.book.findMany({
                                where: { id: { in: rankedBookViews.map(([id]) => id) } },
                                select: { id: true, title: true }
                            })
                            : []
                        const titlesById = new Map(viewedBooks.map(book => [book.id, book.title]))

                        if (rankedBookViews.length > 0) {
                            text += `\n\n👀 <b>LIVRES LES PLUS CONSULTÉS :</b>`
                            for (const [bookId, viewCount] of rankedBookViews) {
                                const title = titlesById.get(bookId)
                                if (title) text += `\n• ${escapeHtml(title)} (<b>${viewCount}</b> vues)`
                            }
                        }
                    }
                    
                    await answerCallbackQuery(callbackId, `Stats ${label} envoyées`, token)
                    await sendTelegramMessage(text, message?.chat?.id.toString(), token)
                }
            }

            // Format: stats:recent_orders
            else if (data === 'stats:recent_orders') {
                const orders = await prisma.order.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, fullName: true, city: true, total: true, status: true, createdAt: true, trackingID: true }
                })

                const statusIcons: Record<string, string> = {
                    PENDING: '⏳', CONFIRMED: '✅', SHIPPED: '🚚',
                    DELIVERED: '📬', CANCELLED: '❌', RETURNED: '🔄'
                }

                const list = orders.map(o => {
                    const icon = statusIcons[o.status] || '📦'
                    const shortId = o.id.slice(0, 8).toUpperCase()
                    const date = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                    const trackingLine = o.trackingID?.trim()
                        ? `\n   ↳ 🚚 <b>Code suivi WithYou :</b> <code>${escapeHtml(o.trackingID.trim())}</code>`
                        : `\n   ↳ <i>Sans suivi WithYou</i>`
                    return `${icon} <b>#${shortId}</b> — ${escapeHtml(o.fullName)} (${escapeHtml(o.city || 'Maroc')}) — <b>${o.total.toFixed(0)} DH</b> — ${date}${trackingLine}`
                }).join('\n\n')

                const text = `🛒 <b>5 DERNIÈRES COMMANDES (AVEC SUIVI WITHYOU)</b>\n\n${list || 'Aucune commande trouvée.'}`
                await answerCallbackQuery(callbackId, '🛒 Dernières commandes', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }

            // Format: stats:compare_months
            else if (data === 'stats:compare_months') {
                const now = new Date()
                // Mois actuel
                const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1)
                const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                // Mois précédent
                const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

                const [current, prev] = await Promise.all([
                    prisma.order.aggregate({
                        where: { createdAt: { gte: startCurrent, lte: endCurrent }, status: { not: 'CANCELLED' } },
                        _sum: { total: true },
                        _count: true
                    }),
                    prisma.order.aggregate({
                        where: { createdAt: { gte: startPrev, lte: endPrev }, status: { not: 'CANCELLED' } },
                        _sum: { total: true },
                        _count: true
                    })
                ])

                const caMois = current._sum.total || 0
                const caPrev = prev._sum.total || 0
                const diff = caMois - caPrev
                const pct = caPrev > 0 ? ((diff / caPrev) * 100).toFixed(1) : 'N/A'
                const trend = diff >= 0 ? `📈 +${pct}%` : `📉 ${pct}%`

                const moisActuel = startCurrent.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                const moisPrec = startPrev.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

                const text = `📊 <b>CA MENSUEL COMPARÉ</b>\n\n` +
                    `📅 <b>${moisActuel} :</b>\n` +
                    `   💰 CA : <b>${caMois.toFixed(2)} درهم</b>\n` +
                    `   📦 Commandes : <b>${current._count}</b>\n\n` +
                    `📅 <b>${moisPrec} :</b>\n` +
                    `   💰 CA : <b>${caPrev.toFixed(2)} درهم</b>\n` +
                    `   📦 Commandes : <b>${prev._count}</b>\n\n` +
                    `${trend} vs mois précédent`

                await answerCallbackQuery(callbackId, '📊 Comparaison mensuelle', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }
            
            // Format: stats:all_time
            else if (data === 'stats:all_time') {
                const [total, revenue, firstOrder, byStatus] = await Promise.all([
                    prisma.order.count(),
                    prisma.order.aggregate({
                        where: { status: { not: 'CANCELLED' } },
                        _sum: { total: true }
                    }),
                    prisma.order.findFirst({
                        orderBy: { createdAt: 'asc' },
                        select: { createdAt: true }
                    }),
                    prisma.order.groupBy({
                        by: ['status'],
                        _count: { status: true }
                    })
                ])

                const statusIcons: Record<string, string> = {
                    PENDING: '⏳', CONFIRMED: '✅', SHIPPED: '🚚',
                    DELIVERED: '📬', CANCELLED: '❌', RETURNED: '🔄'
                }

                const statusLines = byStatus
                    .sort((a, b) => b._count.status - a._count.status)
                    .map(s => `${statusIcons[s.status] || '📦'} ${STATUS_LABELS[s.status] || s.status} : <b>${s._count.status}</b>`)
                    .join('\n')

                const since = firstOrder?.createdAt
                    ? new Date(firstOrder.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Inconnue'

                let jumiaStats = { count: 0, revenue: 0, canceled: 0 }
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (jumia && firstOrder?.createdAt) {
                        const startYear = new Date(firstOrder.createdAt).getFullYear();
                        const currentYear = new Date().getFullYear();
                        const quarters: {start: string, end: string}[] = [];
                        for(let y = startYear; y <= currentYear; y++) {
                            quarters.push({ start: `${y}-01-01`, end: `${y}-03-31` });
                            quarters.push({ start: `${y}-04-01`, end: `${y}-06-30` });
                            quarters.push({ start: `${y}-07-01`, end: `${y}-09-30` });
                            quarters.push({ start: `${y}-10-01`, end: `${y}-12-31` });
                        }
                        
                        let allOrders: any[] = []
                        await Promise.all(quarters.map(async (q) => {
                            let hasMore = true
                            let nextToken: string | undefined = undefined
                            while (hasMore) {
                                const response: any = await jumia.getOrders(100, nextToken, undefined, q.start, q.end).catch(() => null)
                                if (!response) break;
                                const orders = response?.orders || response?.data?.orders || []
                                allOrders.push(...orders)
                                nextToken = response?.nextToken || response?.data?.nextToken
                                if (!nextToken || orders.length === 0 || allOrders.length > 20000) hasMore = false
                            }
                        }));
                        
                        const summary = summarizeJumiaOrders(allOrders)
                        jumiaStats = { count: summary.valid, revenue: summary.revenue, canceled: summary.excluded }
                    }
                } catch (e) {
                    console.error('Erreur stats globales Jumia:', e)
                }

                const totalSite = total
                const revenueSite = revenue._sum.total || 0
                const totalCombined = totalSite + jumiaStats.count
                const revenueCombined = revenueSite + jumiaStats.revenue

                const text = `🗂️ <b>STATISTIQUES GLOBALES</b>\n\n` +
                    `📅 <b>Depuis :</b> ${since}\n` +
                    `📦 <b>Total commandes (Site + Jumia) :</b> ${totalCombined}\n` +
                    `💰 <b>CA total (Site + Jumia) :</b> <b>${revenueCombined.toFixed(2)} درهم</b>\n\n` +
                    `🔵 <b>SITE WEB :</b>\n` +
                    `📦 Commandes Site : ${totalSite}\n` +
                    `💰 CA Site : <b>${revenueSite.toFixed(2)} درهم</b>\n` +
                    `\n🟠 <b>JUMIA :</b>\n` +
                    `📦 Commandes Jumia valides : ${jumiaStats.count}\n` +
                    `❌ Annulées/retournées Jumia : ${jumiaStats.canceled}\n` +
                    `💰 CA net Jumia : <b>${jumiaStats.revenue.toFixed(2)} درهم</b>\n` +
                    `\n📊 <b>Détail Site par statut :</b>\n${statusLines}`

                await answerCallbackQuery(callbackId, '🗂️ Stats globales chargées', token)
                await sendTelegramMessage(text, message?.chat?.id.toString(), token)
            }

            // Format: stats:yearly_chart
            else if (data === 'stats:yearly_chart') {
                const now = new Date()
                const year = now.getFullYear()
                const startYear = new Date(year, 0, 1)
                const endYear = new Date(year, 11, 31, 23, 59, 59)
                
                const orders = await prisma.order.findMany({
                    where: {
                        createdAt: { gte: startYear, lte: endYear },
                        status: { not: 'CANCELLED' }
                    },
                    select: {
                        total: true,
                        createdAt: true
                    }
                })
                
                const monthlyCA = Array(12).fill(0)
                for (const o of orders) {
                    const month = new Date(o.createdAt).getMonth()
                    monthlyCA[month] += o.total
                }
                
                const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
                let maxCA = Math.max(...monthlyCA, 1) // avoid div by 0
                
                let chartText = `📈 <b>CA ANNUEL ${year} (Site Web)</b>\n\n`
                let totalYearCA = 0
                
                for (let i = 0; i <= now.getMonth(); i++) {
                    const val = monthlyCA[i]
                    totalYearCA += val
                    const blocks = Math.round((val / maxCA) * 10)
                    const bar = '█'.repeat(blocks) + '▒'.repeat(10 - blocks)
                    chartText += `<code>${months[i].padEnd(4)} |</code> ${bar} <b>${val.toFixed(0)}</b>\n`
                }
                
                chartText += `\n💰 <b>Total : ${totalYearCA.toFixed(2)} درهم</b>`
                
                await answerCallbackQuery(callbackId, '📈 Graphique Annuel chargé', token)
                await sendTelegramMessage(chartText, message?.chat?.id.toString(), token)
            }

            // Sécurité : toujours répondre pour arrêter le chargement du bouton
            else {
                await answerCallbackQuery(callbackId, 'Action reçue', token)
            }
        }

        // Traitement des messages textes (Commandes)
        if (body.message && body.message.text) {
            const rawText = body.message.text.trim()
            const text = rawText.toUpperCase()
            const chatId = body.message.chat.id
            void(`[TELEGRAM MESSAGE] Received from ${chatId}: ${text}`)

            if (text.startsWith('/CMD') || text === 'CMD' || text.startsWith('/HELP') || text === 'HELP') {
                const helpText = `📘 <b>Riwaya Bot — Commandes disponibles</b>\n\n` +
                    `<b>📊 Statistiques & Rapports</b>\n` +
                    `/bilan — Stats site web (aujourd'hui, mois, etc.)\n` +
                    `/rapport — Rapport quotidien immédiat\n` +
                    `/commandes_mois — Toutes les commandes du mois (Site & Jumia)\n` +
                    `/2026 — Lister les commandes par mois pour l'année 2026\n` +
                    `/stockalerte — Vérifier le stock critique\n\n` +
                    `<b>🟠 Jumia</b>\n` +
                    `/jumia — Menu complet Jumia (pending, bilan, retours, comparatifs, graphiques)\n` +
                    `/jumia_top — Top 10 des livres Jumia et CA par produit pour le mois\n\n` +
                    `<b>📦 Marketing & Réseaux Sociaux</b>\n` +
                    `/generer — Liste des créatives, prévisualisation et publication (IG, FB, TT, TG)\n` +
                    `#legende [votre texte] — Définir une légende personnalisée pour la prochaine publication Facebook/Instagram\n\n` +
                    `<b>🔍 Recherche</b>\n` +
                    `/stock [titre] — Vérifier le stock d'un livre\n` +
                    `/search [nom/téléphone] — Rechercher un client\n\n` +
                    `<b>⭐ Gestion Rapide</b>\n` +
                    `/avis — Modérer les nouveaux avis clients\n` +
                    `/promo [titre] [prix] — Appliquer un nouveau prix\n` +
                    `/expedier [ID] — Marquer une commande en expédiée\n` +
                    `/topclients — Les 5 meilleurs acheteurs\n` +
                    `/maintenance [on/off] — Bloquer/débloquer l'accès au site\n\n` +
                    `<b>📝 Blog</b>\n` +
                    `/blogstats — Voir le Top 5 des articles\n` +
                    `/blogpublier [mot clé] — Publier un article\n` +
                    `/blogmasquer [mot clé] — Masquer un article\n` +
                    `/bloggenerer [sujet] — Générer un article via IA\n` +
                    `/blogpartager [mot clé] — Partager sur les réseaux sociaux\n\n` +
                    `<b>⚙️ Automatisations (Cron)</b>\n` +
                    `Rapport Jumia Annuel (Graphique + PDF) → <code>/api/cron/telegram-yearly-chart</code>\n` +
                    `Notifications commandes Jumia (Photo + Boutons) → <code>/api/cron/jumia-new-orders</code>\n` +
                    `Rapport quotidien → <code>/api/cron/daily-report</code>\n` +
                    `Alerte stock → <code>/api/cron/stock-alert</code>\n` +
                    `Alerte pending → <code>/api/cron/pending-alert</code>\n` +
                    `Rapport Jumia hebdo → <code>/api/cron/weekly-jumia-report</code>\n` +
                    `Alerte retours → <code>/api/cron/jumia-returns-alert</code>\n` +
                    `Sync commandes Jumia → <code>/api/cron/jumia</code>\n` +
                    `Nettoyage images orphelines → <code>/api/cron/clean-orphan-images</code> ou <code>/cleanimages</code>\n\n` +
                    `<b>📥 Export</b>\n` +
                    `CSV commandes Jumia → <code>/api/admin/jumia/export</code>\n\n` +
                    `<i>💡 Toutes les commandes sont insensibles à la casse</i>`
                await sendTelegramMessage(helpText, chatId.toString(), token)
            }
            else if (text.startsWith('/RUPTURE') || text === 'RUPTURE') {
                const outOfStockBooks = await prisma.book.findMany({
                    where: { stock: { lte: 0 } },
                    select: { title: true, id: true }
                })
                
                if (outOfStockBooks.length === 0) {
                    await sendTelegramMessage(`✅ <b>Tout est en stock !</b>\nAucun livre n'est actuellement en rupture.`, chatId.toString(), token)
                } else {
                    let orderText = `🚨 <b>Livres en rupture de stock (${outOfStockBooks.length})</b>\n\n`
                    for (const b of outOfStockBooks) {
                        if (orderText.length > 3800) {
                            orderText += `\n... (Liste tronquée pour cause de limite de texte Telegram)\n`
                            break
                        }
                        orderText += `• ${b.title}\n`
                    }
                    await sendTelegramMessage(orderText, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/COMMANDES_MOIS') || text === 'COMMANDES_MOIS') {
                const now = new Date()
                const start = new Date(now.getFullYear(), now.getMonth(), 1)
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
                const end = new Date(nextMonth.getTime() - 1)
                
                const siteOrders = await prisma.order.findMany({
                    where: { createdAt: { gte: start, lte: end } },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, status: true }
                })

                let jumiaOrders: any[] = []
                let jumiaError: string | null = null
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (jumia) {
                        const formatLocalDate = (date: Date) => {
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const day = String(date.getDate()).padStart(2, '0')
                            return `${year}-${month}-${day}`
                        }
                        const createdAfter = formatLocalDate(start)
                        const createdBefore = formatLocalDate(nextMonth)
                        let nextToken: string | undefined

                        do {
                            const response = await jumia.getOrders(100, nextToken, undefined, createdAfter, createdBefore)
                            const pageOrders = response?.orders || response?.data?.orders || []
                            jumiaOrders.push(...pageOrders)
                            nextToken = response?.nextToken || response?.data?.nextToken || undefined
                            if (pageOrders.length === 0 || jumiaOrders.length >= 10000) nextToken = undefined
                        } while (nextToken)
                    } else {
                        jumiaError = 'Jumia non configuré'
                    }
                } catch (e) {
                    console.error('Erreur stats Jumia:', e)
                    jumiaError = 'Impossible de charger les commandes Jumia'
                }

                const jumiaSummary = summarizeJumiaOrders(jumiaOrders)
                await sendTelegramMessage(
                    `📦 <b>Commandes du mois — ${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</b>\n\n` +
                    `🔵 Site: <b>${siteOrders.length}</b>\n` +
                    `🟠 Jumia reçues: <b>${jumiaSummary.total}</b>\n` +
                    `✅ Jumia valides: <b>${jumiaSummary.valid}</b>\n` +
                    `❌ Jumia annulées/retournées: <b>${jumiaSummary.excluded}</b>\n` +
                    `📊 Total reçu Site + Jumia: <b>${siteOrders.length + jumiaSummary.total}</b>` +
                    (jumiaError ? `\n\n⚠️ ${jumiaError}` : ''),
                    chatId.toString(),
                    token
                )

                const sendOrderChunks = async (title: string, lines: string[]) => {
                    if (lines.length === 0) {
                        await sendTelegramMessage(`${title}\n\nAucune commande.`, chatId.toString(), token)
                        return
                    }

                    let chunk = `${title}\n\n`
                    for (const line of lines) {
                        if (chunk.length + line.length + 1 > 3800) {
                            await sendTelegramMessage(chunk, chatId.toString(), token)
                            chunk = `${title} <i>(suite)</i>\n\n`
                        }
                        chunk += `${line}\n`
                    }
                    if (chunk.trim()) await sendTelegramMessage(chunk, chatId.toString(), token)
                }

                await sendOrderChunks(
                    '🔵 <b>Commandes Site</b>',
                    siteOrders.map(order => `• #${order.id.substring(0, 8)} - ${order.status}`)
                )

                if (!jumiaError) {
                    await sendOrderChunks(
                        '🟠 <b>Commandes Jumia</b>',
                        jumiaOrders.map(order => {
                            const number = order.number || order.OrderNumber || order.orderNumber || order.id || order.orderId || 'N/A'
                            return `• ${number} - ${getJumiaOrderStatus(order)}`
                        })
                    )
                }
            }
            else if (text.match(/^\/20\d\d$/)) {
                const year = text.substring(1)
                const replyText = `📅 <b>Détails des Commandes - Année ${year}</b>\n\nSélectionnez un mois pour voir la liste des commandes :`
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                
                const inline_keyboard = []
                for (let i = 0; i < 12; i += 2) {
                    inline_keyboard.push([
                        { text: months[i], callback_data: `month_orders:${year}:${i}` },
                        { text: months[i+1], callback_data: `month_orders:${year}:${i+1}` }
                    ])
                }
                
                const replyMarkup = { inline_keyboard }
                await sendTelegramMessage(replyText, chatId.toString(), token, replyMarkup)
            }
            else if (
                text.startsWith('/BILAN') || text === 'BILAN' ||
                text.startsWith('/BLIAN') || text === 'BLIAN' ||
                text.startsWith('/STATS') || text === 'STATS'
            ) {
                const replyText = `📊 <b>Centre de Rapports Riwaya</b>\n\nQue souhaitez-vous consulter ?`
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: "📅 Aujourd'hui", callback_data: 'stats:today' },
                            { text: '🗓️ Hier', callback_data: 'stats:yesterday' }
                        ],
                        [
                            { text: '📅 Ce Mois', callback_data: 'stats:month' },
                            { text: '📅 30 Derniers Jours', callback_data: 'stats:30days' }
                        ],
                        [
                            { text: '📅 3 Mois', callback_data: 'stats:3months' },
                            { text: '📅 1 An', callback_data: 'stats:1year' }
                        ],
                        [
                            { text: '🏆 Top 5 Livres', callback_data: 'stats:top5' },
                            { text: '🏆 Top 10 Livres', callback_data: 'stats:top10' }
                        ],
                        [
                            { text: '🛒 Dernières Commandes', callback_data: 'stats:recent_orders' },
                            { text: '📊 CA Mensuel Comparé', callback_data: 'stats:compare_months' }
                        ],
                        [
                            { text: '🗂️ Depuis le Début', callback_data: 'stats:all_time' },
                            { text: '📈 Graphique Annuel (CA)', callback_data: 'stats:yearly_chart' }
                        ]
                    ]
                }
                await sendTelegramMessage(replyText, chatId.toString(), token, replyMarkup)
            }
            else if (text && text.toLowerCase().startsWith('#legende')) {
                const customCaption = text.substring(8).trim();
                if (customCaption.length === 0) {
                    await sendTelegramMessage(`⚠️ La légende est vide. Veuillez taper votre texte après #legende.`, chatId.toString(), token)
                } else {
                    await prisma.siteSettings.upsert({
                        where: { key: 'telegram_custom_caption' },
                        update: { value: customCaption },
                        create: { key: 'telegram_custom_caption', value: customCaption }
                    })
                    await sendTelegramMessage(`✅ <b>Légende personnalisée enregistrée :</b>\n\n<i>${customCaption}</i>\n\nVous pouvez maintenant cliquer sur le bouton d'un réseau social (Instagram, Facebook...) pour publier avec cette légende.`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/GENERER') || text === 'GENERER' || text.startsWith('/MARKETING')) {
                void(`[TELEGRAM] Command /GENERER received from chat ${chatId}`)
                
                // Envoyer un accusé de réception immédiat
                await sendTelegramMessage(`🔍 Recherche de créatives sur le serveur...`, chatId.toString(), token)

                try {
                    let creatives: any[] = []
                    
                    // 1. Scanner le disque (Priorité car l'utilisateur dit qu'elles sont là)
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books')
                    void(`[TELEGRAM] Scanning directory: ${uploadDir}`)
                    
                    try {
                        const files = await fs.readdir(uploadDir)
                        void(`[TELEGRAM] Found ${files.length} total files in directory`)
                        
                        const filteredFiles = files.filter(f => 
                            f.toLowerCase().startsWith('creative_') || 
                            f.toLowerCase().startsWith('pack_') || 
                            f.toLowerCase().startsWith('desc_') || 
                            f.toLowerCase().includes('pack')
                        );
                        
                        // Mélanger aléatoirement pour ne pas toujours afficher les mêmes
                        const marketingFiles = filteredFiles.sort(() => 0.5 - Math.random()).slice(0, 10)

                        console.log(`[TELEGRAM] Filtered ${marketingFiles.length} marketing files:`, marketingFiles)

                        if (marketingFiles.length > 0) {
                            creatives = marketingFiles.map(file => ({
                                name: file,
                                type: (file.toLowerCase().includes('pack')) ? 'PACK' : 'BOOK'
                            }))
                        }
                    } catch (fsErr: any) {
                        console.error('[TELEGRAM] Disk scan error:', fsErr)
                    }

                    void(`[TELEGRAM] Final creatives list size: ${creatives.length}`)

                    // 2. Tenter la DB si le disque n'a rien donné
                    if (creatives.length === 0) {
                        const dbAssets = await prisma.marketingAsset.findMany({
                            take: 50, // Prendre les 50 derniers et mélanger
                            orderBy: { createdAt: 'desc' }
                        })
                        const randomAssets = dbAssets.sort(() => 0.5 - Math.random()).slice(0, 10);
                        
                        creatives = randomAssets.map(a => ({
                            name: a.name,
                            type: a.type,
                            bookId: a.bookId,
                            packId: a.packId
                        }))
                    }

                    if (creatives.length === 0) {
                        await sendTelegramMessage(`⚠️ Aucune créative trouvée dans <code>/public/uploads/books/</code>.\n\nFichiers attendus : commençant par <code>creative_</code> ou <code>pack_</code>.`, chatId.toString(), token)
                        return NextResponse.json({ ok: true })
                    }

                    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

                    // Envoyer un album des 3 dernières images pour l'aperçu
                    if (creatives.length > 0) {
                        const path = await import('path')
                        const album = creatives.slice(0, 3).map(c => ({
                            type: 'photo' as const,
                            media: path.join(process.cwd(), 'public', 'uploads', 'books', c.name),
                            caption: `📸 Aperçu : ${c.name}`
                        }))
                        await sendTelegramMediaGroup(album, chatId.toString(), token)
                    }

                    const buttons = creatives.map(c => {
                        const label = c.name.length > 30 ? c.name.substring(0, 27) + '...' : c.name
                        const typeLabel = c.type === 'PACK' ? '📦' : '✨'
                        // Use only the first 30 chars of the name or ID to avoid exceeding 64 bytes
                        const rawId = (c as any).bookId || (c as any).packId || c.name
                        const itemId = String(rawId).substring(0, 30)
                        const shortType = c.type === 'PACK' ? 'P' : 'B'
                        return [{ 
                            text: `${typeLabel} ${label}`, 
                            callback_data: `prep_c:${itemId}:${shortType}`
                        }]
                    })

                    const replyMarkup = {
                        inline_keyboard: [
                            ...buttons,
                            [{ text: '🔍 Voir tout le site', url: `${siteUrl}/fr/admin/marketing` }]
                        ]
                    }

                    void(`[TELEGRAM] Sending final menu to ${chatId}`)
                    const result = await sendTelegramMessage(`🚀 <b>Marketing Riwaya</b>\n\nChoisissez une créative ci-dessus pour la publier :`, chatId.toString(), token, replyMarkup)
                    console.log(`[TELEGRAM] Final menu send result:`, result ? 'SUCCESS' : 'FAILED')
                } catch (error: any) {
                    console.error('[TELEGRAM ERROR] /GENERER failed:', error)
                    await sendTelegramMessage(`❌ Erreur lors du scan : ${error.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/STOCK')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/stock [nom du livre]</code>`, chatId.toString(), token)
                } else {
                    const books = await prisma.book.findMany({
                        where: { title: { contains: query } },
                        take: 5,
                        select: { title: true, stock: true, price: true }
                    })
                    if (books.length === 0) {
                        await sendTelegramMessage(`❌ Aucun livre trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const list = books.map(b => `📖 <b>${b.title}</b>\n📦 Stock: <b>${b.stock}</b> | 💰 ${b.price} درهم`).join('\n\n')
                        await sendTelegramMessage(`🔍 <b>Résultats Stock</b> :\n\n${list}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/STOCKALERT')) {
                const books = await prisma.book.findMany({
                    where: { stock: { lt: 3 } },
                    orderBy: { stock: 'asc' },
                    select: { id: true, title: true, stock: true }
                })
                if (books.length === 0) {
                    await sendTelegramMessage(`✅ Aucun produit avec un stock < 3.`, chatId.toString(), token)
                } else {
                    const list = books.map(b => `🚨 <b>${b.title}</b> : ${b.stock}`).join('\n')
                    const keyboard = books.slice(0, 5).map((b) => {
                        return [{ text: `🔄 Maj: ${b.title.substring(0, 25)}`, callback_data: `upd_stock:${b.id}` }]
                    })
                    const textMessage = `📊 <b>Alerte Stock Critique (< 3)</b> :\n\n${list}`
                    await sendTelegramMessage(textMessage, chatId.toString(), token, { inline_keyboard: keyboard })
                }
            }
            else if (text.startsWith('/VPS')) {
                try {
                    const os = await import('os')
                    const { exec } = await import('child_process')
                    const { promisify } = await import('util')
                    const execAsync = promisify(exec)

                    const totalMem = os.totalmem()
                    const freeMem = os.freemem()
                    const usedMem = totalMem - freeMem
                    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2)

                    const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2)
                    const usedMemGB = (usedMem / 1024 / 1024 / 1024).toFixed(2)

                    const loadAvg = os.loadavg()
                    const cpus = os.cpus().length

                    const uptime = os.uptime()
                    const uptimeDays = Math.floor(uptime / 86400)
                    const uptimeHours = Math.floor((uptime % 86400) / 3600)

                    let diskUsage = 'Non disponible'
                    try {
                        if (os.platform() !== 'win32') {
                            const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}'")
                            diskUsage = stdout.trim()
                        }
                    } catch (e) {}

                    const hostname = os.hostname()

                    const messageText = `🖥️ <b>Statut du Serveur VPS (${hostname})</b>\n\n` +
                        `<b>CPU</b>\n- Coeurs : ${cpus}\n- Charge (1m, 5m, 15m) : ${loadAvg.map((n: number) => n.toFixed(2)).join(', ')}\n\n` +
                        `<b>Mémoire (RAM)</b>\n- Utilisée : ${usedMemGB} Go / ${totalMemGB} Go\n- Pourcentage : ${memUsagePercent}%\n\n` +
                        `<b>Disque</b>\n- Utilisation (/) : ${diskUsage}\n\n` +
                        `<b>Système</b>\n- Uptime : ${uptimeDays}j ${uptimeHours}h\n- OS : ${os.type()} ${os.release()}`

                    await sendTelegramMessage(messageText, chatId.toString(), token)
                } catch (e) {
                    await sendTelegramMessage(`❌ Erreur lors de la récupération du statut VPS.`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/SETSTOCK')) {
                const parts = rawText.split(' ')
                if (parts.length < 3) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/setstock [id_livre] [quantité]</code>`, chatId.toString(), token)
                } else {
                    const bookId = parts[1]
                    const qty = parseInt(parts[2], 10)
                    if (isNaN(qty)) {
                        await sendTelegramMessage(`❌ La quantité doit être un nombre valide.`, chatId.toString(), token)
                    } else {
                        try {
                            const updated = await prisma.book.update({
                                where: { id: bookId },
                                data: { stock: qty }
                            })
                            await sendTelegramMessage(`✅ Stock mis à jour :\n📖 <b>${updated.title}</b>\n📦 Nouveau stock: <b>${updated.stock}</b>`, chatId.toString(), token)
                        } catch (err) {
                            await sendTelegramMessage(`❌ Erreur ou livre introuvable.`, chatId.toString(), token)
                        }
                    }
                }
            }
            else if (text.startsWith('/SEARCH')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/search [nom ou téléphone]</code>`, chatId.toString(), token)
                } else {
                    const customers = await prisma.order.findMany({
                        where: {
                            OR: [
                                { fullName: { contains: query } },
                                { phone: { contains: query } }
                            ]
                        },
                        take: 3,
                        orderBy: { createdAt: 'desc' },
                        select: { fullName: true, phone: true, city: true, address: true }
                    })
                    if (customers.length === 0) {
                        await sendTelegramMessage(`❌ Aucun client trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const list = customers.map(c => `👤 <b>${c.fullName}</b>\n📞 ${c.phone}\n📍 ${c.city}, ${c.address}`).join('\n\n')
                        await sendTelegramMessage(`🔍 <b>Résultats Clients</b> :\n\n${list}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/JUMIA_TOP') || text === 'JUMIA_TOP') {
                try {
                    const { JumiaAPI } = await import('@/lib/jumia-api')
                    const jumia = await JumiaAPI.getInstance()
                    if (!jumia) throw new Error('Jumia non configuré')

                    const now = new Date()
                    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
                    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
                    const orders: any[] = []
                    let nextToken: string | undefined

                    do {
                        const response = await jumia.getOrders(100, nextToken, undefined, monthStart, monthEnd)
                        const pageOrders = response?.orders || response?.data?.orders || []
                        orders.push(...pageOrders)
                        nextToken = response?.nextToken || response?.data?.nextToken || undefined
                        if (pageOrders.length === 0 || orders.length >= 10000) nextToken = undefined
                    } while (nextToken)

                    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>()
                    for (const order of orders.filter(isJumiaRevenueOrder)) {
                        const orderId = String(order.id || order.number || order.OrderId || order.OrderNumber || '')
                        if (!orderId) continue
                        try {
                            const response = await jumia.getOrderItems(orderId)
                            const data = Array.isArray(response) ? response[0] : response
                            const rawItems = data?.orderItems || data?.items || data?.data?.orderItems || data?.data?.items || (Array.isArray(response) ? response : [])
                            const items = Array.isArray(rawItems) ? rawItems : []
                            for (const item of items) {
                                const sku = String(item.product?.sellerSku || item.sellerSku || item.Sku || item.sku || item.id || 'inconnu')
                                const name = String(item.product?.name || item.name || item.Name || item.productName || sku)
                                const quantity = Math.max(1, Number(item.quantity || item.Quantity || 1))
                                const rawPrice = item.itemPriceLocal?.value ?? item.itemPriceLocal ?? item.price?.value ?? item.price ?? item.Price ?? item.unitPrice ?? 0
                                const price = Number(rawPrice) || 0
                                const current = productStats.get(sku) || { name, quantity: 0, revenue: 0 }
                                current.quantity += quantity
                                current.revenue += price * quantity
                                productStats.set(sku, current)
                            }
                        } catch (error) {
                            console.error(`[JUMIA TOP] Articles indisponibles pour ${orderId}:`, error)
                        }
                    }

                    const ranking = [...productStats.values()]
                        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
                        .slice(0, 10)
                    const lines = ranking.map((product, index) =>
                        `${index + 1}. <b>${escapeHtml(product.name)}</b>\n   📚 ${product.quantity} vendu(s) — 💰 ${product.revenue.toFixed(2)} درهم`
                    )
                    const totalRevenue = [...productStats.values()].reduce((sum, product) => sum + product.revenue, 0)
                    const messageText = `🏆 <b>TOP VENTES JUMIA — ${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</b>\n\n` +
                        (lines.length > 0 ? lines.join('\n\n') : 'Aucune vente Jumia valide trouvée ce mois-ci.') +
                        `\n\n📦 Commandes valides analysées : <b>${orders.filter(isJumiaRevenueOrder).length}</b>\n💰 CA produits : <b>${totalRevenue.toFixed(2)} درهم</b>`
                    await sendTelegramMessage(messageText, chatId.toString(), token)
                } catch (error) {
                    console.error('[JUMIA TOP] Erreur:', error)
                    await sendTelegramMessage('❌ Impossible de charger le classement Jumia.', chatId.toString(), token)
                }
            }
            else if (text.startsWith('/JUMIA')) {
                // Menu rapide Jumia
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '📦 Commandes Jumia Pending', callback_data: 'jumia:pending_orders' }
                        ],
                        [
                            { text: '🏷️ 5 dernières étiquettes', callback_data: 'jumia:recent_labels' }
                        ],
                        [
                            { text: '⚠️ Stock faible Jumia', callback_data: 'jumia:low_stock' }
                        ],
                        [
                            { text: '🔢 Nombre de produits Jumia', callback_data: 'jumia:product_counts' }
                        ],
                        [
                            { text: '💰 3 derniers Paiements', callback_data: 'jumia:last_3_payouts' }
                        ],
                        [
                            { text: '📊 Bilan Jumia du mois', callback_data: 'jumia:monthly_stats' }
                        ],
                        [
                            { text: "📅 Bilan Jumia d'année", callback_data: 'jumia:yearly_stats' }
                        ],
                        [
                            { text: '📈 Graphique Annuel (CA)', callback_data: 'jumia:yearly_chart' }
                        ],
                        [
                            { text: '📊 Jumia vs Boutique', callback_data: 'jumia:jumia_vs_store_chart' }
                        ],
                        [
                            { text: '🔄 Alerte Retours/Annulations', callback_data: 'jumia:returns_check' }
                        ],
                        [
                            { text: '🚚 Statuts Livraison Jumia', callback_data: 'jumia:status_check' }
                        ]
                    ]
                }
                await sendTelegramMessage(`🟠 <b>Menu Jumia</b>\n\nChoisissez une action :`, chatId.toString(), token, replyMarkup)
            }
            else if (text.startsWith('/JUMIASTATUT') || text === 'JUMIASTATUT') {
                try {
                    const res = await callProtectedCron('/api/cron/jumia-status-changes')
                    const data = await res.json()
                    if (data.success) {
                        await sendTelegramMessage(
                            `🚚 <b>Vérification Statuts Jumia Terminée</b>\n\n` +
                            `📦 Commandes vérifiées : <b>${data.inspectedCount || 0}</b>\n` +
                            `🔄 Changements notifiés : <b>${data.changedCount || 0}</b>`,
                            chatId.toString(),
                            token
                        )
                    } else {
                        await sendTelegramMessage(`❌ Erreur vérification Jumia: ${data.error || 'Erreur inconnue'}`, chatId.toString(), token)
                    }
                } catch (e: any) {
                    await sendTelegramMessage(`❌ Erreur: ${e.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/RAPPORT') || text === 'RAPPORT') {
                // Déclencher rapport quotidien maintenant
                try {
                    const res = await callProtectedCron('/api/cron/daily-report')
                    const data = await res.json()
                    if (data.success) {
                        await sendTelegramMessage(`✅ Rapport envoyé !`, chatId.toString(), token)
                    } else {
                        await sendTelegramMessage(`❌ Erreur rapport: ${data.error}`, chatId.toString(), token)
                    }
                } catch (e: any) {
                    await sendTelegramMessage(`❌ Erreur: ${e.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/STOCKALERTE') || text === 'STOCKALERTE') {
                // Vérifier stock critique maintenant
                const threshold = 5
                const criticalBooks = await prisma.book.findMany({
                    where: { stock: { lte: threshold }, active: true },
                    select: { title: true, stock: true },
                    orderBy: { stock: 'asc' },
                    take: 15
                })
                if (criticalBooks.length === 0) {
                    await sendTelegramMessage(`✅ <b>Aucun stock critique</b> (seuil: ${threshold})`, chatId.toString(), token)
                } else {
                    const lines = criticalBooks.map(b => `📖 ${b.title} → <b>${b.stock}</b>${b.stock === 0 ? ' ⛔' : ''}`).join('\n')
                    await sendTelegramMessage(`⚠️ <b>${criticalBooks.length} livres stock critique</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/CLEANIMAGES') || text === 'CLEANIMAGES') {
                try {
                    const { cleanOrphanImages } = await import('@/app/api/cron/clean-orphan-images/route')
                    const result = await cleanOrphanImages()
                    await sendTelegramMessage(
                        `🧹 <b>Nettoyage terminé</b>\n\n` +
                        `• Livres: <b>${result.cleaned.books}</b>\n` +
                        `• Packs: <b>${result.cleaned.packs}</b>\n` +
                        `• Accessoires: <b>${result.cleaned.accessories}</b>\n` +
                        `• Blog: <b>${result.cleaned.posts}</b>\n` +
                        `• <b>Total corrigé: ${result.cleaned.total}</b>`,
                        chatId.toString(),
                        token
                    )
                } catch (e: any) {
                    await sendTelegramMessage(`❌ Erreur nettoyage: ${e.message}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/AVIS') || text === 'AVIS') {
                const reviews = await prisma.review.findMany({
                    where: { isApproved: false },
                    take: 3,
                    include: { book: { select: { title: true } } },
                    orderBy: { createdAt: 'desc' }
                })
                if (reviews.length === 0) {
                    await sendTelegramMessage(`✅ Aucun nouvel avis à valider.`, chatId.toString(), token)
                } else {
                    for (const r of reviews) {
                        const { escapeHtml } = await import('@/lib/telegram')
                        const msg = `💬 <b>Nouvel Avis en attente</b>\n\n👤 ${escapeHtml(r.fullName)}\n📖 ${escapeHtml(r.book?.title || 'Livre inconnu')}\n⭐ ${r.rating}/5\n📝 <i>${escapeHtml(r.comment)}</i>`
                        const markup = {
                            inline_keyboard: [
                                [
                                    { text: '✅ Approuver', callback_data: `approve_review:${r.id}` },
                                    { text: '🗑️ Supprimer', callback_data: `delete_review:${r.id}` }
                                ]
                            ]
                        }
                        await sendTelegramMessage(msg, chatId.toString(), token, markup)
                    }
                }
            }
            else if (text.startsWith('/PROMO')) {
                const parts = rawText.split(' ').slice(1)
                const price = parseFloat(parts.pop() || '0')
                const query = parts.join(' ')
                
                if (!query || !price) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/promo [titre du livre] [nouveau_prix]</code>`, chatId.toString(), token)
                } else {
                    const books = await prisma.book.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (books.length === 0) {
                        await sendTelegramMessage(`❌ Aucun livre trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const book = books[0]
                        await prisma.book.update({ where: { id: book.id }, data: { price } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`✅ <b>Promo Appliquée !</b>\n\n📖 ${escapeHtml(book.title)}\n💰 Nouveau prix : <b>${price} درهم</b>`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/EXPEDIER')) {
                const query = rawText.split(' ')[1]
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/expedier [id_commande]</code>`, chatId.toString(), token)
                } else {
                    try {
                        const order = await prisma.order.update({
                            where: { id: query },
                            data: { 
                                status: 'SHIPPED',
                                statusHistory: {
                                    create: {
                                        status: 'SHIPPED',
                                        comment: 'Expédiée via Telegram Bot',
                                        createdBy: 'TELEGRAM'
                                    }
                                }
                            }
                        })
                        await sendTelegramMessage(`✅ Commande <b>#${order.id.slice(0,6).toUpperCase()}</b> marquée comme EXPÉDIÉE 🚚`, chatId.toString(), token)
                    } catch (e) {
                        await sendTelegramMessage(`❌ Erreur : Commande introuvable.`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/TOPCLIENTS')) {
                const topUsers = await prisma.order.groupBy({
                    by: ['phone', 'fullName'],
                    where: { status: 'DELIVERED' },
                    _count: { id: true },
                    _sum: { total: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                })
                if (topUsers.length === 0) {
                    await sendTelegramMessage(`❌ Pas assez de données pour afficher le TOP.`, chatId.toString(), token)
                } else {
                    const { escapeHtml } = await import('@/lib/telegram')
                    const lines = topUsers.map((u, i) => `${i+1}. <b>${escapeHtml(u.fullName)}</b> (${u.phone})\n📦 ${u._count.id} cmd | 💰 ${(u._sum.total || 0).toFixed(0)} درهم`).join('\n\n')
                    await sendTelegramMessage(`🏆 <b>TOP 5 CLIENTS (Livrées)</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/MAINTENANCE')) {
                const arg = rawText.split(' ')[1]?.toLowerCase()
                if (arg === 'on' || arg === 'off') {
                    const isActive = arg === 'on' ? 'true' : 'false'
                    await prisma.siteSettings.upsert({
                        where: { key: 'maintenance_mode' },
                        update: { value: isActive },
                        create: { key: 'maintenance_mode', value: isActive }
                    })
                    await sendTelegramMessage(`🛠️ Mode Maintenance : <b>${arg.toUpperCase()}</b>`, chatId.toString(), token)
                } else {
                    await sendTelegramMessage(`💡 Utilisation : <code>/maintenance [on/off]</code>`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/BLOGSTATS') || text === 'BLOGSTATS') {
                const topPosts = await prisma.post.findMany({
                    where: { published: true },
                    orderBy: { viewCount: 'desc' },
                    take: 5,
                    select: { title: true, viewCount: true }
                })
                if (topPosts.length === 0) {
                    await sendTelegramMessage(`❌ Aucun article publié trouvé.`, chatId.toString(), token)
                } else {
                    const { escapeHtml } = await import('@/lib/telegram')
                    const lines = topPosts.map((p, i) => `${i+1}. <b>${escapeHtml(p.title)}</b>\n👁️ ${p.viewCount} vues`).join('\n\n')
                    await sendTelegramMessage(`🏆 <b>TOP 5 ARTICLES (Vues)</b>\n\n${lines}`, chatId.toString(), token)
                }
            }
            else if (text.startsWith('/BLOGPUBLIER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogpublier [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = await prisma.post.update({ where: { id: posts[0].id }, data: { published: true, publishedAt: new Date() } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`✅ <b>Article publié !</b>\n\n📝 ${escapeHtml(post.title)}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGMASQUER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogmasquer [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = await prisma.post.update({ where: { id: posts[0].id }, data: { published: false } })
                        const { escapeHtml } = await import('@/lib/telegram')
                        await sendTelegramMessage(`🚫 <b>Article repassé en brouillon !</b>\n\n📝 ${escapeHtml(post.title)}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGGENERER')) {
                const topic = rawText.split(' ').slice(1).join(' ')
                if (!topic) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/bloggenerer [Sujet de l'article]</code>`, chatId.toString(), token)
                } else {
                    await sendTelegramMessage(`⏳ Génération en cours pour le sujet : "${topic}"... Cela peut prendre une minute.`, chatId.toString(), token)
                    try {
                        const { generateText } = await import('@/lib/gemini')
                        const prompt = `Rédige un article de blog complet, optimisé pour le SEO (en français), d'environ 500 mots sur le sujet suivant : ${topic}. Retourne le titre de l'article sur la première ligne, suivi d'un saut de ligne, puis le contenu formaté en HTML propre.`
                        const generated = await generateText(prompt)
                        if (!generated) throw new Error('Generation failed')
                        
                        const parts = generated.split('\n')
                        let title = parts[0].replace(/<[^>]*>?/gm, '').trim()
                        const content = parts.slice(1).join('\n').trim()
                        
                        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
                        
                        const post = await prisma.post.create({
                            data: {
                                title: title || topic,
                                slug: (title || topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100) + '-' + Date.now().toString().slice(-4),
                                content: content || '<p>Contenu généré vide</p>',
                                excerpt: content.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...',
                                published: false,
                                authorId: adminUser?.id || '',
                                authorName: adminUser?.fullName || 'Admin'
                            }
                        })
                        
                        await sendTelegramMessage(`✅ <b>Article généré avec succès !</b>\n\nTitre : ${title}\nStatut : <b>Brouillon</b>\n\nVous pouvez le lire et l'éditer depuis l'administration.`, chatId.toString(), token)
                    } catch (e: any) {
                        await sendTelegramMessage(`❌ Erreur lors de la génération : ${e.message}`, chatId.toString(), token)
                    }
                }
            }
            else if (text.startsWith('/BLOGPARTAGER')) {
                const query = rawText.split(' ').slice(1).join(' ')
                if (!query) {
                    await sendTelegramMessage(`💡 Utilisation : <code>/blogpartager [mot clé]</code>`, chatId.toString(), token)
                } else {
                    const posts = await prisma.post.findMany({ where: { title: { contains: query } }, take: 1 })
                    if (posts.length === 0) {
                        await sendTelegramMessage(`❌ Aucun article trouvé pour "${query}"`, chatId.toString(), token)
                    } else {
                        const post = posts[0]
                        const n8nWebhookUrl = (await prisma.siteSettings.findUnique({ where: { key: 'n8n_webhook_url' } }))?.value || process.env.N8N_WEBHOOK_URL
                        if (!n8nWebhookUrl) {
                            await sendTelegramMessage(`❌ n8n webhook non configuré.`, chatId.toString(), token)
                        } else {
                            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
                            const postUrl = `${baseUrl}/fr/blog/${post.slug}`
                            const imageUrl = post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${baseUrl}${post.coverImage.startsWith('/') ? '' : '/'}${post.coverImage}`) : `${baseUrl}/images/default-blog.jpg`
                            
                            const baseItem = {
                                itemId: post.id,
                                itemType: 'BLOG',
                                title: post.title,
                                caption: `Nouveau sur le blog ! 📚\n\n${post.title}\n\n👉 Lisez l'article complet ici : ${postUrl}`,
                                image: imageUrl,
                                isVideo: false,
                                isPack: false,
                                format: 'feed',
                                source: 'telegram-bot-action',
                                facebook_access_token: (await prisma.siteSettings.findUnique({ where: { key: 'facebook_access_token' } }))?.value,
                                instagram_account_id: (await prisma.siteSettings.findUnique({ where: { key: 'marketing_instagram_id' } }))?.value
                            }
                            
                            const payload = {
                                batch: ['facebook', 'instagram', 'tiktok'].map(p => ({
                                    ...baseItem,
                                    platform: p
                                }))
                            }
                            fetch(n8nWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(console.error)
                            
                            const { escapeHtml } = await import('@/lib/telegram')
                            await sendTelegramMessage(`🚀 Partage de l'article <b>${escapeHtml(post.title)}</b> lancé vers vos réseaux sociaux !`, chatId.toString(), token)
                        }
                    }
                }
            }
            // Commande /auto-pro : auto-programmer les livres du jour vers n8n
            else if (text.startsWith('/AUTO-PRO')) {
                await sendTelegramMessage(`⏳ <b>Auto-programmation en cours...</b>`, chatId.toString(), token)
                try {
                    const books = await prisma.book.findMany({
                        where: { active: true, stock: { gt: 0 } },
                        take: 7,
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, title: true, author: true, image: true }
                    })
                    if (books.length === 0) {
                        await sendTelegramMessage(`❌ Aucun livre disponible.`, chatId.toString(), token)
                    } else {
                        const n8nWebhookUrl = (await prisma.siteSettings.findUnique({ where: { key: 'n8n_webhook_url' } }))?.value || process.env.N8N_WEBHOOK_URL
                        if (!n8nWebhookUrl) {
                            await sendTelegramMessage(`❌ n8n webhook non configuré.`, chatId.toString(), token)
                        } else {
                            const facebookToken = (await prisma.siteSettings.findUnique({ where: { key: 'facebook_access_token' } }))?.value || ''
                            const instagramId = (await prisma.siteSettings.findUnique({ where: { key: 'instagram_account_id' } }))?.value || ''
                            const possibleTimes = ['10:00', '12:30', '15:00', '18:00', '19:30', '20:00', '21:00']
                            const today = new Date()
                            let successCount = 0

                            for (let i = 0; i < books.length; i++) {
                                const book = books[i]
                                const rawImage = book.image || ''
                                const imageUrl = rawImage.startsWith('http') && !rawImage.includes('127.0.0.1')
                                    ? rawImage
                                    : `https://riwaya.store${rawImage.startsWith('/') ? rawImage : `/${rawImage}`}`
                                if (!rawImage) continue

                                const timeSlot = possibleTimes[i % possibleTimes.length]
                                const [hours, minutes] = timeSlot.split(':')
                                const scheduleAt = new Date(today)
                                scheduleAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                                if (scheduleAt <= today) scheduleAt.setDate(scheduleAt.getDate() + 1)

                                const caption = `📚 Découvrez "${book.title}" par ${book.author} !\n\nDisponible dès maintenant.\n\n🔗 https://riwaya.store/fr/books/${book.id}\n\n#livre #lecture #riwaya`
                                const post = await prisma.scheduledPost.create({
                                    data: {
                                        date: scheduleAt,
                                        time: timeSlot,
                                        content: caption,
                                        platforms: JSON.stringify(['facebook', 'instagram']),
                                        mediaUrl: imageUrl,
                                        status: 'PUBLISHED'
                                    }
                                })

                                const batch = ['facebook', 'instagram'].map(p => ({
                                    itemId: post.id,
                                    itemType: 'POST',
                                    caption,
                                    image: imageUrl,
                                    platform: p,
                                    scheduleAt: scheduleAt.toISOString(),
                                    facebook_access_token: facebookToken,
                                    instagram_account_id: instagramId,
                                }))
                                fetch(n8nWebhookUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ batch })
                                }).catch(console.error)
                                successCount++
                            }
                            await sendTelegramMessage(`✅ <b>${successCount} livre(s) auto-programmé(s) !</b>\n\nLes publications partiront aux heures prévues.`, chatId.toString(), token)
                        }
                    }
                } catch (e: any) {
                    await sendTelegramMessage(`❌ Erreur : ${e.message}`, chatId.toString(), token)
                }
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[TELEGRAM WEBHOOK ERROR]:', error)
        if (currentCallbackId && currentToken) {
            try { await answerCallbackQuery(currentCallbackId, '❌ Erreur interne serveur', currentToken) } catch {}
        }
        return NextResponse.json({ ok: true })
    }
}
