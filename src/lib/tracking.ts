'use client'

import { trackEvent as trackFbPixelEvent } from '@/components/FacebookPixel'

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

export interface DataLayerMonitoredEvent {
    id: string
    timestamp: string
    eventName: string
    stepIndex: number
    stepName: string
    ecommerce: Record<string, any>
    validation: {
        isValid: boolean
        warnings: string[]
        errors: string[]
        checks: { label: string; passed: boolean }[]
    }
}

export const FUNNEL_STEPS: Record<string, { stepIndex: number; stepName: string; description: string }> = {
    view_item_list: { stepIndex: 1, stepName: 'Consultation catalogue', description: 'Affichage des listes de livres ou packs' },
    select_item: { stepIndex: 2, stepName: 'Sélection produit', description: 'Clic sur un livre ou un pack' },
    view_item: { stepIndex: 3, stepName: 'Vue fiche produit', description: 'Ouverture de la page détail' },
    add_to_cart: { stepIndex: 4, stepName: 'Ajout au panier', description: 'Mise au panier depuis bouton ou fiche' },
    remove_from_cart: { stepIndex: 5, stepName: 'Retrait du panier', description: 'Suppression d’un article' },
    view_cart: { stepIndex: 6, stepName: 'Consultation panier', description: 'Ouverture tiroir ou page panier' },
    begin_checkout: { stepIndex: 7, stepName: 'Initialisation commande', description: 'Arrivée sur la page /checkout' },
    add_shipping_info: { stepIndex: 8, stepName: 'Informations livraison', description: 'Sélection ville ou mode d’expédition' },
    add_payment_info: { stepIndex: 9, stepName: 'Mode de paiement', description: 'Validation paiement COD ou bancaire' },
    purchase: { stepIndex: 10, stepName: 'Conversion Achat COD', description: 'Commande validée avec transaction_id' },
}

export const DATALAYER_STORAGE_KEY = 'riwaya_datalayer_monitor_events'
export const DATALAYER_CHANNEL_NAME = 'riwaya_datalayer_channel'

function validateAndFormatEvent(eventName: string, ecommerce: Record<string, any>): DataLayerMonitoredEvent {
    const meta = FUNNEL_STEPS[eventName] || { stepIndex: 0, stepName: eventName, description: 'Événement personnalisé' }
    const checks: { label: string; passed: boolean }[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // 1. DataLayer reset check
    checks.push({ label: 'Purge dataLayer préalable (ecommerce: null)', passed: true })

    // 2. Currency check
    if (['view_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase'].includes(eventName)) {
        const isMad = ecommerce.currency === 'MAD'
        checks.push({ label: "Devise conforme ISO 4217 ('MAD')", passed: isMad })
        if (!isMad) errors.push(`Devise manquante ou non conforme: attendu 'MAD', reçu '${ecommerce.currency}'`)
    }

    // 3. Items array check
    const hasItems = Array.isArray(ecommerce.items) && ecommerce.items.length > 0
    checks.push({ label: 'Tableau items renseigné et non vide', passed: hasItems })
    if (!hasItems) errors.push('Le paramètre "items" doit être un tableau non vide.')

    // 4. Value check
    if (['add_to_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase'].includes(eventName)) {
        const hasValidValue = typeof ecommerce.value === 'number' && !isNaN(ecommerce.value) && ecommerce.value >= 0
        checks.push({ label: 'Montant valeur (value) numérique positif', passed: hasValidValue })
        if (!hasValidValue) errors.push(`Montant "value" invalide: ${ecommerce.value}`)
    }

    // 5. Items internal schema
    if (hasItems) {
        const allItemsHaveIdAndName = ecommerce.items.every((it: any) => Boolean(it.item_id && it.item_name))
        checks.push({ label: 'Tous les items ont item_id et item_name', passed: allItemsHaveIdAndName })
        if (!allItemsHaveIdAndName) errors.push('Certains items n\'ont pas de "item_id" ou de "item_name".')
    }

    // 6. Specific step checks
    if (eventName === 'purchase') {
        const hasTx = Boolean(ecommerce.transaction_id)
        checks.push({ label: 'transaction_id unique présent', passed: hasTx })
        if (!hasTx) errors.push('transaction_id manquant sur l\'événement purchase.')
    }
    if (eventName === 'add_shipping_info') {
        const hasShipping = Boolean(ecommerce.shipping_tier)
        checks.push({ label: 'shipping_tier (ville / pays) renseigné', passed: hasShipping })
        if (!hasShipping) warnings.push('shipping_tier non spécifié.')
    }
    if (eventName === 'add_payment_info') {
        const hasPayment = Boolean(ecommerce.payment_type)
        checks.push({ label: 'payment_type renseigné (COD / Virement)', passed: hasPayment })
        if (!hasPayment) warnings.push('payment_type non spécifié.')
    }

    const isValid = errors.length === 0

    return {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        eventName,
        stepIndex: meta.stepIndex,
        stepName: meta.stepName,
        ecommerce,
        validation: {
            isValid,
            warnings,
            errors,
            checks
        }
    }
}

function broadcastToMonitor(eventName: string, ecommerceParams: Record<string, any>) {
    if (typeof window === 'undefined') return

    const eventRecord = validateAndFormatEvent(eventName, ecommerceParams)

    // 1. BroadcastChannel (cross-tab sync en temps réel)
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel(DATALAYER_CHANNEL_NAME)
            channel.postMessage(eventRecord)
            channel.close()
        } catch {
            // Ignorer si non supporté
        }
    }

    // 2. CustomEvent (synchrone dans le même onglet)
    try {
        window.dispatchEvent(new CustomEvent('riwaya:datalayer_event', { detail: eventRecord }))
    } catch {
        // Ignorer
    }

    // 3. LocalStorage persistence (garde les 50 derniers événements pour l'historique)
    try {
        const raw = localStorage.getItem(DATALAYER_STORAGE_KEY)
        const history: DataLayerMonitoredEvent[] = raw ? JSON.parse(raw) : []
        history.unshift(eventRecord)
        if (history.length > 50) history.pop()
        localStorage.setItem(DATALAYER_STORAGE_KEY, JSON.stringify(history))
    } catch {
        // Ignorer
    }
}

