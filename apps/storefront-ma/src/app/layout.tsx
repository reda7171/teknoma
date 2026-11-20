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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://petsunivers.ma'),
  title: { default: 'PetsUnivers — Librairie premium au Maroc', template: '%s | PetsUnivers' },
  description: 'Une sélection exigeante de livres en français, arabe et anglais, livrée partout au Maroc.',
  applicationName: 'PetsUnivers',
  category: 'books',
  robots: process.env.PETSUNIVERS_MA_INDEXABLE === 'true'
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
    : { index: false, follow: false },
  openGraph: { type: 'website', siteName: 'PetsUnivers', locale: 'fr_MA' },
  twitter: { card: 'summary_large_image', title: 'PetsUnivers — Librairie premium au Maroc' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://petsunivers.ma/#organization', name: 'PetsUnivers', url: 'https://petsunivers.ma' },
      { '@type': 'WebSite', '@id': 'https://petsunivers.ma/#website', url: 'https://petsunivers.ma', name: 'PetsUnivers', publisher: { '@id': 'https://petsunivers.ma/#organization' }, inLanguage: ['fr', 'ar', 'en'] },
      { '@type': 'BookStore', '@id': 'https://petsunivers.ma/#bookstore', name: 'PetsUnivers', url: 'https://petsunivers.ma', areaServed: { '@type': 'Country', name: 'Morocco' }, currenciesAccepted: 'MAD', paymentAccepted: 'Cash on delivery' },
    ],
  }
  return (
    <html lang="fr" className={`${outfit.variable} ${tajawal.variable}`}>
      <body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}/><CartProvider>{children}</CartProvider></body>
    </html>
  )
}
