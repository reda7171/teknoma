'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { useCart, type CartItem } from './cart-provider'

export function CartLink({ locale }: { locale: Locale }) {
  const { count } = useCart()
  const label = locale === 'ar' ? 'السلة' : locale === 'en' ? 'Cart' : 'Panier'
  return <Link className="bag" href={`/${locale}/cart`} aria-label={`${label}: ${count}`}>{count}</Link>
}

export function AddToCartButton({ locale, product }: { locale: Locale; product: Omit<CartItem, 'quantity'> }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const label = added ? (locale === 'ar' ? 'تمت الإضافة ✓' : locale === 'en' ? 'Added ✓' : 'Ajouté ✓') : (locale === 'ar' ? 'أضف إلى السلة' : locale === 'en' ? 'Add to cart' : 'Ajouter au panier')
  return <button className="button primary buy-button" type="button" onClick={() => { add(product); setAdded(true); window.setTimeout(() => setAdded(false), 1400) }}>{label}</button>
}
