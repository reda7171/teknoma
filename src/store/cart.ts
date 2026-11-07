import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
    type: 'BOOK' | 'PACK' | 'GIFT' | 'DIGITAL' | 'ACCESSORY'
    id: string
    title: string
    price: number
    quantity: number
    image: string
    // Optionnel : pour les packs
    booksCount?: number
    shippingFees?: number
    replacedBooks?: Record<string, { id: string, title: string }>
}

interface CartStore {
    items: CartItem[]
    sessionId: string | null
    discount: number | null

    // Actions
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    setSessionId: (id: string) => void
    applyDiscount: (discount: number) => void

    // Computed
    getTotalPrice: () => number
    getTotalItems: () => number
    getItemQuantity: (id: string) => number
}

const MAX_ITEM_QUANTITY = 2

function notifyDuplicateQuantity(title: string) {
    if (typeof window === 'undefined') return
    try {
        const { useUIStore } = require('./ui')
        const isArabic = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl'
        const isEnglish = document.documentElement.lang === 'en'
        const message = isArabic
            ? `تنبيه: لقد قمت بإضافة نسختين (2) من « ${title} » إلى سلتك.`
            : isEnglish
            ? `Notice: You have added 2 copies of "${title}" to your cart.`
            : `Attention : vous venez d'ajouter 2 exemplaires de « ${title} » dans votre panier.`
        useUIStore.getState().showNotification(message, 'warning')
    } catch {}
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            sessionId: null,
            discount: null,

            // Ajouter un item au panier
            addItem: (item) => {
                const roundedPrice = Math.round(Number(item.price) || 0)
                const sanitizedItem = { ...item, price: roundedPrice }
                const items = get().items
                const existingItem = items.find((i) => i.id === sanitizedItem.id)

                if (existingItem) {
                    const nextQty = Math.min(existingItem.quantity + 1, MAX_ITEM_QUANTITY)
                    set({
                        items: items.map((i) =>
                            i.id === sanitizedItem.id
                                ? { ...i, price: roundedPrice, quantity: nextQty }
                                : i
                        ),
                    })
                    notifyDuplicateQuantity(sanitizedItem.title)
                } else {
                    // Ajouter le nouvel item
                    set({
                        items: [...items, { ...sanitizedItem, quantity: 1 }],
                    })
                }
            },

            // Supprimer un item du panier
            removeItem: (id) => {
                set({
                    items: get().items.filter((item) => item.id !== id),
                })
            },

            // Mettre à jour la quantité d'un item
            updateQuantity: (id, quantity) => {
                if (quantity <= 0) {
                    // Si quantité <= 0, supprimer l'item
                    get().removeItem(id)
                } else {
                    const item = get().items.find((i) => i.id === id)
                    const targetQty = Math.min(quantity, MAX_ITEM_QUANTITY)

                    if (item && targetQty > 1 && item.quantity < targetQty) {
                        notifyDuplicateQuantity(item.title)
                    }

                    set({
                        items: get().items.map((item) =>
                            item.id === id ? { ...item, price: Math.round(item.price), quantity: targetQty } : item
                        ),
                    })
                }
            },

            // Vider le panier
            clearCart: () => {
                set({ items: [], discount: null })
            },
            
            setSessionId: (id) => {
                set({ sessionId: id })
            },

            applyDiscount: (discount) => {
                set({ discount: Math.round(discount) })
            },

            // Calculer le prix total (toujours un entier arrondi)
            getTotalPrice: () => {
                const total = get().items.reduce(
                    (sum, item) => sum + Math.round(item.price) * item.quantity,
                    0
                )
                const discount = get().discount
                if (discount) {
                    return Math.max(0, Math.round(total - discount))
                }
                return Math.round(total)
            },

            // Calculer le nombre total d'items
            getTotalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0)
            },

            // Obtenir la quantité d'un item spécifique
            getItemQuantity: (id) => {
                const item = get().items.find((i) => i.id === id)
                return item ? item.quantity : 0
            },
        }),
        {
            name: 'riwaya-cart-storage', // Nom de la clé dans localStorage
            storage: createJSONStorage(() => localStorage),
            version: 2,
            migrate: (persistedState) => {
                const state = persistedState as CartStore
                return {
                    ...state,
                    items: (state.items ?? []).map((item) => ({
                        ...item,
                        price: Math.round(Number(item.price) || 0),
                        quantity: Math.min(item.quantity, MAX_ITEM_QUANTITY),
                    })),
                }
            },
        }
    )
)
