import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckoutForm } from '@/components/checkout-form'
import { isLocale } from '@/lib/i18n'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><header className="site-header shell"><Link className="wordmark" href={`/${locale}`}><span>PETSUNIVERS</span><small>PetsUnivers</small></Link><span className="secure-checkout">SSL · COD</span></header><CheckoutForm locale={locale}/></div>
}
