'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { useCart, type CartItem } from './cart-provider'

export function CartLink({ locale }: { locale: Locale }) {
  const { count } = useCart()
  const label = locale === 'ar' ? 'السلة' : locale === 'en' ? 'Cart' : 'Panier'
  return <Link className="bag" href={`/${locale}/cart`} aria-label={`${label}: ${count}`}><span className="cart-label">{label}</span><span className="cart-count">{count}</span></Link>
}

export function AddToCartButton({ locale, product }: { locale: Locale; product: Omit<CartItem, 'quantity'> }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const label = added ? (locale === 'ar' ? 'تمت الإضافة ✓' : locale === 'en' ? 'Added ✓' : 'Ajouté ✓') : (locale === 'ar' ? 'أضف إلى السلة' : locale === 'en' ? 'Add to cart' : 'Ajouter au panier')
  const cartLabel = locale === 'ar' ? 'عرض السلة' : locale === 'en' ? 'View cart' : 'Voir le panier'

  return <div className="purchase-actions" aria-live="polite">
    <button className={`button primary buy-button ${added ? 'added' : ''}`} type="button" onClick={() => { add(product); setAdded(true) }}>{label}</button>
    {added ? <Link className="button cart-next" href={`/${locale}/cart`}>{cartLabel} →</Link> : null}
  </div>
}
