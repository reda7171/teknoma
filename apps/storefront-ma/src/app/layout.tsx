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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tekno.ma'),
  title: { default: 'Tekno Store — Librairie premium au Maroc', template: '%s | Tekno Store' },
  description: 'Une sélection exigeante de livres en français, arabe et anglais, livrée partout au Maroc.',
  applicationName: 'Tekno Store',
  category: 'books',
  robots: process.env.TEKNO_MA_INDEXABLE === 'true'
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
    : { index: false, follow: false },
  openGraph: { type: 'website', siteName: 'Tekno Store', locale: 'fr_MA' },
  twitter: { card: 'summary_large_image', title: 'Tekno Store — Librairie premium au Maroc' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://tekno.ma/#organization', name: 'Tekno Store', url: 'https://tekno.ma' },
      { '@type': 'WebSite', '@id': 'https://tekno.ma/#website', url: 'https://tekno.ma', name: 'Tekno Store', publisher: { '@id': 'https://tekno.ma/#organization' }, inLanguage: ['fr', 'ar', 'en'] },
      { '@type': 'BookStore', '@id': 'https://tekno.ma/#bookstore', name: 'Tekno Store', url: 'https://tekno.ma', areaServed: { '@type': 'Country', name: 'Morocco' }, currenciesAccepted: 'MAD', paymentAccepted: 'Cash on delivery' },
    ],
  }
  return (
    <html lang="fr" className={`${outfit.variable} ${tajawal.variable}`}>
      <body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}/><CartProvider>{children}</CartProvider></body>
    </html>
  )
}
