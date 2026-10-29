'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type CartItem = { id: string; title: string; author: string; price: number; image: string; quantity: number }
type CartContextValue = {
  items: CartItem[]
  count: number
  subtotal: number
  ready: boolean
  add: (item: Omit<CartItem, 'quantity'>) => void
  update: (id: string, quantity: number) => void
  remove: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const storageKey = 'petsunivers-ma-cart-v1'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (Array.isArray(stored)) setItems(stored.filter((item) => item?.id && item.quantity > 0))
    } catch { localStorage.removeItem(storageKey) }
    setReady(true)
  }, [])

  useEffect(() => { if (ready) localStorage.setItem(storageKey, JSON.stringify(items)) }, [items, ready])

  const value = useMemo<CartContextValue>(() => ({
    items,
    ready,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    add: (product) => setItems((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item)
        : [...current, { ...product, quantity: 1 }]
    }),
    update: (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) } : item)),
    remove: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clear: () => setItems([]),
  }), [items, ready])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}
