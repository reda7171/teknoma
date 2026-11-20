import { notFound } from 'next/navigation'
import { CartPage } from '@/components/cart-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isLocale } from '@/lib/i18n'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><SiteHeader locale={locale} path="cart"/><div id="main-content"><CartPage locale={locale}/></div><SiteFooter locale={locale}/></div>
}
