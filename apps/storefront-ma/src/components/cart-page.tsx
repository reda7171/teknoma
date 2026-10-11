'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import { useCart } from './cart-provider'

const labels = {
  fr: { title: 'Votre panier', empty: 'Votre panier attend son premier livre.', browse: 'Découvrir les livres', remove: 'Supprimer', subtotal: 'Sous-total', shipping: 'Livraison calculée au checkout', checkout: 'Continuer vers la livraison' },
  ar: { title: 'سلة المشتريات', empty: 'سلتك تنتظر كتابها الأول.', browse: 'اكتشف الكتب', remove: 'حذف', subtotal: 'المجموع المؤقت', shipping: 'تُحسب تكلفة التوصيل عند إتمام الطلب', checkout: 'متابعة معلومات التوصيل' },
  en: { title: 'Your cart', empty: 'Your cart is waiting for its first book.', browse: 'Explore books', remove: 'Remove', subtotal: 'Subtotal', shipping: 'Delivery calculated at checkout', checkout: 'Continue to delivery' },
} as const

export function CartPage({ locale }: { locale: Locale }) {
  const { items, subtotal, update, remove } = useCart()
  const t = labels[locale]
  if (!items.length) return <main className="empty-cart shell"><p className="eyebrow">RIWAYA</p><h1>{t.title}</h1><p>{t.empty}</p><Link className="button primary" href={`/${locale}/books`}>{t.browse}</Link></main>

  return <main className="cart-page shell"><h1>{t.title}</h1><div className="cart-layout"><div className="cart-lines">{items.map((item) => <article className="cart-line" key={item.id}><div className="cart-thumb"><Image src={item.image} alt="" fill sizes="90px"/></div><div><h2>{item.title}</h2><p>{item.author}</p><button type="button" onClick={() => remove(item.id)}>{t.remove}</button></div><div className="quantity"><button type="button" onClick={() => update(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => update(item.id, item.quantity + 1)}>+</button></div><strong>{item.price * item.quantity} MAD</strong></article>)}</div><aside className="cart-summary"><p><span>{t.subtotal}</span><strong>{subtotal} MAD</strong></p><small>{t.shipping}</small><Link className="button primary" href={`/${locale}/checkout`}>{t.checkout}</Link></aside></div></main>
}
