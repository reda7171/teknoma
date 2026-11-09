'use client'

export interface Ga4Item {
    item_id: string
    item_name: string
    affiliation?: string
    coupon?: string
    discount?: number
    index?: number
    item_brand?: string
    item_category?: string
    item_category2?: string
    price: number
    quantity?: number
}

export interface TrackingProduct {
    id: string
    title?: string
    price: number
    quantity: number
    category?: string
    author?: string
}

export interface PurchaseData {
    id: string
    total: number
    shippingFee?: number
    paymentMethod?: string
    coupon?: string
    items: TrackingProduct[]
}

const DEFAULT_CURRENCY = 'MAD'
const DEFAULT_AFFILIATION = 'Riwaya'

/**
 * Nettoie l'objet ecommerce dans dataLayer avant chaque événement
 * conformément aux directives officielles Google Analytics 4.
 */
function clearEcommerceDataLayer() {
    if (typeof window !== 'undefined') {
        ;(window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push({ ecommerce: null })
    }
}

/**
 * Dispatch un événement e-commerce GA4 via gtag() et dataLayer
 */
function sendGa4EcommerceEvent(eventName: string, ecommerceParams: Record<string, any>) {
    if (typeof window === 'undefined') return

    clearEcommerceDataLayer()

    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
        try {
            gtag('event', eventName, ecommerceParams)
        } catch (err) {
            console.warn(`[GA4 ${eventName}] Erreur gtag:`, err)
        }
    }

    try {
        ;(window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push({
            event: eventName,
            ecommerce: ecommerceParams
        })
    } catch (err) {
        console.warn(`[GA4 ${eventName}] Erreur dataLayer:`, err)
    }
}

/**
 * 1. Consultation d'une liste de produits (view_item_list)
 */
export function ga4TrackViewItemList(params: {
    listId: string
    listName: string
    items: Ga4Item[]
}) {
    sendGa4EcommerceEvent('view_item_list', {
        item_list_id: params.listId,
        item_list_name: params.listName,
        items: params.items.map((it, idx) => ({
            affiliation: DEFAULT_AFFILIATION,
            quantity: 1,
            ...it,
            index: it.index ?? idx
        }))
    })
}

/**
 * 2. Clic / Sélection d'un produit dans une liste (select_item)
 */
export function ga4TrackSelectItem(params: {
    listId: string
    listName: string
    item: Ga4Item
    index?: number
}) {
    sendGa4EcommerceEvent('select_item', {
        item_list_id: params.listId,
        item_list_name: params.listName,
        items: [{
            affiliation: DEFAULT_AFFILIATION,
            quantity: 1,
            ...params.item,
            index: params.index ?? params.item.index ?? 0
        }]
    })
}

/**
 * 3. Consultation d'une fiche produit (view_item)
 */
export function ga4TrackViewItem(item: {
    id: string
    title: string
    price: number
    category?: string
    author?: string
    discount?: number
}) {
    const value = Math.max(0, item.price)
    sendGa4EcommerceEvent('view_item', {
        currency: DEFAULT_CURRENCY,
        value,
        items: [{
            item_id: item.id,
            item_name: item.title,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: item.author || 'Riwaya Édition',
            item_category: item.category || 'Livres',
            price: item.price,
            discount: item.discount,
            quantity: 1
        }]
    })
}

/**
 * 4. Ajout au panier (add_to_cart)
 */
export function ga4TrackAddToCart(params: {
    items: TrackingProduct[]
    value?: number
}) {
    const value = params.value ?? params.items.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0)
    sendGa4EcommerceEvent('add_to_cart', {
        currency: DEFAULT_CURRENCY,
        value,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 5. Suppression du panier (remove_from_cart)
 */
export function ga4TrackRemoveFromCart(params: {
    items: TrackingProduct[]
    value?: number
}) {
    const value = params.value ?? params.items.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0)
    sendGa4EcommerceEvent('remove_from_cart', {
        currency: DEFAULT_CURRENCY,
        value,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 6. Consultation du panier (view_cart)
 */
export function ga4TrackViewCart(params: {
    items: TrackingProduct[]
    value: number
}) {
    sendGa4EcommerceEvent('view_cart', {
        currency: DEFAULT_CURRENCY,
        value: params.value,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 7. Début du checkout (begin_checkout)
 */
export function ga4TrackBeginCheckout(params: {
    items: TrackingProduct[]
    value: number
    coupon?: string
}) {
    sendGa4EcommerceEvent('begin_checkout', {
        currency: DEFAULT_CURRENCY,
        value: params.value,
        coupon: params.coupon,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 8. Ajout des informations de livraison (add_shipping_info)
 */
export function ga4TrackAddShippingInfo(params: {
    items: TrackingProduct[]
    value: number
    shippingTier: string
    coupon?: string
}) {
    sendGa4EcommerceEvent('add_shipping_info', {
        currency: DEFAULT_CURRENCY,
        value: params.value,
        shipping_tier: params.shippingTier,
        coupon: params.coupon,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 9. Ajout des informations de paiement (add_payment_info)
 */
export function ga4TrackAddPaymentInfo(params: {
    items: TrackingProduct[]
    value: number
    paymentType?: string
    coupon?: string
}) {
    sendGa4EcommerceEvent('add_payment_info', {
        currency: DEFAULT_CURRENCY,
        value: params.value,
        payment_type: params.paymentType || 'Cash On Delivery (COD)',
        coupon: params.coupon,
        items: params.items.map((it, idx) => ({
            item_id: it.id,
            item_name: it.title || `Article #${it.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: it.author || 'Riwaya',
            item_category: it.category || 'Livres',
            price: it.price,
            quantity: it.quantity || 1,
            index: idx
        }))
    })
}

/**
 * 10. Achat finalisé (purchase) avec déduplication et support double GA4 + Meta Pixel
 */
export function trackPurchase(data: PurchaseData) {
    if (typeof window === 'undefined') return

    // 1. Déduplication par ID de commande (évite les rafraîchissements de page)
    const storageKey = `riwaya_purchase_${data.id}`
    try {
        if (sessionStorage.getItem(storageKey)) {
            return
        }
        sessionStorage.setItem(storageKey, 'true')
    } catch {
        // Ignorer si sessionStorage indisponible
    }

    const totalQty = data.items.reduce((acc, item) => acc + (item.quantity || 1), 0)

    // 2. Meta Pixel (Facebook)
    if (typeof (window as any).fbq === 'function') {
        try {
            ;(window as any).fbq('track', 'Purchase', {
                content_ids: data.items.map(item => item.id),
                content_type: 'product',
                contents: data.items.map(item => ({
                    id: item.id,
                    quantity: item.quantity || 1,
                    item_price: item.price,
                })),
                value: data.total,
                currency: DEFAULT_CURRENCY,
                num_items: totalQty,
                order_id: data.id,
            })
        } catch (e) {
            console.warn('[Pixel] Erreur suivi Purchase:', e)
        }
    }

    // 3. Google Analytics 4 (purchase officiel standardisé)
    sendGa4EcommerceEvent('purchase', {
        transaction_id: data.id,
        value: data.total,
        currency: DEFAULT_CURRENCY,
        tax: 0,
        shipping: data.shippingFee || 0,
        coupon: data.coupon,
        payment_type: data.paymentMethod || 'Cash On Delivery (COD)',
        items: data.items.map((item, index) => ({
            item_id: item.id,
            item_name: item.title || `Article #${item.id}`,
            affiliation: DEFAULT_AFFILIATION,
            item_brand: item.author || 'Riwaya',
            item_category: item.category || 'Livres',
            price: item.price,
            quantity: item.quantity || 1,
            index,
        }))
    })
}
