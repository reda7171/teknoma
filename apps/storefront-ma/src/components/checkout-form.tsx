'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { useCart } from './cart-provider'

const labels = {
  fr: { title: 'Livraison', empty: 'Votre panier est vide.', back: 'Retour aux livres', name: 'Nom complet', phone: 'Téléphone', email: 'E-mail (optionnel)', city: 'Ville', address: 'Adresse complète', comment: 'Note (optionnel)', total: 'Sous-total', shipping: 'Livraison : 30 MAD, offerte dès 500 MAD', submit: 'Confirmer la commande', sending: 'Création de la commande…', success: 'Commande confirmée', thanks: 'Merci. Notre équipe vous contactera pour confirmer la livraison.', order: 'Numéro de commande' },
  ar: { title: 'معلومات التوصيل', empty: 'سلة المشتريات فارغة.', back: 'العودة إلى الكتب', name: 'الاسم الكامل', phone: 'الهاتف', email: 'البريد الإلكتروني (اختياري)', city: 'المدينة', address: 'العنوان الكامل', comment: 'ملاحظة (اختياري)', total: 'المجموع المؤقت', shipping: 'التوصيل: 30 درهماً، مجاني ابتداءً من 500 درهم', submit: 'تأكيد الطلب', sending: 'جارٍ إنشاء الطلب…', success: 'تم تأكيد الطلب', thanks: 'شكراً. سيتواصل معك فريقنا لتأكيد التوصيل.', order: 'رقم الطلب' },
  en: { title: 'Delivery', empty: 'Your cart is empty.', back: 'Back to books', name: 'Full name', phone: 'Phone', email: 'Email (optional)', city: 'City', address: 'Full address', comment: 'Note (optional)', total: 'Subtotal', shipping: 'Delivery: 30 MAD, free from 500 MAD', submit: 'Confirm order', sending: 'Creating your order…', success: 'Order confirmed', thanks: 'Thank you. Our team will contact you to confirm delivery.', order: 'Order number' },
} as const

export function CheckoutForm({ locale }: { locale: Locale }) {
  const { items, subtotal, clear, ready } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState('')
  const t = labels[locale]
  const shippingCost = subtotal >= 500 ? 0 : 30
  if (!ready) return <main className="checkout shell" aria-busy="true"><div className="checkout-loading"/><div className="checkout-loading"/></main>
  if (orderId) return <main className="checkout-success shell"><p className="eyebrow">TEKNO</p><h1>{t.success}</h1><p>{t.thanks}</p><strong>{t.order}: {orderId.slice(0, 8).toUpperCase()}</strong></main>
  if (!items.length) return <main className="empty-cart shell"><h1>{t.title}</h1><p>{t.empty}</p><Link className="button primary" href={`/${locale}/books`}>{t.back}</Link></main>

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur')
      setOrderId(result.orderId); clear()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur') } finally { setLoading(false) }
  }

  return <main className="checkout shell"><div><p className="eyebrow">TEKNO CHECKOUT</p><h1>{t.title}</h1><form onSubmit={submit}><label>{t.name}<input name="fullName" autoComplete="name" required minLength={2}/></label><div className="form-row"><label>{t.phone}<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={8}/></label><label>{t.email}<input name="email" type="email" autoComplete="email"/></label></div><label>{t.city}<input name="city" autoComplete="address-level2" required minLength={2}/></label><label>{t.address}<textarea name="address" autoComplete="street-address" required minLength={5}/></label><label>{t.comment}<textarea name="comment"/></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button primary" disabled={loading} aria-busy={loading}>{loading ? t.sending : t.submit}</button></form></div><aside className="checkout-summary">{items.map((item) => <p key={item.id}><span>{item.quantity} × {item.title}</span><b>{item.quantity * item.price} MAD</b></p>)}<hr/><p><span>{t.total}</span><strong>{subtotal} MAD</strong></p><p><span>{locale === 'ar' ? 'التوصيل' : locale === 'en' ? 'Delivery' : 'Livraison'}</span><strong>{shippingCost ? `${shippingCost} MAD` : (locale === 'ar' ? 'مجاني' : locale === 'en' ? 'Free' : 'Offerte')}</strong></p><p className="checkout-grand-total"><strong>{locale === 'ar' ? 'المجموع' : locale === 'en' ? 'Total' : 'Total'}</strong><strong>{subtotal + shippingCost} MAD</strong></p><small>{t.shipping}</small></aside></main>
}
