'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import { useCart } from './cart-provider'

const labels = {
  fr: { title: 'Votre panier', empty: 'Votre panier attend son premier livre.', browse: 'Découvrir les livres', remove: 'Supprimer', subtotal: 'Sous-total', shipping: 'Livraison', free: 'Offerte', total: 'Total estimé', checkout: 'Continuer vers la livraison', secure: 'Paiement à la réception · commande sécurisée' },
  ar: { title: 'سلة المشتريات', empty: 'سلتك تنتظر كتابها الأول.', browse: 'اكتشف الكتب', remove: 'حذف', subtotal: 'المجموع المؤقت', shipping: 'التوصيل', free: 'مجاني', total: 'المجموع المتوقع', checkout: 'متابعة معلومات التوصيل', secure: 'الدفع عند الاستلام · طلب آمن' },
  en: { title: 'Your cart', empty: 'Your cart is waiting for its first book.', browse: 'Explore books', remove: 'Remove', subtotal: 'Subtotal', shipping: 'Delivery', free: 'Free', total: 'Estimated total', checkout: 'Continue to delivery', secure: 'Cash on delivery · secure order' },
} as const

export function CartPage({ locale }: { locale: Locale }) {
  const { items, subtotal, update, remove, ready } = useCart()
  const t = labels[locale]
  const shipping = subtotal >= 500 ? 0 : 30
  if (!ready) return <main className="cart-page shell" aria-busy="true"><div className="cart-loading"/><div className="cart-loading short"/></main>
  if (!items.length) return <main className="empty-cart shell"><p className="eyebrow">PETSUNIVERS</p><h1>{t.title}</h1><p>{t.empty}</p><Link className="button primary" href={`/${locale}/books`}>{t.browse}</Link></main>

  return <main className="cart-page shell"><div className="cart-heading"><div><p className="eyebrow">PETSUNIVERS · PANIER</p><h1>{t.title}</h1></div><Link className="text-link" href={`/${locale}/books`}>{t.browse} →</Link></div><div className="cart-layout"><div className="cart-lines">{items.map((item) => <article className="cart-line" key={item.id}><div className="cart-thumb"><Image src={item.image} alt="" fill sizes="90px"/></div><div><h2>{item.title}</h2><p>{item.author}</p><button type="button" onClick={() => remove(item.id)}>{t.remove}</button></div><div className="quantity" aria-label={item.title}><button type="button" aria-label="−" disabled={item.quantity <= 1} onClick={() => update(item.id, item.quantity - 1)}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label="+" disabled={item.quantity >= 20} onClick={() => update(item.id, item.quantity + 1)}>+</button></div><strong>{item.price * item.quantity} MAD</strong></article>)}</div><aside className="cart-summary"><p><span>{t.subtotal}</span><strong>{subtotal} MAD</strong></p><p><span>{t.shipping}</span><strong>{shipping ? `${shipping} MAD` : t.free}</strong></p><hr/><p className="cart-total"><span>{t.total}</span><strong>{subtotal + shipping} MAD</strong></p><small>{t.secure}</small><Link className="button primary" href={`/${locale}/checkout`}>{t.checkout}</Link></aside></div></main>
}
