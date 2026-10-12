import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { CartProvider } from '@/components/cart-provider'

const outfit = localFont({
  src: '../../../../src/fonts/Outfit-VariableFont_wght.ttf',
  variable: '--font-sans',
  display: 'swap',
})

const tajawal = localFont({
  src: '../../../../src/fonts/Tajawal-Regular.ttf',
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riwaya.ma'),
  title: { default: 'Riwaya — Librairie premium au Maroc', template: '%s | Riwaya' },
  description: 'Une sélection exigeante de livres en français, arabe et anglais, livrée partout au Maroc.',
  applicationName: 'Riwaya',
  category: 'books',
  robots: process.env.RIWAYA_MA_INDEXABLE === 'true'
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
    : { index: false, follow: false },
  openGraph: { type: 'website', siteName: 'Riwaya', locale: 'fr_MA' },
  twitter: { card: 'summary_large_image', title: 'Riwaya — Librairie premium au Maroc' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://riwaya.ma/#organization', name: 'Riwaya', url: 'https://riwaya.ma' },
      { '@type': 'WebSite', '@id': 'https://riwaya.ma/#website', url: 'https://riwaya.ma', name: 'Riwaya', publisher: { '@id': 'https://riwaya.ma/#organization' }, inLanguage: ['fr', 'ar', 'en'] },
      { '@type': 'BookStore', '@id': 'https://riwaya.ma/#bookstore', name: 'Riwaya', url: 'https://riwaya.ma', areaServed: { '@type': 'Country', name: 'Morocco' }, currenciesAccepted: 'MAD', paymentAccepted: 'Cash on delivery' },
    ],
  }
  return (
    <html lang="fr" className={`${outfit.variable} ${tajawal.variable}`}>
      <body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}/><CartProvider>{children}</CartProvider></body>
    </html>
  )
}
