'use client'

export interface TrackingProduct {
    id: string
    title?: string
    price: number
    quantity: number
    category?: string
}

export interface PurchaseData {
    id: string
    total: number
    shippingFee?: number
    paymentMethod?: string
    items: TrackingProduct[]
}

/**
 * Envoie l'événement d'achat (Purchase) à Google Analytics 4 et Meta Pixel
 * Avec déduplication via sessionStorage pour éviter les doublons de conversion
 */
export function trackPurchase(data: PurchaseData) {
    if (typeof window === 'undefined') return

    // 1. Déduplication par ID de commande (évite les rafraîchissements de page)
    const storageKey = `petsunivers_purchase_${data.id}`
    try {
        if (sessionStorage.getItem(storageKey)) {
            return
        }
        sessionStorage.setItem(storageKey, 'true')
    } catch {
        // Ignorer si sessionStorage indisponible
    }

    const totalQty = data.items.reduce((acc, item) => acc + item.quantity, 0)
    const currency = 'MAD'

    // 2. Meta Pixel (Facebook)
    if (typeof (window as any).fbq === 'function') {
        try {
            (window as any).fbq('track', 'Purchase', {
                content_ids: data.items.map(item => item.id),
                content_type: 'product',
                contents: data.items.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    item_price: item.price,
                })),
                value: data.total,
                currency: currency,
                num_items: totalQty,
                order_id: data.id,
            })
        } catch (e) {
            console.warn('[Pixel] Erreur suivi Purchase:', e)
        }
    }

    // 3. Google Analytics 4 (dataLayer / gtag)
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
        try {
            gtag('event', 'purchase', {
                transaction_id: data.id,
                value: data.total,
                currency: currency,
                shipping: data.shippingFee || 0,
                payment_type: data.paymentMethod || 'COD',
                items: data.items.map((item, index) => ({
                    item_id: item.id,
                    item_name: item.title || item.id,
                    price: item.price,
                    quantity: item.quantity,
                    item_category: item.category || 'Books',
                    index: index,
                })),
            })
        } catch (e) {
            console.warn('[GA4] Erreur suivi purchase:', e)
        }
    } else if (Array.isArray((window as any).dataLayer)) {
        try {
            (window as any).dataLayer.push({
                event: 'purchase',
                ecommerce: {
                    transaction_id: data.id,
                    value: data.total,
                    currency: currency,
                    shipping: data.shippingFee || 0,
                    payment_type: data.paymentMethod || 'COD',
                    items: data.items.map((item, index) => ({
                        item_id: item.id,
                        item_name: item.title || item.id,
                        price: item.price,
                        quantity: item.quantity,
                        item_category: item.category || 'Books',
                        index: index,
                    })),
                }
            })
        } catch (e) {
            console.warn('[GA4 dataLayer] Erreur:', e)
        }
    }
}
