import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CartLink } from '@/components/cart-controls'
import { CartPage } from '@/components/cart-page'
import { copy, isLocale, locales } from '@/lib/i18n'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const home = copy[locale]
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><div className="announcement">{home.announcement}</div><header className="site-header shell"><Link className="wordmark" href={`/${locale}`}><span>RIWAYA</span><small>رواية</small></Link><nav><Link href={`/${locale}/books`}>{home.nav[0]}</Link></nav><div className="header-tools"><div className="languages">{locales.map((item) => <Link href={`/${item}/cart`} className={item === locale ? 'active' : ''} key={item}>{item.toUpperCase()}</Link>)}</div><CartLink locale={locale}/></div></header><CartPage locale={locale}/></div>
}
