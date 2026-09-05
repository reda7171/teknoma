'use client'

import React, { useState } from 'react'
import { Download, ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useUIStore } from '@/store/ui'
import { useTranslations } from 'next-intl'
import { notifyAddToCart } from '@/lib/actions/cart-notify'

interface Props {
  product: {
    id: string
    title: string
    price: number
    image: string
  }
}

export default function DigitalAddToCartButton({ product }: Props) {
  const t = useTranslations('Common')
  const addItem = useCartStore(state => state.addItem)
  const sessionId = useCartStore(state => state.sessionId)
  const setSessionId = useCartStore(state => state.setSessionId)
  const openCart = useUIStore(state => state.openCart)
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = () => {
    if (isAdded) return;
    
    addItem({
      type: 'DIGITAL',
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
    })

    // Telegram Notification
    let currentSessionId = sessionId
    if (!currentSessionId) {
        currentSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        setSessionId(currentSessionId)
    }

    const { items, discount } = useCartStore.getState()
    const currentTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const itemsText = items.map(i => `${i.quantity}x ${i.title}`).join(', ')

    notifyAddToCart(product.title, product.price, 'DIGITAL', currentSessionId, currentTotal, itemsText, discount).catch(console.error)

    // Notification ui (optionnel, if any is added later)
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <button 
      disabled={isAdded}
      onClick={handleAddToCart}
      className={`w-full flex items-center justify-center gap-3 px-8 py-5 font-black uppercase tracking-widest text-sm rounded-xl transition-all duration-300 ${
        isAdded 
          ? 'bg-green-500 text-white scale-105 shadow-xl'
          : 'bg-amber-400 text-black hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-400/20 active:scale-95'
      }`}
    >
      {isAdded ? (
        <>
          <Check className="w-5 h-5 animate-bounce" />
          <span>Ajouté</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          <span>{t('AddToCart')}</span>
        </>
      )}
    </button>
  )
}