export function getMonitoredDataLayerEvents(): DataLayerMonitoredEvent[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(DATALAYER_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function clearMonitoredDataLayerEvents() {
    if (typeof window === 'undefined') return
    try {
        localStorage.removeItem(DATALAYER_STORAGE_KEY)
        window.dispatchEvent(new CustomEvent('riwaya:datalayer_clear'))
    } catch {
        // Ignorer
    }
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

    broadcastToMonitor(eventName, ecommerceParams)
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

    // 2. Meta Pixel (Facebook) avec déduplication CAPI via eventID
    try {
        trackFbPixelEvent('Purchase', {
            content_ids: data.items.map(item => item.id),
            content_type: 'product',
            contents: data.items.map(item => ({
                id: item.id,
                quantity: item.quantity || 1,
                item_price: item.price,
            })),
            value: Number((Number(data.total) || 0).toFixed(2)),
            currency: DEFAULT_CURRENCY,
            num_items: totalQty,
            order_id: data.id,
        }, { eventID: data.id })
    } catch (e) {
        console.warn('[Pixel] Erreur suivi Purchase:', e)
    }

    // 3. Google Analytics 4 (purchase officiel standardisé)
    sendGa4EcommerceEvent('purchase', {
        transaction_id: data.id,
        value: Number((Number(data.total) || 0).toFixed(2)),
        currency: DEFAULT_CURRENCY,
        tax: 0,
        shipping: Number((Number(data.shippingFee) || 0).toFixed(2)),
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

/**
 * Déclenche une simulation réaliste d'une étape du tunnel pour validation
 */
export function simulateDataLayerFunnelStep(eventName: string) {
    const mockBook = {
        id: 'test_book_101',
        title: 'Les Misérables - Victor Hugo',
        price: 95,
        category: 'Classiques',
        author: 'Victor Hugo',
        quantity: 1
    }

    switch (eventName) {
        case 'view_item_list':
            ga4TrackViewItemList({
                listId: 'test_catalog',
                listName: 'Catalogue Simulation Test',
                items: [{
                    item_id: mockBook.id,
                    item_name: mockBook.title,
                    price: mockBook.price,
                    item_brand: mockBook.author,
                    item_category: mockBook.category,
                    index: 0
                }]
            })
            break
        case 'select_item':
            ga4TrackSelectItem({
                listId: 'test_catalog',
                listName: 'Catalogue Simulation Test',
                item: {
                    item_id: mockBook.id,
                    item_name: mockBook.title,
                    price: mockBook.price,
                    item_brand: mockBook.author,
                    item_category: mockBook.category
                }
            })
            break
        case 'view_item':
            ga4TrackViewItem(mockBook)
            break
        case 'add_to_cart':
            ga4TrackAddToCart({
                items: [mockBook],
                value: mockBook.price
            })
            break
        case 'remove_from_cart':
            ga4TrackRemoveFromCart({
                items: [mockBook],
                value: mockBook.price
            })
            break
        case 'view_cart':
            ga4TrackViewCart({
                items: [mockBook],
                value: mockBook.price
            })
            break
        case 'begin_checkout':
            ga4TrackBeginCheckout({
                items: [mockBook],
                value: mockBook.price,
                coupon: 'BIENVENUE10'
            })
            break
        case 'add_shipping_info':
            ga4TrackAddShippingInfo({
                items: [mockBook],
                value: mockBook.price + 30,
                shippingTier: 'Casablanca (Livraison Express)',
                coupon: 'BIENVENUE10'
            })
            break
        case 'add_payment_info':
            ga4TrackAddPaymentInfo({
                items: [mockBook],
                value: mockBook.price + 30,
                paymentType: 'Cash On Delivery (COD)',
                coupon: 'BIENVENUE10'
            })
            break
        case 'purchase':
            trackPurchase({
                id: `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
                total: mockBook.price + 30,
                shippingFee: 30,
                paymentMethod: 'Cash On Delivery (COD)',
                coupon: 'BIENVENUE10',
                items: [mockBook]
            })
            break
        default:
            console.warn('Étape non reconnue pour simulation:', eventName)
    }
}
